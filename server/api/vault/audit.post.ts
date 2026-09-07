import { getUserFromToken, getSupabaseAdmin } from '../../utils/supabaseAdmin'
import { setSensitiveSecurityHeaders, logSecurityAudit } from '../../utils/securityConfig'

export default defineEventHandler(async (event) => {
  setSensitiveSecurityHeaders(event)
  try {
    const authHeader = getHeader(event, 'Authorization')
    const user = await getUserFromToken(authHeader)
    if (!user) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const admin = getSupabaseAdmin()
    const { data: dbUser } = await admin
      .from('users')
      .select('id, household_id')
      .eq('auth_user_id', user.id)
      .single()

    if (!dbUser?.household_id) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }

    const body = await readBody(event)
    const { action, itemId, platformName } = body || {}

    const allowedActions = [
      'VAULT_SECRET_VIEWED',
      'VAULT_SECRET_COPIED',
      'VAULT_LOCKED',
      'VAULT_UNLOCKED',
    ]

    if (!action || !allowedActions.includes(action)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid audit action' })
    }

    await logSecurityAudit({
      householdId: dbUser.household_id,
      userId: dbUser.id,
      entityType: 'vault',
      entityId: itemId || dbUser.id,
      action,
      metadata: {
        platformName: platformName || undefined,
        timestamp: Date.now(),
      },
    })

    return { success: true }
  } catch (err: any) {
    if (err?.statusCode) throw err
    return { success: false }
  }
})
