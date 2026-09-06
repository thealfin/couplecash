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

    // Verify bill belongs to this household
    const { data: bill, error: billErr } = await admin
      .from('bills')
      .select('id, name')
      .eq('id', id)
      .eq('household_id', householdId)
      .single()

    if (billErr || !bill) {
      throw createError({ statusCode: 404, statusMessage: 'Tagihan tidak ditemukan' })
    }

    // Delete bill
    const { error: delErr } = await admin
      .from('bills')
      .delete()
      .eq('id', id)
      .eq('household_id', householdId)

    if (delErr) {
      throw createError({ statusCode: 500, statusMessage: `Gagal menghapus tagihan: ${delErr.message}` })
    }

    return {
      success: true,
      message: `Tagihan "${bill.name}" berhasil dihapus`
    }
  } catch (err: any) {
    console.error('[bills.delete] error:', err?.message ?? err)
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.statusMessage || err.message || 'Internal server error'
    })
  }
})
