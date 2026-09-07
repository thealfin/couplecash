import { getSupabaseAdmin } from '../utils/supabaseAdmin'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { name, type = 'expense', icon = 'category', appliesTo = 'bersama', description } = body

    if (!name) {
      throw createError({ statusCode: 400, statusMessage: 'Nama kategori wajib diisi' })
    }

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

    if (!householdId) {
      throw createError({ statusCode: 404, statusMessage: 'Household not found' })
    }

    const { data: newCat, error: catErr } = await admin
      .from('categories')
      .insert({
        household_id: householdId,
        name,
        type,
        icon,
        applies_to: appliesTo,
        is_default: false,
      })
      .select('*')
      .single()

    if (catErr) {
      console.error('[categories.post] error:', catErr)
      throw createError({ statusCode: 500, statusMessage: catErr.message })
    }

    return { success: true, category: newCat }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[categories.post] error:', err?.message ?? err)
    throw createError({ statusCode: 500, statusMessage: err?.message ?? 'Internal server error' })
  }
})
