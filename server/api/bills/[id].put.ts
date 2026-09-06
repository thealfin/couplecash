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

    const id = event.context.params?.id
    if (!id) {
      throw createError({ statusCode: 400, statusMessage: 'ID tagihan wajib diisi' })
    }

    // Verify bill exists
    const { data: existingBill, error: findErr } = await admin
      .from('bills')
      .select('id, name')
      .eq('id', id)
      .eq('household_id', householdId)
      .single()

    if (findErr || !existingBill) {
      throw createError({ statusCode: 404, statusMessage: 'Tagihan tidak ditemukan' })
    }

    const body = await readBody(event)
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString()
    }

    if (body.name !== undefined) updateData.name = body.name.trim()
    if (body.amount !== undefined) {
      const amt = Number(body.amount)
      if (isNaN(amt) || amt <= 0) {
        throw createError({ statusCode: 400, statusMessage: 'Nominal harus angka valid lebih dari 0' })
      }
      updateData.amount = amt
    }
    if (body.dueDate !== undefined) updateData.due_date = body.dueDate
    if (body.ownerType !== undefined) updateData.owner_type = body.ownerType
    if (body.reminderDaysBefore !== undefined) updateData.reminder_days_before = body.reminderDaysBefore
    if (body.isRecurring !== undefined) updateData.is_recurring = body.isRecurring
    if (body.recurrenceRule !== undefined) updateData.recurrence_rule = body.recurrenceRule
    if (body.icon !== undefined) updateData.icon = body.icon
    if (body.status !== undefined) updateData.status = body.status

    const { data: updatedBill, error: updateErr } = await admin
      .from('bills')
      .update(updateData)
      .eq('id', id)
      .eq('household_id', householdId)
      .select()
      .single()

    if (updateErr) {
      throw updateErr
    }

    return {
      success: true,
      message: `Tagihan "${updatedBill.name}" berhasil diperbarui`,
      data: {
        ...updatedBill,
        amountText: fmtRp(Number(updatedBill.amount))
      }
    }
  } catch (err: any) {
    console.error('[bills.put] error:', err?.message ?? err)
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.statusMessage || err.message || 'Internal server error'
    })
  }
})
