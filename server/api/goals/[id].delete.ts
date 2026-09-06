import { getSupabaseAdmin } from '../../utils/supabaseAdmin'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    if (!id) {
      throw createError({ statusCode: 400, statusMessage: 'Goal ID diperlukan' })
    }

    const admin = getSupabaseAdmin()

    const { error } = await admin
      .from('goals')
      .update({
        is_deleted: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      throw error
    }

    return {
      success: true,
      message: 'Goal berhasil dihapus',
    }
  } catch (err: any) {
    console.error('[goals.delete] error:', err?.message ?? err)
    throw createError({ statusCode: err?.statusCode || 500, statusMessage: err?.statusMessage || err?.message || 'Gagal menghapus goal' })
  }
})
