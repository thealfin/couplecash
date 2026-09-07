import { verifyAuthenticationResponse } from '@simplewebauthn/server'
import { getUserFromToken, getSupabaseAdmin } from '../../../../utils/supabaseAdmin'
import {
  getWebAuthnConfig,
  getAndConsumeWebAuthnChallenge,
  issueVaultAuthToken,
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
      .select('id, household_id, email')
      .eq('auth_user_id', user.id)
      .single()

    if (!dbUser) {
      throw createError({ statusCode: 404, statusMessage: 'User profile not found' })
    }

    const body = await readBody(event)
    const { response, challengeKey } = body || {}

    if (!response || !challengeKey) {
      throw createError({ statusCode: 400, statusMessage: 'Data autentikasi tidak lengkap' })
    }

    const expectedChallenge = getAndConsumeWebAuthnChallenge(challengeKey, dbUser.id, 'authenticate')
    if (!expectedChallenge) {
      throw createError({ statusCode: 400, statusMessage: 'Sesi verifikasi biometrik kadaluarsa. Silakan ulangi.' })
    }

    // Lookup matching active credential
    const credentialId = response.id
    const { data: credRecord } = await admin
      .from('user_biometric_credentials')
      .select('*')
      .eq('credential_id', credentialId)
      .eq('user_id', dbUser.id)
      .single()

    if (!credRecord) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Kredensial biometrik ini tidak terdaftar pada akun Anda.',
      })
    }

    if (credRecord.revoked_at) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Kredensial biometrik perangkat ini telah dicabut. Gunakan PIN untuk membuka.',
      })
    }

    const { rpID, origin } = getWebAuthnConfig(event)

    // Convert stored public key base64 to Uint8Array
    const publicKeyBytes = Buffer.from(credRecord.public_key, 'base64')

    let verification: any
    try {
      verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        credential: {
          id: credRecord.credential_id,
          publicKey: new Uint8Array(publicKeyBytes),
          counter: Number(credRecord.counter || 0),
          transports: credRecord.transports || undefined,
        },
        requireUserVerification: true,
      })
    } catch (verErr: any) {
      console.warn('[webauthn/authenticate/verify] verification failed:', verErr?.message)
      throw createError({
        statusCode: 401,
        statusMessage: verErr?.message || 'Verifikasi biometrik tidak valid.',
      })
    }

    if (!verification.verified) {
      throw createError({ statusCode: 401, statusMessage: 'Verifikasi biometrik gagal.' })
    }

    const { newCounter } = verification.authenticationInfo

    // Update counter and last_used_at
    await admin
      .from('user_biometric_credentials')
      .update({
        counter: newCounter,
        last_used_at: new Date().toISOString(),
      })
      .eq('id', credRecord.id)

    // Generate short-lived vault auth token (5 minutes)
    const vaultAuthToken = issueVaultAuthToken(dbUser.id, dbUser.household_id || '', 'biometric')

    // Log security audit
    if (dbUser.household_id) {
      await logSecurityAudit({
        householdId: dbUser.household_id,
        userId: dbUser.id,
        entityType: 'biometric',
        entityId: credRecord.id,
        action: 'BIOMETRIC_AUTHENTICATED',
        metadata: {
          deviceType: credRecord.device_type,
          credentialId: credRecord.credential_id.slice(0, 12) + '...',
          success: true,
        },
      })
    }

    return {
      success: true,
      message: 'Biometrik berhasil diverifikasi',
      vaultAuthToken,
      expiresAt: Date.now() + 5 * 60 * 1000,
      method: 'biometric',
    }
  } catch (err: any) {
    if (err?.statusCode) throw err
    console.error('[webauthn/authenticate/verify] uncaught error:', err?.message || err)
    throw createError({ statusCode: 500, statusMessage: err?.message || 'Gagal memverifikasi biometrik' })
  }
})
