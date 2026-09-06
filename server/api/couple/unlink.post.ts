import { getSupabaseAdmin, getUserFromToken } from '../../utils/supabaseAdmin'
import crypto from 'node:crypto'

export default defineEventHandler(async (event) => {
  try {
    const authHeader = getHeader(event, 'Authorization')
    const user = await getUserFromToken(authHeader)

    if (!user) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const admin = getSupabaseAdmin()

    // 1. Get current user's profile and household
    const { data: currentProfile, error: profileErr } = await admin
      .from('users')
      .select('id, household_id, role, full_name')
      .eq('auth_user_id', user.id)
      .single()

    if (profileErr || !currentProfile?.household_id) {
      throw createError({ statusCode: 404, statusMessage: 'Profil pengguna tidak ditemukan' })
    }

    // 2. Find partner in the same household
    const { data: members, error: membersErr } = await admin
      .from('users')
      .select('id, role, full_name, auth_user_id')
      .eq('household_id', currentProfile.household_id)

    if (membersErr) {
      throw createError({ statusCode: 500, statusMessage: 'Gagal mencari anggota keluarga' })
    }

    const partner = (members || []).find((m: any) => m.id !== currentProfile.id)

    if (!partner) {
      throw createError({ statusCode: 400, statusMessage: 'Tidak ada pasangan yang terhubung dalam household ini' })
    }

    // 3. Create a new single household for the partner so they keep their own account and space
    const randomCode = crypto.randomBytes(4).toString('hex')
    const { data: newHousehold, error: newHhErr } = await admin
      .from('households')
      .insert({
        name: `Keluarga ${partner.full_name.split(' ')[0]}`,
        invite_code: randomCode,
      })
      .select()
      .single()

    if (newHhErr) {
      throw createError({ statusCode: 500, statusMessage: 'Gagal membuat household baru untuk pasangan' })
    }

    // 4. Move partner to their new independent household
    // This detaches the partner from current household, while keeping current user in current household
    // Data aset, transaksi individual, dan riwayat masing-masing tetap terjaga utuh!
    const { error: moveErr } = await admin
      .from('users')
      .update({ household_id: newHousehold.id })
      .eq('id', partner.id)

    if (moveErr) {
      throw createError({ statusCode: 500, statusMessage: 'Gagal melepaskan pasangan dari household' })
    }

    // 5. Transfer partner's strictly individual accounts to their new household so they retain full control
    await admin
      .from('financial_accounts')
      .update({ household_id: newHousehold.id })
      .eq('household_id', currentProfile.household_id)
      .eq('owner_type', partner.role)
      .catch((e: any) => console.warn('[unlink] Warning moving partner individual accounts:', e))

    // 6. Transfer partner's individual transactions
    await admin
      .from('transactions')
      .update({ household_id: newHousehold.id })
      .eq('household_id', currentProfile.household_id)
      .eq('owner_type', partner.role)
      .catch((e: any) => console.warn('[unlink] Warning moving partner individual transactions:', e))

    return {
      success: true,
      message: 'Hubungan dengan pasangan berhasil diputuskan. Data pribadi tetap aman terjaga.',
      partnerName: partner.full_name,
    }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[couple/unlink.post] error:', err?.message ?? err)
    throw createError({
      statusCode: 500,
      statusMessage: err?.message ?? 'Gagal memutuskan hubungan',
    })
  }
})
