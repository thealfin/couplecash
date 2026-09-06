import { getSupabaseAdmin, getUserFromToken } from '../../utils/supabaseAdmin'

export default defineEventHandler(async (event) => {
  try {
    const authHeader = getHeader(event, 'Authorization')
    const user = await getUserFromToken(authHeader)

    if (!user) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const admin = getSupabaseAdmin()

    // 1. Get user profile
    const { data: profile, error: profErr } = await admin
      .from('users')
      .select('id, household_id, full_name')
      .eq('auth_user_id', user.id)
      .single()

    if (profErr || !profile?.household_id) {
      throw createError({ statusCode: 404, statusMessage: 'Profil household tidak ditemukan' })
    }

    // 2. Generate clean 6-digit numeric code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString()

    // 3. Update household's invite_code
    const { error: updErr } = await admin
      .from('households')
      .update({
        invite_code: otpCode,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.household_id)

    if (updErr) {
      console.error('[generate-code] update error:', updErr)
      throw createError({ statusCode: 500, statusMessage: 'Gagal memperbarui kode undangan' })
    }

    return {
      success: true,
      code: otpCode,
      expiresInMinutes: 60,
    }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[generate-code.post] error:', err?.message ?? err)
    throw createError({ statusCode: 500, statusMessage: err?.message ?? 'Gagal membuat kode undangan' })
  }
})
