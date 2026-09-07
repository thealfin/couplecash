import { getSupabaseAdmin, getUserFromToken } from '../../utils/supabaseAdmin'

export default defineEventHandler(async (event) => {
  try {
    const authHeader = getHeader(event, 'Authorization')
    const user = await getUserFromToken(authHeader)

    if (!user) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const body = await readBody(event)
    const { code, myRole } = body || {}

    if (!code || typeof code !== 'string' || code.trim().length < 6) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Kode undangan harus terdiri dari 6 digit angka',
      })
    }

    if (myRole && myRole !== 'suami' && myRole !== 'istri') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Peran harus dipilih antara Suami atau Istri',
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

    // Check if target household is the same as current user's household
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

    // 4. Role Assignment & Collision Rule
    // "jadikan gagal jika 2 user memilih 1 role yang sama"
    let chosenUserRole = myRole || currentProfile.role || 'suami'
    let partnerNewRole = existingPartner?.role

    if (existingPartner) {
      // If partner already has a definitive role (suami or istri)
      if (existingPartner.role === 'suami' || existingPartner.role === 'istri') {
        if (chosenUserRole === existingPartner.role) {
          const partnerRoleLabel = existingPartner.role === 'suami' ? 'Suami' : 'Istri'
          const requiredRoleLabel = existingPartner.role === 'suami' ? 'Istri' : 'Suami'
          throw createError({
            statusCode: 400,
            statusMessage: `Role tidak boleh sama! Pasangan Anda terdaftar sebagai ${partnerRoleLabel}. Anda harus memilih peran ${requiredRoleLabel}.`,
          })
        }
      } else {
        // Partner is currently 'single' -> partner gets opposite of chosenUserRole
        partnerNewRole = chosenUserRole === 'suami' ? 'istri' : 'suami'
        const { error: partnerUpdErr } = await admin
          .from('users')
          .update({
            role: partnerNewRole,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingPartner.id)

        if (partnerUpdErr) {
          console.error('[verify-code] update partner role error:', partnerUpdErr)
        }
      }
    }

    // 5. Update user to join target household with chosen role
    const { error: updateErr } = await admin
      .from('users')
      .update({
        household_id: targetHousehold.id,
        role: chosenUserRole,
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentProfile.id)

    if (updateErr) {
      console.error('[verify-code] update user error:', updateErr)
      throw createError({ statusCode: 500, statusMessage: 'Gagal menghubungkan ke keluarga target: ' + updateErr.message })
    }

    // 6. Migrate current user's accounts, transactions, budgets, categories, goals, bills
    if (oldHouseholdId) {
      const { error: accErr } = await admin
        .from('financial_accounts')
        .update({ household_id: targetHousehold.id })
        .eq('household_id', oldHouseholdId)
      if (accErr) console.warn('[verify-code] move accounts error:', accErr)

      const { error: txErr } = await admin
        .from('transactions')
        .update({ household_id: targetHousehold.id })
        .eq('household_id', oldHouseholdId)
      if (txErr) console.warn('[verify-code] move transactions error:', txErr)

      const { error: bgErr } = await admin
        .from('budgets')
        .update({ household_id: targetHousehold.id })
        .eq('household_id', oldHouseholdId)
      if (bgErr) console.warn('[verify-code] move budgets error:', bgErr)

      const { error: catErr } = await admin
        .from('categories')
        .update({ household_id: targetHousehold.id })
        .eq('household_id', oldHouseholdId)
      if (catErr) console.warn('[verify-code] move categories error:', catErr)

      const { error: goalErr } = await admin
        .from('goals')
        .update({ household_id: targetHousehold.id })
        .eq('household_id', oldHouseholdId)
      if (goalErr) console.warn('[verify-code] move goals error:', goalErr)

      const { error: billErr } = await admin
        .from('bills')
        .update({ household_id: targetHousehold.id })
        .eq('household_id', oldHouseholdId)
      if (billErr) console.warn('[verify-code] move bills error:', billErr)

      // 7. Clean up orphan starter household if empty
      const { data: remainingUsers } = await admin
        .from('users')
        .select('id')
        .eq('household_id', oldHouseholdId)

      if (!remainingUsers || remainingUsers.length === 0) {
        const { error: delHhErr } = await admin
          .from('households')
          .delete()
          .eq('id', oldHouseholdId)
        if (delHhErr) console.warn('[verify-code] delete old household error:', delHhErr)
      }
    }

    // 8. Update target household name to combined name
    if (existingPartner) {
      const p1 = existingPartner.full_name.split(' ')[0]
      const p2 = currentProfile.full_name.split(' ')[0]
      const combinedName = `Keluarga ${p1} & ${p2}`

      const { error: nameErr } = await admin
        .from('households')
        .update({
          name: combinedName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', targetHousehold.id)
      if (nameErr) console.warn('[verify-code] update household name error:', nameErr)
    }

    return {
      success: true,
      message: 'Berhasil menghubungkan akun dengan pasangan!',
      partnerName: existingPartner ? existingPartner.full_name : 'Pasangan',
      myRole: chosenUserRole,
      partnerRole: partnerNewRole || existingPartner?.role,
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
