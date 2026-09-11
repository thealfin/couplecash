import { getSupabaseAdmin, getUserFromToken } from '../../../utils/supabaseAdmin'

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

    const id = event.context.params?.id
    if (!id) {
      throw createError({ statusCode: 400, statusMessage: 'Session ID is required' })
    }

    const { data: session, error: sessErr } = await admin
      .from('ai_chat_sessions')
      .select('*')
      .eq('id', id)
      .eq('household_id', profile.household_id)
      .single()

    if (sessErr || !session) {
      throw createError({ statusCode: 404, statusMessage: 'Session not found' })
    }

    const { data: messages = [] } = await admin
      .from('ai_chat_messages')
      .select('*')
      .eq('session_id', id)
      .order('created_at', { ascending: true })

    return {
      success: true,
      session: {
        id: session.id,
        householdId: session.household_id,
        userId: session.user_id,
        title: session.title,
        createdAt: session.created_at,
        updatedAt: session.updated_at,
        messages: (messages || []).map((m: any) => ({
          id: m.id,
          sessionId: m.session_id,
          sender: m.sender,
          message: m.message,
          createdAt: m.created_at,
        })),
      },
    }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[ai.sessions.[id].get] error:', err?.message ?? err)
    throw createError({ statusCode: 500, statusMessage: err?.message ?? 'Internal server error' })
  }
})