import { getSupabaseAdmin, getUserFromToken } from '../../utils/supabaseAdmin'

export default defineEventHandler(async (event) => {
  try {
    const authHeader = getHeader(event, 'Authorization')
    const user = await getUserFromToken(authHeader)

    if (!user) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const body = await readBody(event)
    const { name, motto } = body || {}

    const trimmedName = (name || '').trim()
    if (!trimmedName || trimmedName.length < 3) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Nama keluarga wajib diisi minimal 3 karakter',
      })
    }

    const admin = getSupabaseAdmin()

    // Find current user's profile and household_id
    const { data: profile, error: profileErr } = await admin
      .from('users')
      .select('household_id')
      .eq('auth_user_id', user.id)
      .single()

    if (profileErr || !profile?.household_id) {
      throw createError({ statusCode: 404, statusMessage: 'Profil keluarga tidak ditemukan' })
    }

    // Update household
    const updatePayload: Record<string, any> = {
      name: trimmedName,
      updated_at: new Date().toISOString(),
    }
    if (motto !== undefined) {
      updatePayload.motto = (motto || '').trim()
    }

    const { data: updated, error: updateErr } = await admin
      .from('households')
      .update(updatePayload)
      .eq('id', profile.household_id)
      .select()
      .single()

    if (updateErr) {
      throw createError({ statusCode: 500, statusMessage: updateErr.message })
    }

    return {
      success: true,
      message: 'Detail keluarga berhasil diperbarui',
      household: {
        id: updated.id,
        name: updated.name,
        motto: updated.motto || '',
      },
    }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[couple/household.put] error:', err?.message ?? err)
    throw createError({
      statusCode: 500,
      statusMessage: err?.message ?? 'Gagal memperbarui detail keluarga',
    })
  }
})
