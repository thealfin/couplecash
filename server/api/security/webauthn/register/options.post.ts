import { generateRegistrationOptions } from '@simplewebauthn/server'
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
      .select('id, full_name, email, household_id')
      .eq('auth_user_id', user.id)
      .single()

    if (!dbUser) {
      throw createError({ statusCode: 404, statusMessage: 'User profile not found' })
    }

    const { rpName, rpID } = getWebAuthnConfig(event)

    // Retrieve existing credentials to avoid re-registering the same authenticator
    const { data: existingCreds } = await admin
      .from('user_biometric_credentials')
      .select('credential_id, transports')
      .eq('user_id', dbUser.id)
      .is('revoked_at', null)

    const excludeCredentials = (existingCreds || []).map((c: any) => ({
      id: c.credential_id,
      transports: c.transports || undefined,
    }))

    // generateRegistrationOptions from @simplewebauthn/server
    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userName: dbUser.email || dbUser.full_name,
      userDisplayName: dbUser.full_name,
      attestationType: 'none',
      excludeCredentials,
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
    })

    const challengeKey = storeWebAuthnChallenge(dbUser.id, options.challenge, 'register')

    return {
      success: true,
      options,
      challengeKey,
    }
  } catch (err: any) {
    if (err?.statusCode) throw err
    console.error('[webauthn/register/options] error:', err?.message || err)
    throw createError({ statusCode: 500, statusMessage: err?.message || 'Gagal menyiapkan pendaftaran biometrik' })
  }
})
