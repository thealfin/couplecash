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

    const body = await readBody(event)
    const { name, amount, dueDate, ownerType, reminderDaysBefore, isRecurring, recurrenceRule, icon } = body

    if (!name || !amount || !dueDate) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Nama, nominal, dan tanggal jatuh tempo wajib diisi'
      })
    }

    const amtNum = Number(amount)
    if (isNaN(amtNum) || amtNum <= 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Nominal harus berupa angka valid lebih dari 0'
      })
    }

    const { data: bill, error: insertErr } = await admin
      .from('bills')
      .insert({
        household_id: householdId,
        name: name.trim(),
        amount: amtNum,
        due_date: dueDate,
        owner_type: ownerType || 'bersama',
        is_recurring: isRecurring !== false,
        recurrence_rule: recurrenceRule || (isRecurring !== false ? 'monthly' : null),
        reminder_days_before: reminderDaysBefore || 3,
        status: 'pending',
        icon: icon || null,
      })
      .select()
      .single()

    if (insertErr) {
      throw insertErr
    }

    return {
      success: true,
      message: `Tagihan "${bill.name}" berhasil ditambahkan`,
      data: {
        ...bill,
        amountText: fmtRp(Number(bill.amount))
      }
    }
  } catch (err: any) {
    console.error('[bills.post] error:', err?.message ?? err)
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.statusMessage || err.message || 'Internal server error'
    })
  }
})
