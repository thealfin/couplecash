import { db } from '../../db/client'
import { aiUserSettings, users } from '../../db/schema'
import { eq } from 'drizzle-orm'
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
    })

    if (!currentUser) {
      throw createError({ statusCode: 404, statusMessage: 'User profile not found' })
    }

    const body = await readBody(event)
    const { aiEnabled, preferredModel } = body

    const existing = await db.query.aiUserSettings.findFirst({
      where: eq(aiUserSettings.userId, currentUser.id),
    })

    if (existing) {
      await db.update(aiUserSettings)
        .set({ aiEnabled: aiEnabled ?? existing.aiEnabled, preferredModel: preferredModel ?? existing.preferredModel })
        .where(eq(aiUserSettings.id, existing.id))
    } else {
      await db.insert(aiUserSettings).values({
        userId: currentUser.id,
        aiEnabled: aiEnabled ?? false,
        preferredModel: preferredModel ?? 'gemini-2.5-flash',
      })
    }

    const updated = await db.query.aiUserSettings.findFirst({
      where: eq(aiUserSettings.userId, currentUser.id),
    })

    return {
      success: true,
      settings: updated,
    }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[ai.settings.put] error:', err?.message ?? err)
    throw createError({ statusCode: 500, statusMessage: err?.message ?? 'Internal server error' })
  }
})