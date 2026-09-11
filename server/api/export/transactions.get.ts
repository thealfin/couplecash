import { getSupabaseAdmin } from '../../utils/supabaseAdmin'

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
    const period = String(query.period || 'all') // 'all', 'current_month', 'custom'

    let queryBuilder = admin
      .from('transactions')
      .select('id, amount, tax_amount, type, transaction_date, transaction_time, note, merchant_name, owner_type, account:financial_accounts!account_id(id, name, account_type), category:categories(id, name)')
      .eq('is_deleted', false)
      .eq('household_id', householdId)

    if (period === 'current_month') {
      const now = new Date()
      const y = now.getFullYear()
      const m = now.getMonth() + 1
      const startOfMonth = `${y}-${String(m).padStart(2, '0')}-01`
      const lastDay = new Date(y, m, 0).getDate()
      const endOfMonth = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
      queryBuilder = queryBuilder.gte('transaction_date', startOfMonth).lte('transaction_date', endOfMonth)
    } else if (period === 'custom') {
      if (query.startDate) {
        queryBuilder = queryBuilder.gte('transaction_date', String(query.startDate))
      }
      if (query.endDate) {
        queryBuilder = queryBuilder.lte('transaction_date', String(query.endDate))
      }
    }

    const { data: rows = [], error } = await queryBuilder
      .order('transaction_date', { ascending: false })
      .order('transaction_time', { ascending: false })

    if (error) {
      throw error
    }

    const items = (rows || []).map((r: any) => {
      let typeLabel = 'Pengeluaran'
      if (r.type === 'income') typeLabel = 'Pemasukan'
      else if (r.type === 'debt') typeLabel = 'Beban Hutang/Cicilan'
      else if (r.type === 'goals') typeLabel = 'Target Impian'

      let ownerLabel = 'Bersama'
      if (r.owner_type === 'suami') ownerLabel = 'Suami'
      else if (r.owner_type === 'istri') ownerLabel = 'Istri'
      else if (r.owner_type === 'sendiri') ownerLabel = 'Sendiri'

      return {
        id: r.id,
        date: r.transaction_date,
        time: r.transaction_time ? String(r.transaction_time).slice(0, 5) : '12:00',
        type: typeLabel,
        category: r.category?.name || 'Umum',
        account: r.account?.name || 'Pos Akun',
        amount: Number(r.amount) || 0,
        taxAmount: Number(r.tax_amount) || 0,
        ownership: ownerLabel,
        merchant: r.merchant_name || '',
        note: r.note || '',
      }
    })

    return {
      success: true,
      count: items.length,
      transactions: items,
    }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[export.transactions.get] error:', err?.message ?? err)
    throw createError({ statusCode: 500, statusMessage: err?.message ?? 'Internal server error' })
  }
})
