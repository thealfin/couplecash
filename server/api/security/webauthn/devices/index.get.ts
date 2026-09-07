import { getUserFromToken, getSupabaseAdmin } from '../../../../utils/supabaseAdmin'
import { setSensitiveSecurityHeaders } from '../../../../utils/securityConfig'

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
      .select('id, app_pin_hash, biometric_enabled')
      .eq('auth_user_id', user.id)
      .single()

    if (!dbUser) {
      throw createError({ statusCode: 404, statusMessage: 'User profile not found' })
    }

    const { data: records = [] } = await admin
      .from('user_biometric_credentials')
      .select('id, credential_id, device_type, backed_up, created_at, last_used_at, revoked_at')
      .eq('user_id', dbUser.id)
      .order('created_at', { ascending: false })

    const devices = (records || []).map((r: any) => ({
      id: r.id,
      credentialId: r.credential_id ? `${r.credential_id.slice(0, 10)}...` : '',
      deviceType: r.device_type || 'Perangkat Biometrik',
      backedUp: !!r.backed_up,
      createdAt: r.created_at,
      lastUsedAt: r.last_used_at,
      isRevoked: !!r.revoked_at,
      revokedAt: r.revoked_at,
    }))

    return {
      success: true,
      devices,
      pinConfigured: !!dbUser.app_pin_hash,
      biometricEnabled: !!dbUser.biometric_enabled,
    }
  } catch (err: any) {
    if (err?.statusCode) throw err
    console.error('[webauthn/devices.get] error:', err?.message || err)
    throw createError({ statusCode: 500, statusMessage: err?.message || 'Gagal memuat daftar perangkat' })
  }
})
