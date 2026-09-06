import { getSupabaseAdmin, getUserFromToken } from '../../utils/supabaseAdmin'

export default defineEventHandler(async (event) => {
  try {
    const authHeader = getHeader(event, 'Authorization')
    const user = await getUserFromToken(authHeader)

    if (!user) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const body = await readBody(event)
    const { code } = body || {}

    if (!code || typeof code !== 'string' || code.trim().length < 6) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Kode undangan harus terdiri dari 6 digit angka',
      })
    }

    const cleanCode = code.trim()
    const admin = getSupabaseAdmin()

    // 1. Get current user's profile
    const { data: currentProfile, error: profErr } = await admin
      .from('users')
      .select('id, household_id, role, full_name')
      .eq('auth_user_id', user.id)
      .single()

    if (profErr || !currentProfile) {
      throw createError({ statusCode: 404, statusMessage: 'Profil pengguna tidak ditemukan' })
    }

    // 2. Find target household by invite_code
    const { data: targetHousehold, error: hhErr } = await admin
      .from('households')
      .select('id, name')
      .eq('invite_code', cleanCode)
      .single()

    if (hhErr || !targetHousehold) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Kode undangan tidak ditemukan atau sudah kedaluwarsa',
      })
    }

    // Check if target household is the same
    if (targetHousehold.id === currentProfile.household_id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Anda tidak dapat memasukkan kode undangan keluarga Anda sendiri',
      })
    }

    // 3. Check members in target household
    const { data: targetMembers, error: membersErr } = await admin
      .from('users')
      .select('id, role, full_name')
      .eq('household_id', targetHousehold.id)

    if (membersErr) {
      throw createError({ statusCode: 500, statusMessage: 'Gagal memeriksa anggota keluarga target' })
    }

    if (targetMembers && targetMembers.length >= 2) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Keluarga tersebut sudah memiliki pasangan yang lengkap',
      })
    }

    const existingPartner = targetMembers?.[0]
    const oldHouseholdId = currentProfile.household_id

    // 4. Reconcile role if conflicting
    let assignedRole = currentProfile.role || 'istri'
    if (existingPartner && existingPartner.role === currentProfile.role) {
      assignedRole = currentProfile.role === 'suami' ? 'istri' : 'suami'
    }

    // 5. Update user to join target household
    const { error: updateErr } = await admin
      .from('users')
      .update({
        household_id: targetHousehold.id,
        role: assignedRole,
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentProfile.id)

    if (updateErr) {
      console.error('[verify-code] update user error:', updateErr)
      throw createError({ statusCode: 500, statusMessage: 'Gagal menghubungkan ke keluarga target' })
    }

    // 6. Migrate current user's accounts, transactions, and budgets to target household
    if (oldHouseholdId) {
      await admin
        .from('financial_accounts')
        .update({ household_id: targetHousehold.id })
        .eq('household_id', oldHouseholdId)
        .catch((e: any) => console.warn('[verify-code] move accounts error:', e))

      await admin
        .from('transactions')
        .update({ household_id: targetHousehold.id })
        .eq('household_id', oldHouseholdId)
        .catch((e: any) => console.warn('[verify-code] move transactions error:', e))

      await admin
        .from('budgets')
        .update({ household_id: targetHousehold.id })
        .eq('household_id', oldHouseholdId)
        .catch((e: any) => console.warn('[verify-code] move budgets error:', e))

      // 7. Clean up orphan starter household if empty
      const { data: remainingUsers } = await admin
        .from('users')
        .select('id')
        .eq('household_id', oldHouseholdId)

      if (!remainingUsers || remainingUsers.length === 0) {
        await admin
          .from('households')
          .delete()
          .eq('id', oldHouseholdId)
          .catch((e: any) => console.warn('[verify-code] delete old household error:', e))
      }
    }

    // 8. Update target household name to combined name
    if (existingPartner) {
      const p1 = existingPartner.full_name.split(' ')[0]
      const p2 = currentProfile.full_name.split(' ')[0]
      const combinedName = `Keluarga ${p1} & ${p2}`

      await admin
        .from('households')
        .update({
          name: combinedName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', targetHousehold.id)
        .catch((e: any) => console.warn('[verify-code] update household name error:', e))
    }

    return {
      success: true,
      message: 'Berhasil menghubungkan akun dengan pasangan!',
      partnerName: existingPartner ? existingPartner.full_name : 'Pasangan',
    }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[couple/verify-code.post] error:', err?.message ?? err)
    throw createError({
      statusCode: 500,
      statusMessage: err?.message ?? 'Gagal menghubungkan pasangan',
    })
  }
})
