import { getSupabaseAdmin, getUserFromToken } from '../../utils/supabaseAdmin'

export default defineEventHandler(async (event) => {
  try {
    const authHeader = getHeader(event, 'Authorization')
    const user = await getUserFromToken(authHeader)

    if (!user) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const body = await readBody(event).catch(() => ({}))
    const { deviceId, deviceName = 'Browser Web', action = 'claim' } = body || {}

    if (!deviceId) {
      throw createError({ statusCode: 400, statusMessage: 'Device ID is required' })
    }

    const admin = getSupabaseAdmin()

    // 1. Get current user's active device info
    const { data: profile, error: profErr } = await admin
      .from('users')
      .select('id, active_device_id, active_device_name, last_active_at')
      .eq('auth_user_id', user.id)
      .single()

    if (profErr || !profile) {
      throw createError({ statusCode: 404, statusMessage: 'Profil pengguna tidak ditemukan' })
    }

    const now = new Date().toISOString()

    if (action === 'claim') {
      // Register current device as the single active device (takes over session)
      const { error: updErr } = await admin
        .from('users')
        .update({
          active_device_id: deviceId,
          active_device_name: deviceName,
          last_active_at: now,
          updated_at: now,
        })
        .eq('id', profile.id)

      if (updErr) {
        console.error('[session-lock] claim error:', updErr)
        throw createError({ statusCode: 500, statusMessage: 'Gagal mendaftarkan sesi perangkat' })
      }

      return {
        success: true,
        message: 'Sesi perangkat berhasil diaktifkan',
        deviceId,
      }
    }

    if (action === 'heartbeat') {
      // Check if this device is still the active device
      if (profile.active_device_id && profile.active_device_id !== deviceId) {
        // Another device logged in and took over!
        return {
          success: false,
          kicked: true,
          message: `Sesi Anda telah berakhir karena akun ini sedang aktif di perangkat lain (${profile.active_device_name || 'perangkat lain'}). Silakan masuk menggunakan akun/user lain.`,
        }
      }

      // Update heartbeat timestamp
      await admin
        .from('users')
        .update({
          active_device_id: deviceId,
          active_device_name: deviceName,
          last_active_at: now,
        })
        .eq('id', profile.id)

      return {
        success: true,
        kicked: false,
      }
    }

    if (action === 'release') {
      // Only clear if the calling device is currently the registered active device
      if (profile.active_device_id === deviceId) {
        await admin
          .from('users')
          .update({
            active_device_id: null,
            active_device_name: null,
            last_active_at: null,
          })
          .eq('id', profile.id)
      }

      return {
        success: true,
        message: 'Sesi perangkat berhasil dilepas',
      }
    }

    throw createError({ statusCode: 400, statusMessage: 'Aksi session-lock tidak valid' })
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[session-lock.post] error:', err?.message ?? err)
    throw createError({ statusCode: 500, statusMessage: err?.message ?? 'Internal server error' })
  }
})
