import { getSupabaseAdmin, fmtRp } from '../utils/supabaseAdmin'

function getDateRange(period: string) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  if (period === 'mingguan') {
    const day = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
    monday.setHours(0, 0, 0, 0)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 7)
    return { start: monday.toISOString().split('T')[0], end: sunday.toISOString().split('T')[0] }
  } else if (period === 'tahunan') {
    return { start: `${year}-01-01`, end: `${year + 1}-01-01` }
  } else {
    return {
      start: new Date(year, month, 1).toISOString().split('T')[0],
      end: new Date(year, month + 1, 1).toISOString().split('T')[0],
    }
  }
}

function getTrendPoints(period: string) {
  const now = new Date()
  if (period === 'mingguan') {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now)
      d.setDate(now.getDate() - (6 - i))
      return {
        date: d.toLocaleDateString('id-ID', { weekday: 'short' }),
        start: d.toISOString().split('T')[0],
        end: new Date(d.getTime() + 86400000).toISOString().split('T')[0],
      }
    })
  } else if (period === 'tahunan') {
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), i, 1)
      return {
        date: d.toLocaleDateString('id-ID', { month: 'short' }),
        start: `${now.getFullYear()}-${String(i + 1).padStart(2, '0')}-01`,
        end: i < 11
          ? `${now.getFullYear()}-${String(i + 2).padStart(2, '0')}-01`
          : `${now.getFullYear() + 1}-01-01`,
      }
    })
  } else {
    const year = now.getFullYear(); const month = now.getMonth()
    return [1, 8, 15, 22, 29].map(d => {
      const start = new Date(year, month, d)
      const end = new Date(year, month, d + 7)
      return {
        date: `${d} ${start.toLocaleDateString('id-ID', { month: 'short' })}`,
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
      }
    })
  }
}

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const period = (query.period as string) || 'bulanan'
    const { start, end } = getDateRange(period)

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

    // ── Fetch all transactions in period ──
    const { data: allTxs = [] } = await admin
      .from('transactions')
      .select('type, amount, owner_type, category_id, transaction_date')
      .eq('is_deleted', false)
      .eq('household_id', householdId)
      .gte('transaction_date', start)
      .lt('transaction_date', end)

    const totals = { income: 0, expense: 0 }
    const catAmounts: Record<string, number> = {}
    const contribAmounts: Record<string, number> = { suami: 0, istri: 0 }
  const incomeContribAmounts: Record<string, number> = { suami: 0, istri: 0 }

    for (const tx of (allTxs ?? [])) {
      const amt = Number(tx.amount)
      totals[tx.type as 'income' | 'expense'] = (totals[tx.type as 'income' | 'expense'] ?? 0) + amt
      if (tx.type === 'expense' && tx.category_id) {
        catAmounts[tx.category_id] = (catAmounts[tx.category_id] ?? 0) + amt
      }
      if (tx.type === 'expense' && (tx.owner_type === 'suami' || tx.owner_type === 'istri')) {
        contribAmounts[tx.owner_type] += amt
      }
      if (tx.type === 'income' && (tx.owner_type === 'suami' || tx.owner_type === 'istri')) {
        incomeContribAmounts[tx.owner_type] += amt
      }
    }

    // ── Categories metadata ──
    const catIds = Object.keys(catAmounts)
    let catMap: Record<string, { name: string; icon: string | null }> = {}
    if (catIds.length > 0) {
      const { data: cats = [] } = await admin.from('categories').select('id, name, icon').in('id', catIds)
      for (const c of (cats ?? [])) catMap[c.id] = { name: c.name, icon: c.icon }
    }

    const colors = ['cat-bar--food', 'cat-bar--bill', 'cat-bar--shop', 'cat-bar--transport']
    const expenseTotal = totals.expense || 0
    const incomeTotal = totals.income || 0

    const expenseCatEntries = Object.entries(catAmounts)
      .sort((a, b) => b[1] - a[1])
      .map(([catId, total], i) => ({
        icon: catMap[catId]?.icon || 'payments',
        name: catMap[catId]?.name || 'Lainnya',
        amountText: fmtRp(total),
        amount: total,
        pct: expenseTotal > 0 ? Math.round((total / expenseTotal) * 100) : 0,
        colorClass: colors[i % colors.length],
      }))

    // ── Income categories (separate pass) ──
    const incomeCatAmounts: Record<string, number> = {}
    for (const tx of (allTxs ?? [])) {
      if (tx.type === 'income' && tx.category_id) {
        incomeCatAmounts[tx.category_id] = (incomeCatAmounts[tx.category_id] ?? 0) + Number(tx.amount)
      }
    }
    const incomeCatIds = Object.keys(incomeCatAmounts).filter(id => !catMap[id])
    if (incomeCatIds.length > 0) {
      const { data: iCats = [] } = await admin.from('categories').select('id, name, icon').in('id', incomeCatIds)
      for (const c of (iCats ?? [])) catMap[c.id] = { name: c.name, icon: c.icon }
    }
    const incomeCatEntries = Object.entries(incomeCatAmounts)
      .sort((a, b) => b[1] - a[1])
      .map(([catId, total], i) => ({
        icon: catMap[catId]?.icon || 'payments',
        name: catMap[catId]?.name || 'Lainnya',
        amountText: fmtRp(total),
        amount: total,
        pct: incomeTotal > 0 ? Math.round((total / incomeTotal) * 100) : 0,
        colorClass: colors[i % colors.length],
      }))

    // ── Couple names ──
    const { data: members = [] } = await admin.from('users').select('full_name, role').eq('household_id', householdId)
    const suamiUser = (members ?? []).find((u: any) => u.role === 'suami')
    const istriUser = (members ?? []).find((u: any) => u.role === 'istri')

    // ── Contribution ──
    const contribSum = contribAmounts.suami + contribAmounts.istri
    const suamiPct = contribSum > 0 ? Math.round((contribAmounts.suami / contribSum) * 100) : 50

    // Income contribution
    const incomeContribSum = incomeContribAmounts.suami + incomeContribAmounts.istri
    const incomeSuamiPct = incomeContribSum > 0 ? Math.round((incomeContribAmounts.suami / incomeContribSum) * 100) : 50

    // ── Trend data ──
    const trendPoints = getTrendPoints(period)

    const buildTrend = async (type: 'income' | 'expense') => {
      return Promise.all(trendPoints.map(async (point) => {
        const { data: rows = [] } = await admin
          .from('transactions')
          .select('amount')
          .eq('is_deleted', false)
          .eq('household_id', householdId)
          .eq('type', type)
          .gte('transaction_date', point.start)
          .lt('transaction_date', point.end)
        const total = (rows ?? []).reduce((s: number, r: any) => s + Number(r.amount), 0)
        return { date: point.date, total }
      }))
    }

    const [expenseTrend, incomeTrend] = await Promise.all([buildTrend('expense'), buildTrend('income')])

    return {
      period,
      expenseTotal,
      expenseTotalText: fmtRp(expenseTotal),
      incomeTotal,
      incomeTotalText: fmtRp(incomeTotal),
      expenseCategories: expenseCatEntries,
      incomeCategories: incomeCatEntries,
      contribution: {
        suami: contribAmounts.suami,
        suamiText: fmtRp(contribAmounts.suami),
        suamiName: `${suamiUser?.full_name?.split(' ')[0] ?? 'Suami'} (Suami)`,
        istri: contribAmounts.istri,
        istriText: fmtRp(contribAmounts.istri),
        istriName: `${istriUser?.full_name?.split(' ')[0] ?? 'Istri'} (Istri)`,
        suamiPct,
        istriPct: 100 - suamiPct,
      },
      incomeContribution: {
        suami: incomeContribAmounts.suami,
        suamiText: fmtRp(incomeContribAmounts.suami),
        suamiName: `${suamiUser?.full_name?.split(' ')[0] ?? 'Suami'} (Suami)`,
        istri: incomeContribAmounts.istri,
        istriText: fmtRp(incomeContribAmounts.istri),
        istriName: `${istriUser?.full_name?.split(' ')[0] ?? 'Istri'} (Istri)`,
        suamiPct: incomeSuamiPct,
        istriPct: 100 - incomeSuamiPct,
      },
      expenseTrend,
      incomeTrend,
    }
  } catch (err: any) {
    console.error('[analytics.get] error:', err?.message ?? err)
    throw createError({ statusCode: 500, statusMessage: err?.message ?? 'Internal server error' })
  }
})
