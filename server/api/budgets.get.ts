import { getSupabaseAdmin, fmtRp } from '../utils/supabaseAdmin'

export default defineEventHandler(async (event) => {
  try {
    const authHeader = getHeader(event, 'Authorization')
    const cookieToken = getCookie(event, 'couplecash-token')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : cookieToken

    const admin = getSupabaseAdmin()

    let householdId: string | null = null
    if (token) {
      const { data: { user } } = await admin.auth.getUser(token)
      if (user) {
        const { data: profile } = await admin.from('users').select('household_id').eq('auth_user_id', user.id).single()
        householdId = profile?.household_id ?? null
      }
    }
    if (!householdId) {
      const { data: hh } = await admin.from('households').select('id').limit(1).single()
      householdId = hh?.id ?? null
    }

    // ── Active budgets with categories ──
    // ── Active budgets with categories ──
    const { data: budgetData = [] } = await admin
      .from('budgets')
      .select('*, category:categories!budgets_category_id_fkey(id, name, icon)')
      .eq('is_active', true)
      .eq('household_id', householdId)

    if (!budgetData || budgetData.length === 0) {
      return {
        budgets: [],
        totalUsedText: 'Rp 0',
        totalLimitText: 'Rp 0',
        totalRemainingText: 'Rp 0',
        totalPct: 0,
      }
    }

    // ── Compute overall period range from all budgets ──
    const periodStart = budgetData.reduce((min: string, b: any) =>
      b.period_start < min ? b.period_start : min, budgetData[0].period_start)
    const periodEnd = budgetData.reduce((max: string, b: any) =>
      b.period_end > max ? b.period_end : max, budgetData[0].period_end)

    // Collect all category IDs (both primary category and generated category)
    const categoryIds = new Set<string>()
    budgetData.forEach((b: any) => {
      if (b.category_id) categoryIds.add(b.category_id)
      if (b.generated_category_id) categoryIds.add(b.generated_category_id)
    })
    const catIdArray = Array.from(categoryIds)

    // ── Fetch expense transactions for those categories in the date range ──
    let txSumsByCategory: Record<string, number> = {}
    if (catIdArray.length > 0) {
      const { data: txRows = [] } = await admin
        .from('transactions')
        .select('category_id, amount')
        .eq('is_deleted', false)
        .eq('type', 'expense')
        .eq('household_id', householdId)
        .gte('transaction_date', periodStart)
        .lte('transaction_date', periodEnd)
        .in('category_id', catIdArray)

      for (const row of (txRows ?? [])) {
        if (row.category_id) {
          txSumsByCategory[row.category_id] = (txSumsByCategory[row.category_id] ?? 0) + Number(row.amount)
        }
      }
    }

    let totalUsed = 0
    let totalLimit = 0

    const results = budgetData.map((b: any) => {
      const limit = Number(b.limit_amount)
      const usedPrimary = b.category_id ? (txSumsByCategory[b.category_id] ?? 0) : 0
      const usedGenerated = b.generated_category_id ? (txSumsByCategory[b.generated_category_id] ?? 0) : 0
      const used = usedPrimary + usedGenerated
      const remaining = Math.max(limit - used, 0)
      const pct = limit > 0 ? Math.min(Math.round((used / limit) * 100), 100) : 0
      const state = pct >= 90 ? 'danger' : pct >= 70 ? 'warning' : 'good'

      totalUsed += used
      totalLimit += limit

      return {
        id: b.id,
        icon: b.category?.icon || 'savings',
        name: b.name || b.category?.name || 'Budget',
        categoryName: b.category?.name || '-',
        categoryId: b.category_id,
        generatedCategoryId: b.generated_category_id,
        owners: [b.owner_type],
        used,
        usedText: fmtRp(used),
        limit,
        limitText: fmtRp(limit),
        remaining,
        remainingText: fmtRp(remaining),
        pct,
        state,
        periodStart: b.period_start,
        periodEnd: b.period_end,
        periodType: b.period_type,
      }
    })

    const totalRemaining = Math.max(totalLimit - totalUsed, 0)
    const totalPct = totalLimit > 0 ? Math.min(Math.round((totalUsed / totalLimit) * 100), 100) : 0

    return {
      budgets: results,
      totalUsedText: fmtRp(totalUsed),
      totalLimitText: fmtRp(totalLimit),
      totalRemainingText: fmtRp(totalRemaining),
      totalPct,
    }
  } catch (err: any) {
    console.error('[budgets.get] error:', err?.message ?? err)
    throw createError({ statusCode: 500, statusMessage: err?.message ?? 'Internal server error' })
  }
})
