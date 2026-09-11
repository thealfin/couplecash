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

    const { data: settings } = await admin
      .from('ai_user_settings')
      .select('*')
      .eq('user_id', profile.id)
      .maybeSingle()

    return {
      success: true,
      settings: settings ? {
        id: settings.id,
        userId: settings.user_id,
        aiEnabled: settings.ai_enabled,
        preferredModel: settings.preferred_model,
        updatedAt: settings.updated_at,
      } : { aiEnabled: false, preferredModel: 'gemini-2.5-flash' },
    }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[ai.settings.get] error:', err?.message ?? err)
    throw createError({ statusCode: 500, statusMessage: err?.message ?? 'Internal server error' })
  }
})