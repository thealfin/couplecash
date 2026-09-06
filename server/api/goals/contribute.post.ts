import { getSupabaseAdmin } from '../../utils/supabaseAdmin'

export default defineEventHandler(async (event) => {
  try {
    const authHeader = getHeader(event, 'Authorization')
    const cookieToken = getCookie(event, 'couplecash-token')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : cookieToken

    const admin = getSupabaseAdmin()

    let householdId: string | null = null
    let userId: string | null = null
    let userRole = 'suami'

    if (token) {
      const { data: { user } } = await admin.auth.getUser(token)
      if (user) {
        const { data: profile } = await admin.from('users').select('id, household_id, role').eq('auth_user_id', user.id).single()
        householdId = profile?.household_id ?? null
        userId = profile?.id ?? null
        userRole = profile?.role || 'suami'
      }
    }

    if (!householdId) {
      const { data: hh } = await admin.from('households').select('id').limit(1).single()
      householdId = hh?.id ?? null
    }
    if (!userId) {
      const { data: u } = await admin.from('users').select('id, role').eq('household_id', householdId).limit(1).single()
      userId = u?.id ?? null
      userRole = u?.role || 'suami'
    }

    const body = await readBody(event)
    const {
      goalId,
      sourceAccountId,
      amount,
      note,
    } = body

    if (!goalId) {
      throw createError({ statusCode: 400, statusMessage: 'Goal ID wajib ditentukan' })
    }
    const numAmount = Number(amount)
    if (!numAmount || numAmount <= 0) {
      throw createError({ statusCode: 400, statusMessage: 'Nominal kontribusi harus lebih dari 0' })
    }
    if (!sourceAccountId) {
      throw createError({ statusCode: 400, statusMessage: 'Pilih pos akun asal untuk memotong nominal kontribusi' })
    }

    // 1. Fetch Goal
    const { data: goal, error: goalErr } = await admin
      .from('goals')
      .select('*')
      .eq('id', goalId)
      .eq('household_id', householdId)
      .eq('is_deleted', false)
      .single()

    if (goalErr || !goal) {
      throw createError({ statusCode: 404, statusMessage: 'Target Goal tidak ditemukan' })
    }

    // 2. Fetch Source Account
    const { data: srcAcc, error: srcErr } = await admin
      .from('financial_accounts')
      .select('*')
      .eq('id', sourceAccountId)
      .eq('household_id', householdId)
      .eq('is_deleted', false)
      .single()

    if (srcErr || !srcAcc) {
      throw createError({ statusCode: 404, statusMessage: 'Pos akun asal tidak ditemukan' })
    }

    // Role check: user can only deduct from their own account or 'bersama'
    if (srcAcc.owner_type && srcAcc.owner_type !== 'bersama' && srcAcc.owner_type !== userRole) {
      throw createError({
        statusCode: 403,
        statusMessage: `Anda tidak berhak menggunakan pos akun milik ${srcAcc.owner_type === 'suami' ? 'Suami' : 'Istri'}`,
      })
    }

    // 3. Determine partner contributions
    const { data: members = [] } = await admin.from('users').select('id, role').eq('household_id', householdId)
    const hasPartner = (members ?? []).some((m: any) => m.role === 'suami') && (members ?? []).some((m: any) => m.role === 'istri')

    let p1 = Number(goal.partner_1_contribution) || 0
    let p2 = goal.partner_2_contribution !== null && goal.partner_2_contribution !== undefined ? Number(goal.partner_2_contribution) : null

    if (hasPartner) {
      if (userRole === 'suami') {
        p1 += numAmount
      } else {
        p2 = (p2 ?? 0) + numAmount
      }
    } else {
      p1 += numAmount
    }

    const targetAmount = Number(goal.target_amount) || 0
    const totalCollected = p1 + (p2 ?? 0)
    const isCompleted = totalCollected >= targetAmount

    // 4. Update Goal
    const { data: updatedGoal, error: updateGoalErr } = await admin
      .from('goals')
      .update({
        partner_1_contribution: p1,
        partner_2_contribution: p2,
        status: isCompleted ? 'completed' : 'active',
        completed_at: isCompleted ? (goal.completed_at || new Date().toISOString()) : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', goalId)
      .select()
      .single()

    if (updateGoalErr) {
      throw updateGoalErr
    }

    // 5. Update Passive Account if linked
    if (goal.passive_account_id) {
      const { data: currentPassive } = await admin
        .from('financial_accounts')
        .select('current_balance')
        .eq('id', goal.passive_account_id)
        .single()

      const newPassiveBal = (Number(currentPassive?.current_balance) || 0) + numAmount
      await admin
        .from('financial_accounts')
        .update({
          current_balance: String(newPassiveBal),
          updated_at: new Date().toISOString(),
        })
        .eq('id', goal.passive_account_id)
    }

    // 6. Record Transaction from source account
    // Trigger trg_transactions_balance will automatically deduct numAmount from sourceAccountId
    const todayStr = new Date().toISOString().split('T')[0]
    const timeStr = new Date().toTimeString().split(' ')[0]

    await admin.from('transactions').insert({
      household_id: householdId,
      account_id: sourceAccountId,
      category_id: goal.generated_category_id || goal.category_id || null,
      recorded_by_user_id: userId,
      owner_type: userRole || 'bersama',
      type: 'goals',
      amount: String(numAmount),
      transaction_date: todayStr,
      transaction_time: timeStr,
      merchant_name: `Setoran Goals: ${goal.name}`,
      note: note?.trim() || `Tambah perkembangan kontribusi untuk ${goal.name}`,
      source: 'manual',
    })

    return {
      success: true,
      goal: updatedGoal,
      message: 'Kontribusi berhasil ditambahkan',
    }
  } catch (err: any) {
    console.error('[goals.contribute] error:', err?.message ?? err)
    throw createError({ statusCode: err?.statusCode || 500, statusMessage: err?.statusMessage || err?.message || 'Gagal menambahkan kontribusi goal' })
  }
})
