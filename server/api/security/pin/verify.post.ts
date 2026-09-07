import { getUserFromToken, getSupabaseAdmin } from '../../../utils/supabaseAdmin'
import {
  verifyPin,
  issueVaultAuthToken,
  setSensitiveSecurityHeaders,
  logSecurityAudit,
} from '../../../utils/securityConfig'

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
      .select('id, household_id, app_pin_hash')
      .eq('auth_user_id', user.id)
      .single()

    if (!dbUser) {
      throw createError({ statusCode: 404, statusMessage: 'User profile not found' })
    }

    const body = await readBody(event)
    const { pin } = body || {}

    if (!pin) {
      throw createError({ statusCode: 400, statusMessage: 'PIN harus diisi' })
    }

    if (!dbUser.app_pin_hash) {
      return {
        success: false,
        pinNotSet: true,
        message: 'PIN aplikasi belum pernah diatur. Silakan buat PIN terlebih dahulu di Pengaturan Keamanan.',
      }
    }

    const isValid = await verifyPin(String(pin), dbUser.app_pin_hash)

    if (!isValid) {
      if (dbUser.household_id) {
        await logSecurityAudit({
          householdId: dbUser.household_id,
          userId: dbUser.id,
          entityType: 'pin',
          entityId: dbUser.id,
          action: 'PIN_UNLOCKED',
          metadata: { success: false, reason: 'invalid_pin' },
        })
      }
      throw createError({ statusCode: 401, statusMessage: 'PIN yang Anda masukkan salah. Coba lagi.' })
    }

    const vaultAuthToken = issueVaultAuthToken(dbUser.id, dbUser.household_id || '', 'pin')

    if (dbUser.household_id) {
      await logSecurityAudit({
        householdId: dbUser.household_id,
        userId: dbUser.id,
        entityType: 'pin',
        entityId: dbUser.id,
        action: 'PIN_UNLOCKED',
        metadata: { success: true },
      })
    }

    return {
      success: true,
      message: 'PIN valid',
      vaultAuthToken,
      expiresAt: Date.now() + 5 * 60 * 1000,
      method: 'pin',
    }
  } catch (err: any) {
    if (err?.statusCode) throw err
    console.error('[pin/verify] error:', err?.message || err)
    throw createError({ statusCode: 500, statusMessage: err?.message || 'Gagal memverifikasi PIN' })
  }
})
