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

    // Verify ownership
    const { data: session } = await admin
      .from('ai_chat_sessions')
      .select('id')
      .eq('id', id)
      .eq('household_id', profile.household_id)
      .single()

    if (!session) {
      throw createError({ statusCode: 404, statusMessage: 'Session not found' })
    }

    await admin.from('ai_chat_messages').delete().eq('session_id', id)
    await admin.from('ai_chat_sessions').delete().eq('id', id)

    return {
      success: true,
      message: 'Session deleted successfully',
    }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[ai.sessions.[id].delete] error:', err?.message ?? err)
    throw createError({ statusCode: 500, statusMessage: err?.message ?? 'Internal server error' })
  }
})