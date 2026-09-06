import { getSupabaseAdmin } from '../../utils/supabaseAdmin'

export default defineEventHandler(async (event) => {
  try {
    const admin = getSupabaseAdmin()

    let householdId: string | null = null
    const authHeader = getHeader(event, 'Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      const { data: { user } } = await admin.auth.getUser(token)
      if (user) {
        const { data: profile } = await admin.from('users').select('household_id').eq('auth_user_id', user.id).single()
        householdId = profile?.household_id ?? null
      }
    }
    if (!householdId) {
      const { data: hh } = await admin.from('households').select('id').limit(1).single()
      householdId = hh?.id ?? null
    }

    const { data: members = [] } = await admin
      .from('users')
      .select('id, full_name, role, email')
      .eq('household_id', householdId)

    const suami = (members ?? []).find((u: any) => u.role === 'suami')
    const istri = (members ?? []).find((u: any) => u.role === 'istri')

    return {
      suami: {
        id: suami?.id ?? null,
        fullName: suami?.full_name ?? 'Suami',
        firstName: suami?.full_name?.split(' ')[0] ?? 'Suami',
        initial: suami?.full_name?.charAt(0)?.toUpperCase() ?? 'S',
      },
      istri: {
        id: istri?.id ?? null,
        fullName: istri?.full_name ?? 'Istri',
        firstName: istri?.full_name?.split(' ')[0] ?? 'Istri',
        initial: istri?.full_name?.charAt(0)?.toUpperCase() ?? 'I',
      },
    }
  } catch (err: any) {
    console.error('[users/couple.get] error:', err?.message ?? err)
    throw createError({ statusCode: 500, statusMessage: err?.message ?? 'Internal server error' })
  }
})
