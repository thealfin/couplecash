import { getSupabaseAdmin, fmtRp } from '../../utils/supabaseAdmin'

export default defineEventHandler(async (event) => {
  try {
    const authHeader = getHeader(event, 'Authorization')
    const admin = getSupabaseAdmin()

    let householdId: string | null = null
    let userId: string | null = null

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      const { data: { user } } = await admin.auth.getUser(token)
      if (user) {
        const { data: profile } = await admin.from('users').select('id, household_id').eq('auth_user_id', user.id).single()
        householdId = profile?.household_id ?? null
        userId = profile?.id ?? null
      }
    }

    if (!householdId) {
      const { data: hh } = await admin.from('households').select('id').limit(1).single()
      householdId = hh?.id ?? null
    }
    if (!userId) {
      const { data: u } = await admin.from('users').select('id').eq('household_id', householdId).limit(1).single()
      userId = u?.id ?? null
    }

    const body = await readBody(event)
    const { targetAccountId, sourceAccountId, amount } = body

    if (!targetAccountId || !sourceAccountId || !amount) {
      throw createError({
        statusCode: 400,
        statusMessage: 'targetAccountId, sourceAccountId, dan amount wajib diisi',
      })
    }

    const payAmount = Number(amount)
    if (payAmount <= 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Nominal pembayaran harus lebih dari 0',
      })
    }

    // 1. Fetch source account (must be active and have sufficient balance)
    const { data: sourceAcc, error: srcErr } = await admin
      .from('financial_accounts')
      .select('*')
      .eq('id', sourceAccountId)
      .eq('household_id', householdId)
      .eq('is_deleted', false)
      .single()

    if (srcErr || !sourceAcc) {
      throw createError({ statusCode: 404, statusMessage: 'Rekening sumber dana tidak ditemukan' })
    }

    // 2. Fetch target debt account
    const { data: targetAcc, error: tgtErr } = await admin
      .from('financial_accounts')
      .select('*')
      .eq('id', targetAccountId)
      .eq('household_id', householdId)
      .eq('is_deleted', false)
      .single()

    if (tgtErr || !targetAcc) {
      throw createError({ statusCode: 404, statusMessage: 'Akun kewajiban/hutang tidak ditemukan' })
    }

    // 3. Create transaction record for source account (which automatically triggers fn_apply_transaction_to_balance)
    const note = targetAcc.account_type === 'debt'
      ? `Pembayaran Hutang: ${targetAcc.name}`
      : `Pemulihan Saldo Minus: ${targetAcc.name}`

    const todayStr = new Date().toISOString().split('T')[0]

    const { data: tx, error: txErr } = await admin
      .from('transactions')
      .insert({
        household_id: householdId,
        account_id: sourceAccountId,
        recorded_by_user_id: userId,
        owner_type: sourceAcc.owner_type,
        type: 'expense',
        amount: payAmount,
        transaction_date: todayStr,
        note: note,
        source: 'manual',
      })
      .select()
      .single()

    if (txErr) {
      throw createError({ statusCode: 500, statusMessage: txErr.message })
    }

    // 4. Reduce target debt (add payAmount to debt's negative balance)
    const newTargetBalance = Number(targetAcc.current_balance) + payAmount

    const { data: updatedTarget, error: updateTgtErr } = await admin
      .from('financial_accounts')
      .update({
        current_balance: newTargetBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetAccountId)
      .select()
      .single()

    if (updateTgtErr) {
      throw createError({ statusCode: 500, statusMessage: updateTgtErr.message })
    }

    return {
      success: true,
      message: 'Pembayaran hutang berhasil diverifikasi!',
      sourceAccount: {
        id: sourceAcc.id,
        newBalance: Number(sourceAcc.current_balance) - payAmount,
      },
      targetAccount: {
        id: targetAcc.id,
        newBalance: newTargetBalance,
      },
    }
  } catch (err: any) {
    console.error('[pay-debt.post] error:', err?.message ?? err)
    throw createError({ statusCode: err?.statusCode || 500, statusMessage: err?.statusMessage || err?.message || 'Gagal memproses pembayaran hutang' })
  }
})
