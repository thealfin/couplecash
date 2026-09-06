import { getSupabaseAdmin } from '../../utils/supabaseAdmin'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    if (!id) {
      throw createError({ statusCode: 400, statusMessage: 'Budget ID diperlukan' })
    }

    const admin = getSupabaseAdmin()

    // Fetch generated category if any
    const { data: b } = await admin.from('budgets').select('generated_category_id').eq('id', id).single()
    if (b?.generated_category_id) {
      await admin.from('categories').update({ is_active: false, is_deleted: true }).eq('id', b.generated_category_id)
    }

    // Delete budget
    const { error } = await admin
      .from('budgets')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }

    return {
      success: true,
      message: 'Budget berhasil dihapus',
    }
  } catch (err: any) {
    console.error('[budgets.delete] error:', err?.message ?? err)
    throw createError({ statusCode: err?.statusCode || 500, statusMessage: err?.statusMessage || err?.message || 'Gagal menghapus budget' })
  }
})
