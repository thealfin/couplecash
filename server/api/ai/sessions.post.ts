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

    const { title } = (await readBody(event)) || {}

    const { data: newSession, error } = await admin
      .from('ai_chat_sessions')
      .insert({
        household_id: profile.household_id,
        user_id: profile.id,
        title: title || 'Chat Baru',
      })
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      session: {
        id: newSession.id,
        householdId: newSession.household_id,
        userId: newSession.user_id,
        title: newSession.title,
        createdAt: newSession.created_at,
        updatedAt: newSession.updated_at,
      },
    }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[ai.sessions.post] error:', err?.message ?? err)
    throw createError({ statusCode: 500, statusMessage: err?.message ?? 'Internal server error' })
  }
})