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

    if (!profile || !profile.household_id) {
      throw createError({ statusCode: 404, statusMessage: 'User profile not found' })
    }

    const { data: sessions, error } = await admin
      .from('ai_chat_sessions')
      .select('*')
      .eq('household_id', profile.household_id)
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return {
      success: true,
      sessions: (sessions || []).map((s: any) => ({
        id: s.id,
        householdId: s.household_id,
        userId: s.user_id,
        title: s.title,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
      })),
    }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[ai.sessions.get] error:', err?.message ?? err)
    throw createError({ statusCode: 500, statusMessage: err?.message ?? 'Internal server error' })
  }
})