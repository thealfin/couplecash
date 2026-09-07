import { verifyRegistrationResponse } from '@simplewebauthn/server'
import { getUserFromToken, getSupabaseAdmin } from '../../../../utils/supabaseAdmin'
import {
  getWebAuthnConfig,
  getAndConsumeWebAuthnChallenge,
  setSensitiveSecurityHeaders,
  logSecurityAudit,
} from '../../../../utils/securityConfig'

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
      .select('id, household_id, email, full_name')
      .eq('auth_user_id', user.id)
      .single()

    if (!dbUser) {
      throw createError({ statusCode: 404, statusMessage: 'User profile not found' })
    }

    const body = await readBody(event)
    const { response, challengeKey, deviceName } = body || {}

    if (!response || !challengeKey) {
      throw createError({ statusCode: 400, statusMessage: 'Data pendaftaran biometrik tidak lengkap' })
    }

    const expectedChallenge = getAndConsumeWebAuthnChallenge(challengeKey, dbUser.id, 'register')
    if (!expectedChallenge) {
      throw createError({ statusCode: 400, statusMessage: 'Challenge biometrik telah kadaluarsa atau tidak valid' })
    }

    const { rpID, origin } = getWebAuthnConfig(event)

    let verification: any
    try {
      verification = await verifyRegistrationResponse({
        response,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        requireUserVerification: true,
      })
    } catch (verErr: any) {
      console.warn('[webauthn/register/verify] verification error:', verErr?.message)
      throw createError({ statusCode: 400, statusMessage: verErr?.message || 'Verifikasi biometrik gagal' })
    }

    if (!verification.verified || !verification.registrationInfo) {
      throw createError({ statusCode: 400, statusMessage: 'Verifikasi pendaftaran biometrik gagal' })
    }

    const {
      credential: {
        id: credentialID,
        publicKey: credentialPublicKey,
        counter,
        transports,
      } = verification.registrationInfo as any,
      credentialDeviceType,
      credentialBackedUp,
    } = verification.registrationInfo as any

    // Normalize public key to base64 string
    const publicKeyStr = Buffer.isBuffer(credentialPublicKey)
      ? credentialPublicKey.toString('base64')
      : credentialPublicKey instanceof Uint8Array
        ? Buffer.from(credentialPublicKey).toString('base64')
        : String(credentialPublicKey)

    const resolvedCredentialId = typeof credentialID === 'string'
      ? credentialID
      : Buffer.from(credentialID).toString('base64url')

    // Store in user_biometric_credentials
    const { data: newCred, error: insertError } = await admin
      .from('user_biometric_credentials')
      .insert({
        user_id: dbUser.id,
        credential_id: resolvedCredentialId,
        public_key: publicKeyStr,
        counter: counter || 0,
        transports: transports || response.response?.transports || null,
        device_type: deviceName || credentialDeviceType || 'Perangkat Biometrik',
        backed_up: !!credentialBackedUp,
        last_used_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('[webauthn/register/verify] insert error:', insertError)
      throw createError({ statusCode: 500, statusMessage: 'Gagal menyimpan kredensial biometrik' })
    }

    // Set users.biometric_enabled = true
    await admin
      .from('users')
      .update({
        biometric_enabled: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', dbUser.id)

    // Log security audit
    if (dbUser.household_id) {
      await logSecurityAudit({
        householdId: dbUser.household_id,
        userId: dbUser.id,
        entityType: 'biometric',
        entityId: newCred.id,
        action: 'BIOMETRIC_REGISTERED',
        metadata: {
          deviceType: deviceName || credentialDeviceType || 'Platform Authenticator',
          credentialId: resolvedCredentialId.slice(0, 12) + '...',
          success: true,
        },
      })
    }

    return {
      success: true,
      message: 'Perangkat biometrik berhasil didaftarkan',
      credentialId: resolvedCredentialId,
    }
  } catch (err: any) {
    if (err?.statusCode) throw err
    console.error('[webauthn/register/verify] uncaught error:', err?.message || err)
    throw createError({ statusCode: 500, statusMessage: err?.message || 'Gagal memverifikasi biometrik' })
  }
})
