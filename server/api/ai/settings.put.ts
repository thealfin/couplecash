import { getSupabaseAdmin, getUserFromToken } from '../../utils/supabaseAdmin'

export default defineEventHandler(async (event) => {
  try {
    const authHeader = getHeader(event, 'Authorization')
    const user = await getUserFromToken(authHeader)

    if (!user) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const admin = getSupabaseAdmin()
    const { data: profile } = await admin
      .from('users')
      .select('id, household_id')
      .eq('auth_user_id', user.id)
      .single()

    if (!profile) {
      throw createError({ statusCode: 404, statusMessage: 'User profile not found' })
    }

    const body = await readBody(event)
    const { aiEnabled, preferredModel, customInstructions } = body || {}

    const { data: existing } = await admin
      .from('ai_user_settings')
      .select('id')
      .eq('user_id', profile.id)
      .maybeSingle()

    if (existing) {
      const updateData: any = { updated_at: new Date().toISOString() }
      if (aiEnabled !== undefined) updateData.ai_enabled = aiEnabled
      if (preferredModel !== undefined) updateData.preferred_model = preferredModel

      await admin.from('ai_user_settings').update(updateData).eq('id', existing.id)
    } else {
      await admin.from('ai_user_settings').insert({
        user_id: profile.id,
        ai_enabled: aiEnabled ?? false,
        preferred_model: preferredModel ?? 'gemini-2.5-flash',
      })
    }

    const { data: updated } = await admin
      .from('ai_user_settings')
      .select('*')
      .eq('user_id', profile.id)
      .maybeSingle()

    return {
      success: true,
      settings: updated ? {
        id: updated.id,
        userId: updated.user_id,
        aiEnabled: updated.ai_enabled,
        preferredModel: updated.preferred_model,
        updatedAt: updated.updated_at,
      } : null,
    }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[ai.settings.put] error:', err?.message ?? err)
    throw createError({ statusCode: 500, statusMessage: err?.message ?? 'Internal server error' })
  }
})