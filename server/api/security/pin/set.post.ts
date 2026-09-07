import { getUserFromToken, getSupabaseAdmin } from '../../../utils/supabaseAdmin'
import {
  hashPin,
  verifyPin,
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
    const { pin, oldPin } = body || {}

    if (!pin || typeof pin !== 'string' || pin.length < 4 || pin.length > 8) {
      throw createError({ statusCode: 400, statusMessage: 'PIN harus berupa 4 hingga 8 digit angka.' })
    }

    // If existing PIN exists, verify oldPin first
    if (dbUser.app_pin_hash) {
      if (!oldPin) {
        throw createError({ statusCode: 400, statusMessage: 'Masukkan PIN lama untuk verifikasi perubahan.' })
      }
      const isOldValid = await verifyPin(oldPin, dbUser.app_pin_hash)
      if (!isOldValid) {
        throw createError({ statusCode: 401, statusMessage: 'PIN lama yang Anda masukkan tidak cocok.' })
      }
    }

    const newHash = await hashPin(pin)

    await admin
      .from('users')
      .update({
        app_pin_hash: newHash,
        updated_at: new Date().toISOString(),
      })
      .eq('id', dbUser.id)

    if (dbUser.household_id) {
      await logSecurityAudit({
        householdId: dbUser.household_id,
        userId: dbUser.id,
        entityType: 'pin',
        entityId: dbUser.id,
        action: 'SECURITY_SETTING_CHANGED',
        metadata: { setting: 'app_pin', updated: true },
      })
    }

    return {
      success: true,
      message: 'PIN keamanan berhasil disimpan',
    }
  } catch (err: any) {
    if (err?.statusCode) throw err
    console.error('[pin/set] error:', err?.message || err)
    throw createError({ statusCode: 500, statusMessage: err?.message || 'Gagal menyimpan PIN' })
  }
})
