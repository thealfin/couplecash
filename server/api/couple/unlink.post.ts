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

    const householdId = currentProfile.household_id

    // 2. Find partner in the same household
    const { data: members, error: membersErr } = await admin
      .from('users')
      .select('id, role, full_name, auth_user_id')
      .eq('household_id', householdId)

    if (membersErr) {
      throw createError({ statusCode: 500, statusMessage: 'Gagal mencari anggota keluarga' })
    }

    const partner = (members || []).find((m: any) => m.id !== currentProfile.id)

    if (!partner) {
      throw createError({ statusCode: 400, statusMessage: 'Tidak ada pasangan yang terhubung dalam household ini' })
    }

    const body = await readBody(event).catch(() => ({}))
    const { force = false } = body

    // 3. Check for shared accounts & shared goals (Section Y)
    const [
      { count: sharedAccountsCount },
      { count: sharedGoalsCount },
    ] = await Promise.all([
      admin
        .from('financial_accounts')
        .select('*', { count: 'exact', head: true })
        .eq('household_id', householdId)
        .eq('owner_type', 'bersama')
        .eq('is_deleted', false)
        .neq('account_type', 'debt')
        .not('name', 'like', 'Goals (%'),
      admin
        .from('goals')
        .select('*', { count: 'exact', head: true })
        .eq('household_id', householdId)
        .eq('owner_type', 'bersama')
        .eq('status', 'active')
        .eq('is_deleted', false),
    ])

    const totalShared = (sharedAccountsCount || 0) + (sharedGoalsCount || 0)

    if (totalShared > 0 && !force) {
      // Require settlement via Harta Bersama
      return {
        success: false,
        requireSettlement: true,
        sharedCount: totalShared,
        sharedAccountsCount: sharedAccountsCount || 0,
        sharedGoalsCount: sharedGoalsCount || 0,
        message: 'Keluarga Anda memiliki Pos Akun atau Goals bersama. Silakan gunakan menu Harta Bersama untuk menyelesaikan pembagian secara adil.',
      }
    }

    // 4. Create a new single household for the partner
    const randomCode = crypto.randomBytes(4).toString('hex')
    const { data: newHousehold, error: newHhErr } = await admin
      .from('households')
      .insert({
        name: `Keluarga ${partner.full_name.split(' ')[0]}`,
        invite_code: randomCode,
      })
      .select()
      .single()

    if (newHhErr || !newHousehold) {
      throw createError({ statusCode: 500, statusMessage: 'Gagal membuat household baru untuk pasangan' })
    }

    // 5. Move partner to new household and reset both roles to 'single'
    await admin
      .from('users')
      .update({
        household_id: newHousehold.id,
        role: 'single',
        updated_at: new Date().toISOString(),
      })
      .eq('id', partner.id)

    await admin
      .from('users')
      .update({
        role: 'single',
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentProfile.id)

    await admin
      .from('households')
      .update({
        name: `Keluarga ${currentProfile.full_name.split(' ')[0]}`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', householdId)

    // 6. Strict Data Separation: Transfer partner's personal elements to newHousehold & transition to 'sendiri'
    const partnerRole = partner.role
    const currentRole = currentProfile.role

    if (partnerRole) {
      // Transfer partner's personal financial accounts & set to 'sendiri'
      await admin
        .from('financial_accounts')
        .update({ household_id: newHousehold.id, owner_type: 'sendiri', updated_at: new Date().toISOString() })
        .eq('household_id', householdId)
        .eq('owner_type', partnerRole)

      // Transfer partner's personal budgets
      await admin
        .from('budgets')
        .update({ household_id: newHousehold.id, owner_type: 'sendiri', updated_at: new Date().toISOString() })
        .eq('household_id', householdId)
        .eq('owner_type', partnerRole)

      // Transfer partner's personal categories
      await admin
        .from('categories')
        .update({ household_id: newHousehold.id, applies_to: 'sendiri' })
        .eq('household_id', householdId)
        .eq('applies_to', partnerRole)

      // Transfer partner's personal bills & set to 'sendiri'
      await admin
        .from('bills')
        .update({ household_id: newHousehold.id, owner_type: 'sendiri', updated_at: new Date().toISOString() })
        .eq('household_id', householdId)
        .eq('owner_type', partnerRole)
    }

    // Transfer partner's personal goals (created by partner with 0 partner 1 contribution)
    await admin
      .from('goals')
      .update({ household_id: newHousehold.id, updated_at: new Date().toISOString() })
      .eq('household_id', householdId)
      .eq('created_by_user_id', partner.id)

    // Transfer partner's historical transactions, backup previous role, and set active owner_type to 'sendiri'
    await admin
      .from('transactions')
      .update({
        household_id: newHousehold.id,
        previous_role: partnerRole || 'istri',
        owner_type: 'sendiri',
        updated_at: new Date().toISOString(),
      })
      .eq('household_id', householdId)
      .eq('recorded_by_user_id', partner.id)

    // Also transition current user's personal items to 'sendiri' in current household
    if (currentRole) {
      await admin
        .from('financial_accounts')
        .update({ owner_type: 'sendiri', updated_at: new Date().toISOString() })
        .eq('household_id', householdId)
        .eq('owner_type', currentRole)

      await admin
        .from('budgets')
        .update({ owner_type: 'sendiri', updated_at: new Date().toISOString() })
        .eq('household_id', householdId)
        .eq('owner_type', currentRole)

      await admin
        .from('categories')
        .update({ applies_to: 'sendiri' })
        .eq('household_id', householdId)
        .eq('applies_to', currentRole)

      await admin
        .from('bills')
        .update({ owner_type: 'sendiri', updated_at: new Date().toISOString() })
        .eq('household_id', householdId)
        .eq('owner_type', currentRole)

      await admin
        .from('transactions')
        .update({
          previous_role: currentRole,
          owner_type: 'sendiri',
          updated_at: new Date().toISOString(),
        })
        .eq('household_id', householdId)
        .eq('recorded_by_user_id', currentProfile.id)
    }

    // Duplicate shared default categories to newHousehold so partner has independent categories
    const { data: sharedCats = [] } = await admin
      .from('categories')
      .select('type, name, icon, color_token, is_default')
      .eq('household_id', householdId)
      .eq('applies_to', 'bersama')
      .eq('is_deleted', false)

    if (sharedCats.length > 0) {
      await admin.from('categories').insert(
        sharedCats.map((c: any) => ({
          ...c,
          household_id: newHousehold.id,
          applies_to: 'bersama',
        }))
      )
    }

    return {
      success: true,
      message: 'Hubungan dengan pasangan berhasil diputuskan. Data pribadi masing-masing tetap aman terjaga.',
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
