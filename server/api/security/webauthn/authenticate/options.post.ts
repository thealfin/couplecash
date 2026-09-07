import { generateAuthenticationOptions } from '@simplewebauthn/server'
import { getUserFromToken, getSupabaseAdmin } from '../../../../utils/supabaseAdmin'
import { getWebAuthnConfig, storeWebAuthnChallenge, setSensitiveSecurityHeaders } from '../../../../utils/securityConfig'

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
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!dbUser) {
      throw createError({ statusCode: 404, statusMessage: 'User profile not found' })
    }

    const { rpID } = getWebAuthnConfig(event)

    // Retrieve active credentials for this user
    const { data: credentials = [] } = await admin
      .from('user_biometric_credentials')
      .select('credential_id, transports')
      .eq('user_id', dbUser.id)
      .is('revoked_at', null)

    if (!credentials || credentials.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Belum ada perangkat biometrik yang didaftarkan pada akun ini. Silakan atur di Pengaturan Keamanan atau gunakan PIN.',
      })
    }

    const allowCredentials = credentials.map((c: any) => ({
      id: c.credential_id,
      transports: c.transports || undefined,
    }))

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials,
      userVerification: 'required',
    })

    const challengeKey = storeWebAuthnChallenge(dbUser.id, options.challenge, 'authenticate')

    return {
      success: true,
      options,
      challengeKey,
    }
  } catch (err: any) {
    if (err?.statusCode) throw err
    console.error('[webauthn/authenticate/options] error:', err?.message || err)
    throw createError({ statusCode: 500, statusMessage: err?.message || 'Gagal menyiapkan autentikasi biometrik' })
  }
})
