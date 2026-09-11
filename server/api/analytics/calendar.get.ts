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
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const query = getQuery(event)
    const today = new Date()
    const year = Number(query.year) || today.getFullYear()
    const month = Number(query.month) || (today.getMonth() + 1) // 1-12

    const startOfMonth = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDayOfMonth = new Date(year, month, 0).getDate()
    const endOfMonth = `${year}-${String(month).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`

    const filterStart = (query.startDate && String(query.startDate).trim()) ? String(query.startDate).trim() : startOfMonth
    const filterEnd = (query.endDate && String(query.endDate).trim()) ? String(query.endDate).trim() : endOfMonth

    const { data: txRows = [], error } = await admin
      .from('transactions')
      .select('id, amount, type, transaction_date, transaction_time, note, merchant_name, owner_type, account:financial_accounts!account_id(id, name, account_type), destination_account:financial_accounts!destination_account_id(id, name, account_type), category:categories(id, name, icon)')
      .eq('is_deleted', false)
      .eq('household_id', householdId)
      .gte('transaction_date', filterStart)
      .lte('transaction_date', filterEnd)
      .order('transaction_date', { ascending: false })
      .order('transaction_time', { ascending: false })

    if (error) {
      throw error
    }

    // Query bills in the same period
    const { data: billRows = [], error: billErr } = await admin
      .from('bills')
      .select('id, name, amount, due_date, status, owner_type, is_recurring, reminder_days_before')
      .eq('household_id', householdId)
      .gte('due_date', filterStart)
      .lte('due_date', filterEnd)
      .order('due_date', { ascending: true })

    if (billErr) {
      console.warn('[calendar.get] bills query warning:', billErr.message)
    }

    // Daily summary mapping
    const dailyData: Record<string, {
      income: number
      expense: number
      debt: number
      hasBill: boolean
      bills: any[]
      transactions: any[]
    }> = {}

    for (const bill of (billRows ?? [])) {
      const dateKey = bill.due_date
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { income: 0, expense: 0, debt: 0, hasBill: false, bills: [], transactions: [] }
      }
      dailyData[dateKey].hasBill = true
      dailyData[dateKey].bills.push({
        id: bill.id,
        name: bill.name,
        amount: Number(bill.amount) || 0,
        amountText: fmtRp(Number(bill.amount) || 0),
        dueDate: bill.due_date,
        status: bill.status,
        owner: bill.owner_type === 'suami' ? 'Suami' : bill.owner_type === 'istri' ? 'Istri' : 'Bersama',
        isRecurring: bill.is_recurring,
      })
    }

    for (const tx of (txRows ?? [])) {
      const dateKey = tx.transaction_date
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { income: 0, expense: 0, debt: 0, hasBill: false, bills: [], transactions: [] }
      }

      const amt = Number(tx.amount) || 0
      const isDebt = tx.type === 'debt' || tx.account?.account_type === 'debt'
      const actualType = isDebt ? 'debt' : tx.type

      if (actualType === 'income') {
        dailyData[dateKey].income += amt
      } else if (actualType === 'debt') {
        dailyData[dateKey].debt += amt
      } else if (actualType === 'transfer') {
        // Internal transfer between accounts, does not inflate expenses
      } else {
        dailyData[dateKey].expense += amt
      }

      dailyData[dateKey].transactions.push({
        id: tx.id,
        title: tx.note || tx.merchant_name || (actualType === 'transfer' ? `Transfer ke ${tx.destination_account?.name || 'Akun'}` : 'Transaksi'),
        time: tx.transaction_time ? tx.transaction_time.slice(0, 5) : '12:00',
        type: actualType,
        amount: amt,
        amountText: fmtRp(amt),
        category: tx.category?.name || (actualType === 'transfer' ? 'Transfer Saldo' : 'Umum'),
        icon: tx.category?.icon || (actualType === 'income' ? 'south_east' : actualType === 'transfer' ? 'sync_alt' : actualType === 'debt' ? 'credit_card' : 'receipt_long'),
        account: tx.account?.name || 'Pos Akun',
        destinationAccount: tx.destination_account?.name || null,
        owner: tx.owner_type === 'suami' ? 'Suami' : tx.owner_type === 'istri' ? 'Istri' : 'Bersama',
      })
    }

    return {
      success: true,
      year,
      month,
      startDate: filterStart,
      endDate: filterEnd,
      dailyData,
    }
  } catch (err: any) {
    console.error('[calendar.get] error:', err?.message ?? err)
    throw createError({ statusCode: 500, statusMessage: err?.message ?? 'Internal server error' })
  }
})
