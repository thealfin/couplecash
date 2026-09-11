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

    const { data: rows = [], error } = await admin
      .from('financial_accounts')
      .select('id, name, account_type, owner_type, initial_balance, current_balance, is_active, description')
      .eq('is_deleted', false)
      .eq('household_id', householdId)
      .order('name', { ascending: true })

    if (error) {
      throw error
    }

    const typeLabels: Record<string, string> = {
      bank: 'Rekening Bank',
      e_wallet: 'E-Wallet',
      deposito: 'Deposito',
      cash: 'Uang Tunai (Cash)',
      debt: 'Hutang / Kartu Kredit',
      crypto: 'Aset Kripto',
    }

    const items = (rows || []).map((r: any) => {
      let ownerLabel = 'Bersama'
      if (r.owner_type === 'suami') ownerLabel = 'Suami'
      else if (r.owner_type === 'istri') ownerLabel = 'Istri'
      else if (r.owner_type === 'sendiri') ownerLabel = 'Sendiri'

      return {
        id: r.id,
        name: r.name,
        type: typeLabels[r.account_type] || r.account_type,
        ownership: ownerLabel,
        initialBalance: Number(r.initial_balance) || 0,
        currentBalance: Number(r.current_balance) || 0,
        status: r.is_active ? 'Aktif' : 'Non-Aktif',
        description: r.description || '',
      }
    })

    return {
      success: true,
      count: items.length,
      accounts: items,
    }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[export.accounts.get] error:', err?.message ?? err)
    throw createError({ statusCode: 500, statusMessage: err?.message ?? 'Internal server error' })
  }
})
