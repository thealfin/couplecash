import { getSupabaseAdmin, fmtRp, getMonthRange } from '../utils/supabaseAdmin'

export default defineEventHandler(async (event) => {
  try {
    setHeader(event, 'Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    setHeader(event, 'Pragma', 'no-cache')
    setHeader(event, 'Expires', '0')

    const authHeader = getHeader(event, 'Authorization')
    const admin = getSupabaseAdmin()

    // Get auth user from token
    let householdId: string | null = null
    let currentUserProfile: any = null
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      const { data: { user } } = await admin.auth.getUser(token)
      if (user) {
        const { data: profile } = await admin.from('users').select('household_id, role, full_name').eq('auth_user_id', user.id).single()
        householdId = profile?.household_id ?? null
        currentUserProfile = profile
      }
    }

    if (!householdId) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    // ── Financial accounts ──
    const { data: accounts = [] } = await admin
      .from('financial_accounts')
      .select('*')
      .eq('is_deleted', false)
      .eq('household_id', householdId)
      .order('created_at')

    // Separate asset accounts from debt accounts
    const assetAccounts = (accounts ?? []).filter((a: any) => a.account_type !== 'debt')
    const manualDebtAccounts = (accounts ?? []).filter((a: any) =>
      a.account_type === 'debt' &&
      a.debt_status !== 'paid_off' &&
      a.is_active !== false &&
      Number(a.current_balance) < 0
    )

    // CRITICAL ACCOUNTING: Total Cash Asset balance only sums positive balances of asset accounts
    const totalBalance = assetAccounts
      .filter((a: any) => Number(a.current_balance) > 0)
      .reduce((s: number, a: any) => s + Number(a.current_balance), 0)

    const breakdown = { suami: 0, istri: 0, bersama: 0, sendiri: 0 }
    for (const a of assetAccounts) {
      const bal = Number(a.current_balance)
      if (bal > 0 && a.owner_type in breakdown) {
        breakdown[a.owner_type as keyof typeof breakdown] += bal
      }
    }

    // Detected debts: asset accounts that have deficit/negative balance and are active
    const detectedDebts = assetAccounts
      .filter((a: any) => Number(a.current_balance) < 0 && a.is_active !== false)
      .map((a: any) => ({
        id: a.id,
        name: a.name,
        type: 'negative_balance' as const,
        icon: a.icon || 'account_balance_wallet',
        ownerType: a.owner_type,
        amount: Math.abs(Number(a.current_balance)),
        amountText: fmtRp(Math.abs(Number(a.current_balance))),
        badgeText: 'Saldo Minus',
        subtitle: 'Terdeteksi minus dari pos akun',
        sourceAccountId: a.id,
      }))

    // Manual debts: accounts created as Hutang / Cicilan
    const manualDebts = manualDebtAccounts.map((a: any) => ({
      id: a.id,
      name: a.name,
      type: 'manual_debt' as const,
      icon: a.icon || 'directions_car',
      ownerType: a.owner_type,
      amount: Math.abs(Number(a.current_balance)),
      amountText: fmtRp(Math.abs(Number(a.current_balance))),
      badgeText: 'Hutang Aktif',
      subtitle: a.description || 'Kewajiban aktif',
      sourceAccountId: a.id,
    }))

    const debtItems = [...detectedDebts, ...manualDebts]
    const totalDebt = debtItems.reduce((s, d) => s + d.amount, 0)

    // ── Recent transactions (with category) ──
    const { data: txs = [] } = await admin
      .from('transactions')
      .select('*, category:categories(id, name, icon)')
      .eq('is_deleted', false)
      .eq('household_id', householdId)
      .order('created_at', { ascending: false })
      .limit(5)

    // ── Monthly change: compare income vs expense this month ──
    const thisMonth = getMonthRange(0)
    const { data: thisMonthTxs = [] } = await admin
      .from('transactions')
      .select('type, amount')
      .eq('is_deleted', false)
      .eq('household_id', householdId)
      .gte('transaction_date', thisMonth.start)
      .lt('transaction_date', thisMonth.end)

    let monthIncome = 0
    let monthExpense = 0
    for (const r of (thisMonthTxs ?? [])) {
      if (r.type === 'income') monthIncome += Number(r.amount)
      else if (r.type === 'expense' || r.type === 'debt') monthExpense += Number(r.amount)
    }

    let monthlyChangePct = 0
    let monthlyChangeDir: 'up' | 'down' | 'flat' = 'flat'
    const monthTotal = monthIncome + monthExpense
    if (monthTotal > 0) {
      if (monthIncome >= monthExpense) {
        monthlyChangePct = Math.round((monthExpense / monthTotal) * 100)
        monthlyChangeDir = monthExpense > 0 ? 'down' : 'up'
      } else {
        monthlyChangePct = Math.round((monthExpense / monthTotal) * 100)
        monthlyChangeDir = 'down'
      }
    }

    // ── Couple names ──
    const { data: members = [] } = await admin.from('users').select('full_name, role').eq('household_id', householdId)
    const suami = (members ?? []).find((u: any) => u.role === 'suami')
    const istri = (members ?? []).find((u: any) => u.role === 'istri')
    const hasPartner = !!(suami && istri)
    const suamiFirst = suami?.full_name?.split(' ')[0] ?? (hasPartner ? 'Suami' : '')
    const istriFirst = istri?.full_name?.split(' ')[0] ?? (hasPartner ? 'Istri' : '')

    return {
      totalBalance,
      totalBalanceText: fmtRp(totalBalance),
      breakdown,
      totalDebt,
      totalDebtText: fmtRp(totalDebt),
      activeDebtCount: debtItems.length,
      debtItems,
      hasPartner,
      monthlyChange: {
        pct: monthlyChangePct,
        direction: monthlyChangeDir,
        label: `${monthlyChangeDir === 'up' ? '+' : monthlyChangeDir === 'down' ? '-' : ''}${monthlyChangePct}%`,
      },
      couple: { suami: suamiFirst || 'Suami', istri: istriFirst || 'Istri' },
      accounts: (assetAccounts ?? []).map((a: any) => ({
        id: a.id,
        icon: a.icon || 'account_balance',
        name: a.name,
        accountType: a.account_type,
        ownerType: a.owner_type,
        ownerLabel: a.owner_type === 'suami'
          ? `${suamiFirst || 'Suami'} (Suami)`
          : a.owner_type === 'istri'
            ? `${istriFirst || 'Istri'} (Istri)`
            : a.owner_type === 'sendiri'
              ? 'Akun Pribadi'
              : 'Akun Bersama',
        balance: Number(a.current_balance),
        balanceText: fmtRp(Number(a.current_balance)),
        number: a.account_number_masked,
      })),
      activeAssetAccounts: (assetAccounts ?? [])
        .filter((a: any) => Number(a.current_balance) > 0 && a.is_active !== false)
        .map((a: any) => ({
          id: a.id,
          name: a.name,
          balance: Number(a.current_balance),
          balanceText: fmtRp(Number(a.current_balance)),
          ownerType: a.owner_type,
          ownerLabel: a.owner_type === 'suami'
            ? `${suamiFirst || 'Suami'} (Suami)`
            : a.owner_type === 'istri'
              ? `${istriFirst || 'Istri'} (Istri)`
              : a.owner_type === 'sendiri'
                ? 'Akun Pribadi'
                : 'Akun Bersama',
        })),
      transactions: (txs ?? []).map((t: any) => ({
        id: t.id,
        icon: t.category?.icon || 'payments',
        name: t.note || t.merchant_name || '-',
        meta: t.category?.name || '-',
        amountText: (t.type === 'income' ? '+' : '-') + fmtRp(Number(t.amount)),
        type: t.type,
        owner: t.owner_type,
        previousRole: t.previous_role || null,
      })),
    }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[dashboard.get] error:', err?.message ?? err)
    throw createError({ statusCode: 500, statusMessage: err?.message ?? 'Internal server error' })
  }
})
