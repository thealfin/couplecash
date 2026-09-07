import { getSupabaseAdmin, fmtRp } from '../utils/supabaseAdmin'

export default defineEventHandler(async (event) => {
  try {
    const authHeader = getHeader(event, 'Authorization')
    const admin = getSupabaseAdmin()

    let householdId: string | null = null
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      const { data: { user } } = await admin.auth.getUser(token)
      if (user) {
        const { data: profile } = await admin.from('users').select('household_id').eq('auth_user_id', user.id).single()
        householdId = profile?.household_id ?? null
      }
    }
    if (!householdId) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const query = getQuery(event)
    let q = admin
      .from('financial_accounts')
      .select('*')
      .eq('is_deleted', false)
      .eq('household_id', householdId)

    if (query.onlyActive === 'true') {
      q = q.eq('is_active', true)
    }

    if (query.includePassive !== 'true') {
      q = q.eq('is_visible', true)
    }

    const { data: accounts = [], error } = await q.order('created_at')

    if (error) {
      throw error
    }

    return {
      success: true,
      accounts: (accounts ?? []).map((a: any) => ({
        id: a.id,
        name: a.name,
        accountType: a.account_type,
        ownerType: a.owner_type,
        icon: a.icon || (a.account_type === 'debt' ? 'warning' : a.account_type === 'crypto' ? 'currency_bitcoin' : a.account_type === 'e_wallet' ? 'account_balance_wallet' : a.account_type === 'cash' ? 'payments' : 'account_balance'),
        balance: Number(a.current_balance),
        balanceText: fmtRp(Number(a.current_balance)),
        initialBalance: Number(a.initial_balance),
        accountNumber: a.account_number_masked,
        description: a.description,
        isActive: a.is_active !== false,
        isVisible: a.is_visible !== false,
        createdAt: a.created_at,
        updatedAt: a.updated_at,
      })),
    }
  } catch (err: any) {
    console.error('[accounts.get] error:', err?.message ?? err)
    throw createError({ statusCode: 500, statusMessage: err?.message ?? 'Internal server error' })
  }
})
