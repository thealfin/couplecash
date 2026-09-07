import { getSupabaseAdmin } from '../utils/supabaseAdmin'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const {
      name,
      accountType = 'bank',
      ownerType = 'bersama',
      initialBalance = 0,
      accountNumber,
      holderName,
      icon,
    } = body

    if (!name) {
      throw createError({ statusCode: 400, statusMessage: 'Nama akun wajib diisi' })
    }

    const authHeader = getHeader(event, 'Authorization')
    const admin = getSupabaseAdmin()

    let householdId: string | null = null
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      const { data: { user } } = await admin.auth.getUser(token)
      if (user) {
        const { data: profile } = await admin.from('users').select('household_id, role').eq('auth_user_id', user.id).single()
        householdId = profile?.household_id ?? null
        if (profile?.role === 'single' && (!ownerType || ownerType === 'bersama')) {
          ownerType = 'sendiri'
        }
      }
    }
    if (!householdId) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    if (!householdId) {
      throw createError({ statusCode: 404, statusMessage: 'Household not found' })
    }

    // Mask account number if provided
    let maskedNumber: string | null = null
    if (accountNumber) {
      const cleaned = accountNumber.replace(/\D/g, '')
      maskedNumber = cleaned.length > 4
        ? '•••• ' + cleaned.slice(-4)
        : cleaned
    }

    // Determine icon based on account type or custom icon
    const iconMap: Record<string, string> = {
      bank: 'account_balance',
      e_wallet: 'account_balance_wallet',
      deposito: 'savings',
      cash: 'wallet',
      crypto: 'currency_bitcoin',
      debt: 'warning',
    }

    const finalInitial = accountType === 'debt' ? -Math.abs(Number(initialBalance)) : Number(initialBalance)

    const { data: newAcc, error: accErr } = await admin
      .from('financial_accounts')
      .insert({
        household_id: householdId,
        name,
        account_type: accountType,
        owner_type: ownerType,
        initial_balance: String(finalInitial),
        current_balance: String(finalInitial),
        account_number_masked: maskedNumber,
        description: holderName || null,
        icon: icon || iconMap[accountType] || 'account_balance',
        is_active: true,
      })
      .select('*')
      .single()

    if (accErr) {
      console.error('[accounts.post] error:', accErr)
      throw createError({ statusCode: 500, statusMessage: accErr.message })
    }

    return { success: true, account: newAcc }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[accounts.post] error:', err?.message ?? err)
    throw createError({ statusCode: 500, statusMessage: err?.message ?? 'Internal server error' })
  }
})
