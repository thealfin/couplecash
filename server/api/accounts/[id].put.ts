import { getSupabaseAdmin } from '../../utils/supabaseAdmin'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    if (!id) {
      throw createError({ statusCode: 400, statusMessage: 'ID Akun dibutuhkan' })
    }

    const body = await readBody(event)
    const {
      name,
      accountType,
      ownerType,
      balance,
      accountNumber,
      holderName,
      icon,
      isActive,
    } = body

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

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    if (name !== undefined) updatePayload.name = name.trim()
    if (accountType !== undefined) updatePayload.account_type = accountType
    if (ownerType !== undefined) updatePayload.owner_type = ownerType
    if (holderName !== undefined) updatePayload.description = holderName
    if (icon !== undefined) updatePayload.icon = icon
    if (isActive !== undefined) updatePayload.is_active = Boolean(isActive)
    if (body.debtStatus !== undefined) updatePayload.debt_status = body.debtStatus
    if (accountType && accountType !== 'debt') updatePayload.debt_status = 'paid_off'

    if (accountNumber !== undefined) {
      const cleaned = accountNumber.replace(/\D/g, '')
      updatePayload.account_number_masked = cleaned.length > 4 ? '•••• ' + cleaned.slice(-4) : cleaned
    }

    if (balance !== undefined) {
      const numBal = Number(balance)
      const adjustedBal = accountType === 'debt' ? -Math.abs(numBal) : numBal
      updatePayload.current_balance = String(adjustedBal)
    }

    const { data: updatedAcc, error: updateErr } = await admin
      .from('financial_accounts')
      .update(updatePayload)
      .eq('id', id)
      .eq('household_id', householdId)
      .select('*')
      .single()

    if (updateErr) {
      console.error('[accounts.put] error:', updateErr)
      throw createError({ statusCode: 500, statusMessage: updateErr.message })
    }

    return { success: true, account: updatedAcc }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[accounts.put] error:', err?.message ?? err)
    throw createError({ statusCode: 500, statusMessage: err?.message ?? 'Internal server error' })
  }
})
