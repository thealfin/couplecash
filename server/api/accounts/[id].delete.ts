import { getSupabaseAdmin } from '../../utils/supabaseAdmin'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    if (!id) {
      throw createError({ statusCode: 400, statusMessage: 'ID Akun dibutuhkan' })
    }

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

    // 1. Check references in transactions
    const { count: txCount = 0 } = await admin
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', id)
      .eq('is_deleted', false)

    if ((txCount || 0) > 0) {
      // Safe archival: do not destroy historical transactions
      await admin
        .from('financial_accounts')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('household_id', householdId)

      return {
        success: true,
        archived: true,
        message: `Pos Akun dinonaktifkan/diarsipkan karena terdapat ${txCount} transaksi tercatat. Riwayat transaksi tetap aman tersimpan.`,
        transactionCount: txCount,
      }
    }

    // Soft delete if no transaction references
    const { error: delErr } = await admin
      .from('financial_accounts')
      .update({ is_deleted: true, is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('household_id', householdId)

    if (delErr) {
      console.error('[accounts.delete] error:', delErr)
      throw createError({ statusCode: 500, statusMessage: delErr.message })
    }

    return {
      success: true,
      archived: false,
      message: 'Pos Akun berhasil dihapus',
    }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[accounts.delete] error:', err?.message ?? err)
    throw createError({ statusCode: 500, statusMessage: err?.message ?? 'Internal server error' })
  }
})
