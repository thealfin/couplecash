import { getSupabaseAdmin } from '../../utils/supabaseAdmin'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    if (!id) {
      throw createError({ statusCode: 400, statusMessage: 'Budget ID diperlukan' })
    }

    const admin = getSupabaseAdmin()
    const body = await readBody(event)

    const {
      name,
      categoryId,
      ownerType,
      periodType,
      limitAmount,
      periodStart,
      periodEnd,
      isActive,
    } = body

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    if (name !== undefined) updatePayload.name = name.trim()
    if (categoryId !== undefined) updatePayload.category_id = categoryId || null
    if (ownerType !== undefined) updatePayload.owner_type = ownerType
    if (periodType !== undefined) updatePayload.period_type = periodType
    if (limitAmount !== undefined) updatePayload.limit_amount = String(limitAmount)
    if (periodStart !== undefined) updatePayload.period_start = periodStart
    if (periodEnd !== undefined) updatePayload.period_end = periodEnd
    if (isActive !== undefined) updatePayload.is_active = isActive

    const { data: updated, error } = await admin
      .from('budgets')
      .update(updatePayload)
      .eq('id', id)
      .select('*, category:categories(id, name, icon)')
      .single()

    if (error) {
      throw error
    }

    return {
      success: true,
      budget: updated,
    }
  } catch (err: any) {
    console.error('[budgets.put] error:', err?.message ?? err)
    throw createError({ statusCode: err?.statusCode || 500, statusMessage: err?.statusMessage || err?.message || 'Gagal memperbarui budget' })
  }
})
