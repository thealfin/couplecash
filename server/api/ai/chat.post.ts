import { GoogleGenerativeAI } from '@google/generative-ai'
import { db } from '../../db/client'
import { aiChatSessions, aiChatMessages, users } from '../../db/schema'
import { eq, and, desc, sql } from 'drizzle-orm'
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

    const body = await readBody(event)
    const { sessionId, message } = body

    if (!message) {
      throw createError({ statusCode: 400, statusMessage: 'Message is required' })
    }

    let activeSessionId = sessionId

    if (!activeSessionId) {
      const settings = await db.query.aiUserSettings.findFirst({
        where: eq(aiUserSettings.userId, currentUser.id),
      })

      const sessions = await db.query.aiChatSessions.findMany({
        where: and(eq(aiChatSessions.householdId, currentUser.householdId), eq(aiChatSessions.userId, currentUser.id)),
        orderBy: (s, { desc }) => [desc(s.createdAt)],
        limit: 1,
      })

      if (sessions.length > 0 && settings?.aiEnabled) {
        activeSessionId = sessions[0].id
      }
    }

    if (!activeSessionId) {
      const [newSession] = await db.insert(aiChatSessions).values({
        householdId: currentUser.householdId,
        userId: currentUser.id,
        title: 'Chat Baru',
      }).returning()
      activeSessionId = newSession.id
    }

    await db.insert(aiChatMessages).values({
      sessionId: activeSessionId,
      sender: 'user',
      message,
    })

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
    let responseText = ''
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
      const result = await model.generateContent(message)
      responseText = result.response.text()
    } catch (e: any) {
      const modelFallback = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' })
      const result = await modelFallback.generateContent(message)
      responseText = result.response.text()
    }
    const aiMessage = responseText

    await db.insert(aiChatMessages).values({
      sessionId: activeSessionId,
      sender: 'model',
      message: aiMessage,
    })

    const titleRes = await db.query.aiChatSessions.findFirst({
      where: eq(aiChatSessions.id, activeSessionId),
    })

    if (titleRes && !titleRes.title || titleRes.title === 'Chat Baru') {
      const truncated = aiMessage.length > 50 ? aiMessage.substring(0, 50) + '...' : aiMessage
      await db.update(aiChatSessions).set({ title: truncated }).where(eq(aiChatSessions.id, activeSessionId))
    }

    return {
      success: true,
      sessionId: activeSessionId,
      response: aiMessage,
    }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[ai.chat.post] error:', err?.message ?? err)
    throw createError({ statusCode: 500, statusMessage: err?.message ?? 'Internal server error' })
  }
})