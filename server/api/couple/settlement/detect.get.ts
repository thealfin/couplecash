import { getSupabaseAdmin, getUserFromToken } from '../../../utils/supabaseAdmin'

export default defineEventHandler(async (event) => {
  try {
    const authHeader = getHeader(event, 'Authorization')
    const user = await getUserFromToken(authHeader)

    if (!user) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const admin = getSupabaseAdmin()

    // 1. Get current user's profile and household
    const { data: currentProfile, error: profileErr } = await admin
      .from('users')
      .select('id, household_id, role, full_name')
      .eq('auth_user_id', user.id)
      .single()

    if (profileErr || !currentProfile?.household_id) {
      throw createError({ statusCode: 404, statusMessage: 'Profil atau household tidak ditemukan' })
    }

    const householdId = currentProfile.household_id

    // 2. Get members of this household
    const { data: members = [] } = await admin
      .from('users')
      .select('id, role, full_name, email')
      .eq('household_id', householdId)

    const suami = members?.find((m: any) => m.role === 'suami') || (currentProfile.role === 'suami' ? currentProfile : null)
    const istri = members?.find((m: any) => m.role === 'istri') || (currentProfile.role === 'istri' ? currentProfile : null)
    const partner = members?.find((m: any) => m.id !== currentProfile.id)

    // 3. Query SHARED POS AKUN (ownership = 'bersama', exclude debt and passive goal accounts)
    const { data: rawAccounts = [] } = await admin
      .from('financial_accounts')
      .select('id, name, account_type, current_balance, icon, owner_type')
      .eq('household_id', householdId)
      .eq('is_deleted', false)
      .eq('owner_type', 'bersama')
      .neq('account_type', 'debt')
      .not('name', 'like', 'Goals (%')
      .order('created_at', { ascending: true })

    const sharedAccounts = (rawAccounts || []).map((acc: any) => ({
      id: acc.id,
      name: acc.name,
      type: 'account' as const,
      accountType: acc.account_type,
      balance: Math.max(0, Number(acc.current_balance) || 0),
      icon: acc.icon || 'account_balance',
      ownerType: acc.owner_type,
    }))

    // 4. Query SHARED GOALS (ownership = 'bersama' OR contributed by both partners)
    const { data: rawGoals = [] } = await admin
      .from('goals')
      .select('id, name, target_amount, partner_1_contribution, partner_2_contribution, icon, owner_type, status')
      .eq('household_id', householdId)
      .eq('is_deleted', false)
      .eq('status', 'active')
      .order('created_at', { ascending: true })

    // A goal is shared if owner_type = 'bersama' OR both partners have contributions > 0
    const sharedGoals = (rawGoals || [])
      .filter((g: any) => {
        if (g.owner_type === 'bersama') return true
        const p1 = Number(g.partner_1_contribution) || 0
        const p2 = Number(g.partner_2_contribution) || 0
        return p1 > 0 && p2 > 0
      })
      .map((g: any) => {
        const p1 = Number(g.partner_1_contribution) || 0
        const p2 = Number(g.partner_2_contribution) || 0
        const actualBalance = p1 + p2 // Section J: Gunakan SALDO AKTUAL saat ini, bukan target
        return {
          id: g.id,
          name: g.name,
          type: 'goal' as const,
          targetAmount: Number(g.target_amount) || 0,
          actualBalance: Math.max(0, actualBalance),
          partner1Contribution: p1,
          partner2Contribution: p2,
          icon: g.icon || '🎯',
          ownerType: g.owner_type || 'bersama',
        }
      })

    // 5. Query Non-Settlement separation counts (Section C & Z)
    const [
      { count: catCount },
      { count: budgetCount },
      { count: billCount },
      { count: debtCount },
    ] = await Promise.all([
      admin.from('categories').select('*', { count: 'exact', head: true }).eq('household_id', householdId).eq('is_deleted', false),
      admin.from('budgets').select('*', { count: 'exact', head: true }).eq('household_id', householdId).eq('is_active', true),
      admin.from('bills').select('*', { count: 'exact', head: true }).eq('household_id', householdId),
      admin.from('financial_accounts').select('*', { count: 'exact', head: true }).eq('household_id', householdId).eq('account_type', 'debt').eq('is_deleted', false),
    ])

    const totalSharedAccountsBalance = sharedAccounts.reduce((sum: number, a: any) => sum + a.balance, 0)
    const totalSharedGoalsBalance = sharedGoals.reduce((sum: number, g: any) => sum + g.actualBalance, 0)
    const totalSettlementValue = totalSharedAccountsBalance + totalSharedGoalsBalance

    return {
      success: true,
      householdId,
      currentUser: {
        id: currentProfile.id,
        name: currentProfile.full_name,
        role: currentProfile.role,
      },
      partner1: suami ? { id: suami.id, name: suami.full_name, role: 'suami' } : null,
      partner2: istri ? { id: istri.id, name: istri.full_name, role: 'istri' } : (partner ? { id: partner.id, name: partner.full_name, role: partner.role } : null),
      sharedAccounts,
      sharedGoals,
      summary: {
        totalSharedAccountsBalance,
        totalSharedGoalsBalance,
        totalSettlementValue,
        sharedAccountsCount: sharedAccounts.length,
        sharedGoalsCount: sharedGoals.length,
        hasSharedItems: sharedAccounts.length > 0 || sharedGoals.length > 0,
      },
      nonSettlementSummary: {
        categoriesCount: catCount || 0,
        budgetsCount: budgetCount || 0,
        billsCount: billCount || 0,
        debtsCount: debtCount || 0,
      },
    }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[settlement/detect.get] error:', err?.message ?? err)
    throw createError({ statusCode: 500, statusMessage: err?.message ?? 'Internal server error' })
  }
})
