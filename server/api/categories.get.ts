import { getSupabaseAdmin } from '../utils/supabaseAdmin'

export default defineEventHandler(async (event) => {
  try {
    const authHeader = getHeader(event, 'Authorization')
    const admin = getSupabaseAdmin()

    let householdId: string | null = null
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      const { data: { user } } = await admin.auth.getUser(token)
      if (user) {
        const { data: profile } = await admin.from('users').select('household_id').eq('auth_user_id', user.id).single()
        householdId = profile?.household_id ?? null
      }
    }
    if (!householdId) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const query = getQuery(event)
    let q = admin
      .from('categories')
      .select('*')
      .eq('is_deleted', false)
      .eq('household_id', householdId)

    if (query.onlyActive === 'true') {
      q = q.eq('is_active', true)
    }

    const { data: categories = [], error } = await q
      .order('type')
      .order('name')

    if (error) {
      throw error
    }

    return {
      success: true,
      categories: (categories ?? []).map((c: any) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        icon: c.icon || 'category',
        colorToken: c.color_token,
        appliesTo: c.applies_to,
        isDefault: c.is_default,
        isActive: c.is_active !== false,
      })),
    }
  } catch (err: any) {
    console.error('[categories.get] error:', err?.message ?? err)
    throw createError({ statusCode: 500, statusMessage: err?.message ?? 'Internal server error' })
  }
})
