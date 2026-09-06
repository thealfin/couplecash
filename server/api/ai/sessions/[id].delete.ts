import { db } from '../../../db/client'
import { aiChatSessions, aiChatMessages, users } from '../../../db/schema'
import { eq, and } from 'drizzle-orm'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  try {
    const authHeader = getHeader(event, 'Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const token = authHeader.split(' ')[1]
    const supabaseUrl = process.env.SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      throw createError({ statusCode: 500, statusMessage: 'Missing Supabase credentials' })
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      throw createError({ statusCode: 401, statusMessage: 'Invalid token' })
    }

    const currentUser = await db.query.users.findFirst({
      where: eq(users.authUserId, user.id),
      with: { household: true },
    })

    if (!currentUser || !currentUser.householdId) {
      throw createError({ statusCode: 404, statusMessage: 'User profile not found' })
    }

    const id = event.context.params?.id
    if (!id) {
      throw createError({ statusCode: 400, statusMessage: 'Session ID is required' })
    }

    const session = await db.query.aiChatSessions.findFirst({
      where: and(eq(aiChatSessions.id, id as string), eq(aiChatSessions.householdId, currentUser.householdId)),
    })

    if (!session) {
      throw createError({ statusCode: 404, statusMessage: 'Session not found' })
    }

    await db.delete(aiChatMessages).where(eq(aiChatMessages.sessionId, id as string))
    await db.delete(aiChatSessions).where(eq(aiChatSessions.id, id as string))

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