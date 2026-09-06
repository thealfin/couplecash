import { getSupabaseAdmin, fmtRp } from '../../utils/supabaseAdmin'

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
      const { data: hh } = await admin.from('households').select('id').limit(1).single()
      householdId = hh?.id ?? null
    }

    if (!householdId) {
      throw createError({ statusCode: 404, statusMessage: 'Rumah tangga tidak ditemukan' })
    }

    // Query bills
    const { data: bills = [], error: billsErr } = await admin
      .from('bills')
      .select('*')
      .eq('household_id', householdId)
      .order('due_date', { ascending: true })

    if (billsErr) {
      throw billsErr
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let totalUnpaid = 0
    let urgentCount = 0
    let overdueCount = 0
    let pendingCount = 0
    let paidCount = 0

    const mappedBills = (bills ?? []).map((bill: any) => {
      const dueDate = new Date(bill.due_date)
      dueDate.setHours(0, 0, 0, 0)
      const diffTime = dueDate.getTime() - today.getTime()
      const daysRemaining = Math.round(diffTime / (1000 * 60 * 60 * 24))

      const isOverdue = daysRemaining < 0 && bill.status === 'pending'
      const isDueToday = daysRemaining === 0 && bill.status === 'pending'
      const isUrgent = daysRemaining >= 0 && daysRemaining <= (bill.reminder_days_before || 3) && bill.status === 'pending'

      const amountNum = Number(bill.amount) || 0

      if (bill.status === 'pending') {
        totalUnpaid += amountNum
        pendingCount++
        if (isOverdue) overdueCount++
        else if (isUrgent || isDueToday) urgentCount++
      } else if (bill.status === 'lunas') {
        paidCount++
      }

      let badgeText = ''
      let urgencyLevel: 'overdue' | 'today' | 'urgent' | 'upcoming' | 'paid' = 'upcoming'

      if (bill.status === 'lunas') {
        badgeText = 'Lunas'
        urgencyLevel = 'paid'
      } else if (isOverdue) {
        badgeText = `Terlambat ${Math.abs(daysRemaining)} hari`
        urgencyLevel = 'overdue'
      } else if (isDueToday) {
        badgeText = 'Hari Ini'
        urgencyLevel = 'today'
      } else if (isUrgent) {
        badgeText = `H-${daysRemaining}`
        urgencyLevel = 'urgent'
      } else {
        badgeText = `H-${daysRemaining}`
        urgencyLevel = 'upcoming'
      }

      return {
        id: bill.id,
        name: bill.name,
        amount: amountNum,
        amountText: fmtRp(amountNum),
        dueDate: bill.due_date,
        daysRemaining,
        isOverdue,
        isDueToday,
        isUrgent,
        urgencyLevel,
        badgeText,
        ownerType: bill.owner_type,
        ownerLabel: bill.owner_type === 'suami' ? 'Suami' : bill.owner_type === 'istri' ? 'Istri' : 'Bersama',
        status: bill.status,
        isRecurring: bill.is_recurring,
        recurrenceRule: bill.recurrence_rule,
        reminderDaysBefore: bill.reminder_days_before,
        linkedTransactionId: bill.linked_transaction_id,
        icon: bill.icon || null,
      }
    })

    return {
      success: true,
      data: mappedBills,
      summary: {
        totalUnpaid,
        totalUnpaidText: fmtRp(totalUnpaid),
        urgentCount,
        overdueCount,
        pendingCount,
        paidCount,
      }
    }
  } catch (err: any) {
    console.error('[bills.get] error:', err?.message ?? err)
    throw createError({ statusCode: 500, statusMessage: err?.message ?? 'Internal server error' })
  }
})
