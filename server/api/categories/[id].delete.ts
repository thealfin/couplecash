import { getSupabaseAdmin } from '../../utils/supabaseAdmin'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    if (!id) {
      throw createError({ statusCode: 400, statusMessage: 'ID Kategori dibutuhkan' })
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
      const { data: hh } = await admin.from('households').select('id').limit(1).single()
      householdId = hh?.id ?? null
    }

    // 1. Check references in transactions
    const { count: txCount = 0 } = await admin
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', id)
      .eq('is_deleted', false)

    // 2. Check references in budgets
    const { count: budgetCount = 0 } = await admin
      .from('budgets')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', id)
      .eq('is_deleted', false)

    // 3. Check references in goals
    const { count: goalCount = 0 } = await admin
      .from('goals')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', id)
      .eq('is_deleted', false)

    const totalRefs = (txCount || 0) + (budgetCount || 0) + (goalCount || 0)

    if (totalRefs > 0) {
      // Safe archival: do not destroy historical data. Deactivate category.
      await admin
        .from('categories')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('household_id', householdId)

      return {
        success: true,
        archived: true,
        message: `Kategori dinonaktifkan/diarsipkan karena masih tercatat pada ${txCount} transaksi, ${budgetCount} budget, dan ${goalCount} goals demi menjaga integritas data riwayat keuangan.`,
        references: { transactions: txCount, budgets: budgetCount, goals: goalCount }
      }
    }

    // Soft delete if no active references
    const { error: delErr } = await admin
      .from('categories')
      .update({ is_deleted: true, is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('household_id', householdId)

    if (delErr) {
      console.error('[categories.delete] error:', delErr)
      throw createError({ statusCode: 500, statusMessage: delErr.message })
    }

    return {
      success: true,
      archived: false,
      message: 'Kategori berhasil dihapus permanen'
    }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[categories.delete] error:', err?.message ?? err)
    throw createError({ statusCode: 500, statusMessage: err?.message ?? 'Internal server error' })
  }
})
