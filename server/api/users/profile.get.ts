import { getSupabaseAdmin, getUserFromToken } from '../../utils/supabaseAdmin'

export default defineEventHandler(async (event) => {
  try {
    const authHeader = getHeader(event, 'Authorization')
    const user = await getUserFromToken(authHeader)

    if (!user) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const admin = getSupabaseAdmin()

    // Get current user profile
    let { data: currentUser, error: userError } = await admin
      .from('users')
      .select('*, household:households(*)')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !currentUser) {
      throw createError({ statusCode: 404, statusMessage: 'User profile not found' })
    }

    // Auto-heal missing household if user has no household or household was deleted
    if (!currentUser.household_id || !currentUser.household) {
      const invite = Math.floor(100000 + Math.random() * 900000).toString()
      const { data: newHh, error: hhErr } = await admin
        .from('households')
        .insert({
          name: `Keluarga ${currentUser.full_name?.split(' ')[0] || 'Saya'}`,
          invite_code: invite,
        })
        .select()
        .single()

      if (!hhErr && newHh) {
        await admin
          .from('users')
          .update({
            household_id: newHh.id,
            role: currentUser.role || 'single',
            updated_at: new Date().toISOString(),
          })
          .eq('id', currentUser.id)

        currentUser.household_id = newHh.id
        currentUser.household = newHh
      }
    }

    // Get all members in the household
    const { data: members } = await admin
      .from('users')
      .select('*')
      .eq('household_id', currentUser.household_id)

    const membersList = members || []
    const suami = membersList.find((m: any) => m.role === 'suami')
    const istri = membersList.find((m: any) => m.role === 'istri')
    const hasBothRoles = !!(suami && istri)

    return {
      success: true,
      user: {
        id: currentUser.id,
        authUserId: currentUser.auth_user_id,
        email: currentUser.email,
        fullName: currentUser.full_name,
        role: currentUser.role || 'single',
        avatarInitial: (currentUser.full_name || 'U').charAt(0).toUpperCase(),
        activeDeviceId: currentUser.active_device_id || null,
        activeDeviceName: currentUser.active_device_name || null,
        lastActiveAt: currentUser.last_active_at || null,
      },
      household: {
        id: currentUser.household.id,
        name: currentUser.household.name,
        motto: currentUser.household.motto || '',
        inviteCode: currentUser.household.invite_code,
        createdAt: currentUser.household.created_at,
        partnerStatus: hasBothRoles ? 'connected' : 'single',
        suami: suami ? {
          id: suami.id,
          fullName: suami.full_name,
          firstName: suami.full_name.split(' ')[0],
          initial: suami.full_name.charAt(0).toUpperCase(),
          email: suami.email,
          role: 'suami',
        } : null,
        istri: istri ? {
          id: istri.id,
          fullName: istri.full_name,
          firstName: istri.full_name.split(' ')[0],
          initial: istri.full_name.charAt(0).toUpperCase(),
          email: istri.email,
          role: 'istri',
        } : null,
      }
    }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[profile.get] error:', err?.message ?? err)
    throw createError({ statusCode: 500, statusMessage: err?.message ?? 'Internal server error' })
  }
})
