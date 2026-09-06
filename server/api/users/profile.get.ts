import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  try {
    const authHeader = getHeader(event, 'Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const token = authHeader.split(' ')[1]

    const supabaseUrl = process.env.SUPABASE_URL || 'https://fjgiolmwwpgxesbikjnp.supabase.co'
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqZ2lvbG13d3BneGVzYmlram5wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODE0NzA0NCwiZXhwIjoyMTAzNzIzMDQ0fQ.ePKqWgCO6IMgv4mZn7MFeBswa4c8yajy2QxL0fc5Dpw'

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)

    if (error || !user) {
      throw createError({ statusCode: 401, statusMessage: 'Invalid token' })
    }

    // Get current user profile via Supabase REST API
    const { data: currentUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('*, household:households(*)')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !currentUser || !currentUser.household) {
      throw createError({ statusCode: 404, statusMessage: 'User profile not found' })
    }

    // Get all members in the household
    const { data: members } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('household_id', currentUser.household_id)

    const membersList = members || []
    const suami = membersList.find((m: any) => m.role === 'suami')
    const istri = membersList.find((m: any) => m.role === 'istri')

    return {
      success: true,
      user: {
        id: currentUser.id,
        authUserId: currentUser.auth_user_id,
        email: currentUser.email,
        fullName: currentUser.full_name,
        role: currentUser.role,
        avatarInitial: (currentUser.full_name || 'U').charAt(0).toUpperCase(),
      },
      household: {
        id: currentUser.household.id,
        name: currentUser.household.name,
        motto: currentUser.household.motto || '',
        inviteCode: currentUser.household.invite_code,
        createdAt: currentUser.household.created_at,
        partnerStatus: (suami && istri) ? 'connected' : 'single',
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
