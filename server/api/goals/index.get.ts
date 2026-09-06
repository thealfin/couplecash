import { getSupabaseAdmin, fmtRp } from '../../utils/supabaseAdmin'

export default defineEventHandler(async (event) => {
  try {
    const authHeader = getHeader(event, 'Authorization')
    const cookieToken = getCookie(event, 'couplecash-token')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : cookieToken

    const admin = getSupabaseAdmin()

    let householdId: string | null = null
    let currentUserId: string | null = null
    if (token) {
      const { data: { user } } = await admin.auth.getUser(token)
      if (user) {
        const { data: profile } = await admin.from('users').select('id, household_id').eq('auth_user_id', user.id).single()
        householdId = profile?.household_id ?? null
        currentUserId = profile?.id ?? null
      }
    }

    if (!householdId) {
      const { data: hh } = await admin.from('households').select('id').limit(1).single()
      householdId = hh?.id ?? null
    }

    // Couple members for names
    const { data: members = [] } = await admin
      .from('users')
      .select('id, full_name, role')
      .eq('household_id', householdId)

    const suami = (members ?? []).find((u: any) => u.role === 'suami')
    const istri = (members ?? []).find((u: any) => u.role === 'istri')
    const suamiName = suami?.full_name?.split(' ')[0] ?? 'Suami'
    const istriName = istri?.full_name?.split(' ')[0] ?? 'Istri'

    // Fetch goals
    const { data: goals = [], error } = await admin
      .from('goals')
      .select('*, category:categories!goals_category_id_fkey(id, name, icon)')
      .eq('is_deleted', false)
      .eq('household_id', householdId)
      .order('target_date', { ascending: true })

    if (error) {
      throw error
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let totalTarget = 0
    let totalCollected = 0
    let totalSuami = 0
    let totalIstri = 0

    const hasPartner = Boolean(suami && istri)
    const singleUser = (members ?? [])[0]
    const singleUserName = singleUser?.full_name?.split(' ')[0] ?? (suami ? suamiName : (istri ? istriName : 'Saya'))

    const formattedGoals = (goals ?? []).map((g: any) => {
      const target = Number(g.target_amount) || 0
      const p1 = Number(g.partner_1_contribution) || 0
      const hasP2 = hasPartner && g.partner_2_contribution !== null && g.partner_2_contribution !== undefined
      const p2 = hasP2 ? (Number(g.partner_2_contribution) || 0) : null
      const rawCollected = p1 + (p2 ?? 0)
      const remaining = Math.max(0, target - rawCollected)
      const pct = target > 0 ? Math.min(100, Math.round((rawCollected / target) * 100)) : 100

      // Calculate days remaining
      const targetD = new Date(g.target_date)
      targetD.setHours(0, 0, 0, 0)
      const diffTime = targetD.getTime() - today.getTime()
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      const isCompleted = g.status === 'completed' || rawCollected >= target

      if (!isCompleted) {
        totalTarget += target
        totalCollected += rawCollected
        totalSuami += p1
        if (hasP2) totalIstri += (p2 || 0)
      }

      return {
        id: g.id,
        name: g.name,
        icon: g.icon || '🎯',
        categoryName: g.category?.name || 'Umum',
        categoryId: g.category_id,
        targetDate: g.target_date,
        daysRemaining: Math.max(0, daysRemaining),
        targetAmount: target,
        targetAmountText: fmtRp(target),
        collectedAmount: rawCollected,
        collectedAmountText: fmtRp(rawCollected),
        remainingAmount: remaining,
        remainingAmountText: fmtRp(remaining),
        pct,
        partner1Contribution: p1,
        partner2Contribution: p2,
        partner1Pct: target > 0 ? Math.min(100, Math.round((p1 / target) * 100)) : 0,
        partner2Pct: hasP2 && target > 0 ? Math.min(100, Math.round(((p2 || 0) / target) * 100)) : 0,
        partner1Name: hasPartner ? suamiName : singleUserName,
        partner2Name: hasPartner ? istriName : null,
        status: isCompleted ? 'completed' : daysRemaining < 30 ? 'warning' : 'active',
        description: g.description || '',
        completedAt: g.completed_at,
        completedAtText: g.completed_at
          ? new Date(g.completed_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
          : null,
      }
    })

    const activeGoals = formattedGoals.filter((g: any) => g.status !== 'completed')
    const completedGoals = formattedGoals.filter((g: any) => g.status === 'completed')

    const overallPct = totalTarget > 0 ? Math.min(100, Math.round((totalCollected / totalTarget) * 100)) : 0
    const suamiOverallPct = totalTarget > 0 ? Math.min(100, Math.round((totalSuami / totalTarget) * 100)) : 0
    const istriOverallPct = totalTarget > 0 ? Math.min(100, Math.round((totalIstri / totalTarget) * 100)) : 0

    return {
      success: true,
      hasPartner,
      summary: {
        hasPartner,
        totalTarget,
        totalTargetText: fmtRp(totalTarget),
        totalCollected,
        totalCollectedText: fmtRp(totalCollected),
        remainingTarget: Math.max(0, totalTarget - totalCollected),
        remainingTargetText: fmtRp(Math.max(0, totalTarget - totalCollected)),
        overallPct,
        suamiName: hasPartner ? suamiName : singleUserName,
        istriName: hasPartner ? istriName : '',
        suamiContribution: hasPartner ? totalSuami : totalCollected,
        suamiContributionText: fmtRp(hasPartner ? totalSuami : totalCollected),
        suamiPct: hasPartner ? suamiOverallPct : overallPct,
        istriContribution: hasPartner ? totalIstri : 0,
        istriContributionText: fmtRp(hasPartner ? totalIstri : 0),
        istriPct: hasPartner ? istriOverallPct : 0,
        activeCount: activeGoals.length,
        completedCount: completedGoals.length,
      },
      activeGoals,
      completedGoals,
    }
  } catch (err: any) {
    console.error('[goals.get] error:', err?.message ?? err)
    throw createError({ statusCode: 500, statusMessage: err?.message ?? 'Internal server error' })
  }
})
