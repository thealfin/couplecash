import { getUserFromToken, getSupabaseAdmin } from '../../../../utils/supabaseAdmin'
import { setSensitiveSecurityHeaders, logSecurityAudit } from '../../../../utils/securityConfig'

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

    if (!dbUser) {
      throw createError({ statusCode: 404, statusMessage: 'User profile not found' })
    }

    const body = await readBody(event)
    const { deviceId } = body || {}

    if (!deviceId) {
      throw createError({ statusCode: 400, statusMessage: 'ID perangkat harus disertakan' })
    }

    // Verify ownership of the credential
    const { data: targetCred } = await admin
      .from('user_biometric_credentials')
      .select('id, device_type, credential_id')
      .eq('id', deviceId)
      .eq('user_id', dbUser.id)
      .single()

    if (!targetCred) {
      throw createError({ statusCode: 404, statusMessage: 'Perangkat tidak ditemukan atau bukan milik Anda' })
    }

    // Mark as revoked
    await admin
      .from('user_biometric_credentials')
      .update({
        revoked_at: new Date().toISOString(),
      })
      .eq('id', targetCred.id)

    // Check if any active credentials remain
    const { count } = await admin
      .from('user_biometric_credentials')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', dbUser.id)
      .is('revoked_at', null)

    if (!count || count === 0) {
      await admin
        .from('users')
        .update({
          biometric_enabled: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', dbUser.id)
    }

    if (dbUser.household_id) {
      await logSecurityAudit({
        householdId: dbUser.household_id,
        userId: dbUser.id,
        entityType: 'biometric',
        entityId: targetCred.id,
        action: 'BIOMETRIC_REVOKED',
        metadata: {
          deviceType: targetCred.device_type,
          credentialId: targetCred.credential_id.slice(0, 10) + '...',
        },
      })
    }

    return {
      success: true,
      message: 'Akses biometrik perangkat berhasil dicabut',
    }
  } catch (err: any) {
    if (err?.statusCode) throw err
    console.error('[webauthn/devices/revoke] error:', err?.message || err)
    throw createError({ statusCode: 500, statusMessage: err?.message || 'Gagal mencabut akses perangkat' })
  }
})
