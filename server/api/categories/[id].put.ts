import { getSupabaseAdmin } from '../../utils/supabaseAdmin'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    if (!id) {
      throw createError({ statusCode: 400, statusMessage: 'ID Kategori dibutuhkan' })
    }

    const body = await readBody(event)
    const { name, type, icon, appliesTo, isActive } = body

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
      updated_at: new Date().toISOString()
    }
    if (name !== undefined) updatePayload.name = name.trim()
    if (type !== undefined) updatePayload.type = type
    if (icon !== undefined) updatePayload.icon = icon
    if (appliesTo !== undefined) updatePayload.applies_to = appliesTo
    if (isActive !== undefined) updatePayload.is_active = Boolean(isActive)

    const { data: updatedCat, error: updateErr } = await admin
      .from('categories')
      .update(updatePayload)
      .eq('id', id)
      .eq('household_id', householdId)
      .select('*')
      .single()

    if (updateErr) {
      console.error('[categories.put] error:', updateErr)
      throw createError({ statusCode: 500, statusMessage: updateErr.message })
    }

    return { success: true, category: updatedCat }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[categories.put] error:', err?.message ?? err)
    throw createError({ statusCode: 500, statusMessage: err?.message ?? 'Internal server error' })
  }
})
