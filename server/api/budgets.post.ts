import { getSupabaseAdmin } from '../utils/supabaseAdmin'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const {
      name,
      categoryId,
      ownerType = 'bersama',
      periodType = 'bulanan',
      limitAmount,
      periodStart,
      periodEnd,
    } = body

    if (!limitAmount || !periodStart || !periodEnd) {
      throw createError({
        statusCode: 400,
        statusMessage: 'limitAmount, periodStart, and periodEnd are required',
      })
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
      const { data: hh } = await admin.from('households').select('id').limit(1).single()
      householdId = hh?.id ?? null
    }

    if (!householdId) {
      throw createError({ statusCode: 404, statusMessage: 'No household found' })
    }

    // 1. Fetch parent category if categoryId provided
    let parentCat: any = null
    if (categoryId) {
      const { data: cat } = await admin
        .from('categories')
        .select('*')
        .eq('id', categoryId)
        .single()
      parentCat = cat
    }

    const rawBudgetName = name?.trim() || (parentCat ? `Budget ${parentCat.name}` : 'Budget Baru')
    // Format generated category name: e.g. Budget Traveling (Traveling)
    const cleanBudgetName = rawBudgetName.replace(/^budget\s+/i, '').trim()
    const generatedCatName = parentCat 
      ? `Budget ${cleanBudgetName || parentCat.name} (${parentCat.name})`
      : `Budget ${rawBudgetName}`

    // 2. Check or create generated category
    let generatedCategoryId: string | null = null
    const { data: existingCat } = await admin
      .from('categories')
      .select('id')
      .eq('household_id', householdId)
      .eq('type', 'expense')
      .eq('name', generatedCatName)
      .single()

    if (existingCat) {
      generatedCategoryId = existingCat.id
    } else {
      const { data: createdCat, error: catErr } = await admin
        .from('categories')
        .insert({
          household_id: householdId,
          type: 'expense',
          name: generatedCatName,
          icon: parentCat?.icon || 'savings',
          color_token: parentCat?.color_token || null,
          applies_to: ownerType || 'bersama',
          is_default: false,
          is_active: true,
        })
        .select('id')
        .single()

      if (!catErr && createdCat) {
        generatedCategoryId = createdCat.id
      }
    }

    // 3. Insert new budget via Supabase REST
    const { data: newBudget, error } = await admin
      .from('budgets')
      .insert({
        household_id: householdId,
        name: rawBudgetName,
        category_id: categoryId || null,
        generated_category_id: generatedCategoryId,
        owner_type: ownerType,
        period_type: periodType,
        limit_amount: String(limitAmount),
        period_start: periodStart,
        period_end: periodEnd,
        is_active: true,
      })
      .select('*, category:categories!budgets_category_id_fkey(id, name, icon), generatedCategory:categories!budgets_generated_category_id_fkey(id, name, icon)')
      .single()

    if (error) {
      // Fallback select if foreign key alias differs
      const { data: simpleBudget, error: simpleErr } = await admin
        .from('budgets')
        .select('*')
        .eq('household_id', householdId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      if (simpleErr) {
        throw createError({ statusCode: 500, statusMessage: error.message })
      }
      return { success: true, budget: simpleBudget }
    }

    return { success: true, budget: newBudget }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[budgets.post] error:', err?.message ?? err)
    throw createError({ statusCode: 500, statusMessage: err?.message ?? 'Internal server error' })
  }
})
