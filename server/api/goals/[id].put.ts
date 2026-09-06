import { getSupabaseAdmin } from '../../utils/supabaseAdmin'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    if (!id) {
      throw createError({ statusCode: 400, statusMessage: 'Goal ID diperlukan' })
    }

    const admin = getSupabaseAdmin()
    const body = await readBody(event)

    const {
      name,
      targetDate,
      targetAmount,
      partner1Contribution,
      partner2Contribution,
      categoryId,
      icon,
      description,
    } = body

    // Fetch existing goal to verify
    const { data: existing, error: fetchErr } = await admin
      .from('goals')
      .select('*')
      .eq('id', id)
      .eq('is_deleted', false)
      .single()

    if (fetchErr || !existing) {
      throw createError({ statusCode: 404, statusMessage: 'Goal tidak ditemukan' })
    }

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    if (name !== undefined) updatePayload.name = name.trim()
    if (targetDate !== undefined) updatePayload.target_date = targetDate
    if (icon !== undefined) updatePayload.icon = icon
    if (description !== undefined) updatePayload.description = description
    if (categoryId !== undefined) updatePayload.category_id = categoryId || null

    const target = targetAmount !== undefined ? Number(targetAmount) : Number(existing.target_amount)
    if (targetAmount !== undefined) updatePayload.target_amount = target

    const p1 = partner1Contribution !== undefined ? Math.max(0, Number(partner1Contribution)) : Number(existing.partner_1_contribution)
    let p2: number | null = null
    if (partner2Contribution !== undefined) {
      p2 = partner2Contribution === null ? null : Math.max(0, Number(partner2Contribution))
      updatePayload.partner_2_contribution = p2
    } else {
      p2 = existing.partner_2_contribution !== null && existing.partner_2_contribution !== undefined ? Number(existing.partner_2_contribution) : null
    }

    if (partner1Contribution !== undefined) updatePayload.partner_1_contribution = p1

    const isCompleted = p1 + (p2 ?? 0) >= target
    if (isCompleted) {
      updatePayload.status = 'completed'
      if (!existing.completed_at) {
        updatePayload.completed_at = new Date().toISOString()
      }
    } else {
      updatePayload.status = 'active'
      updatePayload.completed_at = null
    }

    const { data: updated, error: updateErr } = await admin
      .from('goals')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (updateErr) {
      throw updateErr
    }

    return {
      success: true,
      goal: updated,
    }
  } catch (err: any) {
    console.error('[goals.put] error:', err?.message ?? err)
    throw createError({ statusCode: err?.statusCode || 500, statusMessage: err?.statusMessage || err?.message || 'Gagal memperbarui goal' })
  }
})
