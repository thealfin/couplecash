import { getSupabaseAdmin, fmtRp } from '../../utils/supabaseAdmin'

export default defineEventHandler(async (event) => {
  try {
    const authHeader = getHeader(event, 'Authorization')
    const admin = getSupabaseAdmin()

    let householdId: string | null = null
    let userId: string | null = null
    let userRole: string | null = null

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      const { data: { user } } = await admin.auth.getUser(token)
      if (user) {
        const { data: profile } = await admin.from('users').select('id, household_id, role').eq('auth_user_id', user.id).single()
        householdId = profile?.household_id ?? null
        userId = profile?.id ?? null
        userRole = profile?.role ?? null
      }
    }

    if (!householdId || !userId) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    if (!householdId) {
      throw createError({ statusCode: 404, statusMessage: 'Rumah tangga tidak ditemukan' })
    }

    const body = await readBody(event)
    const { billId, sourceAccountId, transactionDate } = body

    if (!billId || !sourceAccountId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'ID tagihan dan ID akun sumber pembayaran wajib diisi'
      })
    }

    // 1. Verify bill exists and belongs to this household
    const { data: bill, error: billErr } = await admin
      .from('bills')
      .select('*')
      .eq('id', billId)
      .eq('household_id', householdId)
      .single()

    if (billErr || !bill) {
      throw createError({ statusCode: 404, statusMessage: 'Tagihan tidak ditemukan' })
    }

    if (bill.status === 'lunas') {
      throw createError({ statusCode: 400, statusMessage: 'Tagihan ini sudah lunas sebelumnya' })
    }

    // 2. Verify source account exists and check authority
    const { data: sourceAcc, error: accErr } = await admin
      .from('financial_accounts')
      .select('*')
      .eq('id', sourceAccountId)
      .eq('household_id', householdId)
      .eq('is_deleted', false)
      .single()

    if (accErr || !sourceAcc) {
      throw createError({ statusCode: 404, statusMessage: 'Akun sumber pembayaran tidak ditemukan' })
    }

    // Check role authority if user has a role
    if (userRole === 'suami' && sourceAcc.owner_type === 'istri') {
      throw createError({ statusCode: 403, statusMessage: 'Suami tidak berhak menggunakan akun pribadi Istri' })
    }
    if (userRole === 'istri' && sourceAcc.owner_type === 'suami') {
      throw createError({ statusCode: 403, statusMessage: 'Istri tidak berhak menggunakan akun pribadi Suami' })
    }

    // 3. Find category for bills
    const { data: categories = [] } = await admin
      .from('categories')
      .select('id, name')
      .eq('household_id', householdId)
      .eq('type', 'expense')
      .eq('is_deleted', false)

    let categoryId = categories.find((c: any) =>
      c.name.toLowerCase().includes('tagihan') || c.name.toLowerCase().includes('utilitas')
    )?.id

    if (!categoryId && categories.length > 0) {
      categoryId = categories[0].id
    }

    // 4. Insert transaction (trigger trg_transactions_balance will automatically deduct source account)
    const now = new Date()
    const txDate = transactionDate || now.toISOString().split('T')[0]
    const txTime = now.toTimeString().split(' ')[0]

    const billAmount = Number(bill.amount)

    const { data: tx, error: txErr } = await admin
      .from('transactions')
      .insert({
        household_id: householdId,
        account_id: sourceAccountId,
        category_id: categoryId,
        type: 'expense',
        amount: billAmount,
        owner_type: bill.owner_type,
        recorded_by_user_id: userId,
        transaction_date: txDate,
        transaction_time: txTime,
        note: `Bayar tagihan: ${bill.name}`,
        merchant_name: bill.name,
        is_deleted: false,
      })
      .select()
      .single()

    if (txErr) {
      console.error('[bills.pay] transaction insert error:', txErr)
      throw createError({
        statusCode: 500,
        statusMessage: `Gagal mencatat transaksi pembayaran: ${txErr.message}`
      })
    }

    // 5. Update bill status to 'lunas' and link transaction
    const { error: updateBillErr } = await admin
      .from('bills')
      .update({
        status: 'lunas',
        linked_transaction_id: tx.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', billId)

    if (updateBillErr) {
      console.error('[bills.pay] update bill error:', updateBillErr)
      throw createError({
        statusCode: 500,
        statusMessage: `Transaksi tercatat, namun gagal memperbarui status tagihan: ${updateBillErr.message}`
      })
    }

    // 6. Fetch updated source account balance
    const { data: updatedAcc } = await admin
      .from('financial_accounts')
      .select('current_balance, name')
      .eq('id', sourceAccountId)
      .single()

    return {
      success: true,
      message: `Tagihan "${bill.name}" sebesar ${fmtRp(billAmount)} berhasil dibayar & dicatat`,
      data: {
        billId: bill.id,
        status: 'lunas',
        transactionId: tx.id,
        sourceAccount: {
          id: sourceAccountId,
          name: sourceAcc.name,
          previousBalance: Number(sourceAcc.current_balance),
          currentBalance: Number(updatedAcc?.current_balance ?? 0),
          currentBalanceText: fmtRp(Number(updatedAcc?.current_balance ?? 0))
        }
      }
    }
  } catch (err: any) {
    console.error('[bills.pay] error:', err?.message ?? err)
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.statusMessage || err.message || 'Internal server error'
    })
  }
})
