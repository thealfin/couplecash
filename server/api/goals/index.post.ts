import { getSupabaseAdmin } from '../../utils/supabaseAdmin'

export default defineEventHandler(async (event) => {
  try {
    const authHeader = getHeader(event, 'Authorization')
    const cookieToken = getCookie(event, 'couplecash-token')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : cookieToken

    const admin = getSupabaseAdmin()

    let householdId: string | null = null
    let userId: string | null = null

    if (token) {
      const { data: { user } } = await admin.auth.getUser(token)
      if (user) {
        const { data: profile } = await admin.from('users').select('id, household_id').eq('auth_user_id', user.id).single()
        householdId = profile?.household_id ?? null
        userId = profile?.id ?? null
      }
    }

    if (!householdId || !userId) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const body = await readBody(event)
    const {
      name,
      targetDate,
      targetAmount,
      partner1Contribution = 0,
      partner2Contribution = 0,
      sourceAccountId = null,
      categoryId = null,
      icon = '🎯',
      description = '',
    } = body

    if (!name?.trim()) {
      throw createError({ statusCode: 400, statusMessage: 'Nama Goals wajib diisi' })
    }
    const numericTarget = Number(targetAmount)
    if (!numericTarget || numericTarget <= 0) {
      throw createError({ statusCode: 400, statusMessage: 'Nominal target harus lebih dari 0' })
    }
    if (!targetDate) {
      throw createError({ statusCode: 400, statusMessage: 'Tanggal target harus ditentukan' })
    }

    // Check user profile & household partner status
    const { data: userProfile } = await admin.from('users').select('id, role').eq('id', userId).single()
    const userRole = userProfile?.role || 'suami'

    const { data: members = [] } = await admin.from('users').select('id, role').eq('household_id', householdId)
    const hasPartner = (members ?? []).some((m: any) => m.role === 'suami') && (members ?? []).some((m: any) => m.role === 'istri')

    let p1 = 0
    let p2: number | null = hasPartner ? 0 : null

    // Determine initial contribution based on active user's role authority
    let initialContribution = 0
    if (hasPartner) {
      if (userRole === 'suami') {
        p1 = Math.max(0, Number(partner1Contribution) || 0)
        p2 = 0
        initialContribution = p1
      } else {
        p1 = 0
        p2 = Math.max(0, Number(partner2Contribution) || 0)
        initialContribution = p2
      }
    } else {
      p1 = Math.max(0, Number(partner1Contribution) || 0)
      p2 = null
      initialContribution = p1
    }

    // Validate source account if initial contribution > 0
    let validatedSourceAcc: any = null
    if (initialContribution > 0) {
      if (!sourceAccountId) {
        throw createError({ statusCode: 400, statusMessage: 'Pilih pos akun asal untuk memotong nominal kontribusi' })
      }
      const { data: srcAcc, error: srcErr } = await admin
        .from('financial_accounts')
        .select('*')
        .eq('id', sourceAccountId)
        .eq('household_id', householdId)
        .eq('is_deleted', false)
        .single()

      if (srcErr || !srcAcc) {
        throw createError({ statusCode: 404, statusMessage: 'Pos akun asal tidak ditemukan' })
      }

      // Role check: user can only deduct from their own account or 'bersama'
      if (srcAcc.owner_type && srcAcc.owner_type !== 'bersama' && srcAcc.owner_type !== userRole) {
        throw createError({
          statusCode: 403,
          statusMessage: `Anda tidak berhak menggunakan pos akun milik ${srcAcc.owner_type === 'suami' ? 'Suami' : 'Istri'}`,
        })
      }
      validatedSourceAcc = srcAcc
    }

    // 1. Create Passive Pos Akun (is_visible: false)
    const passiveOwnerType = hasPartner ? 'bersama' : null
    const { data: passiveAcc, error: passiveErr } = await admin
      .from('financial_accounts')
      .insert({
        household_id: householdId,
        name: `Goals (${name.trim()})`,
        account_type: 'cash',
        owner_type: passiveOwnerType,
        initial_balance: '0',
        current_balance: String(initialContribution),
        icon: icon || '🎯',
        is_active: true,
        is_visible: false,
        description: `Pos akun pasif wadah dana goals: ${name.trim()}`,
      })
      .select('id')
      .single()

    if (passiveErr) {
      console.error('[goals.post] failed to create passive account:', passiveErr)
      throw createError({ statusCode: 500, statusMessage: 'Gagal membuat pos akun pasif untuk goals' })
    }
    const passiveAccountId = passiveAcc?.id ?? null

    // 2. Create Auto-generated Category: (goals: [name])
    const generatedCatName = `(goals: ${name.trim()})`
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
      const { data: newCat } = await admin
        .from('categories')
        .insert({
          household_id: householdId,
          type: 'expense',
          name: generatedCatName,
          icon: icon || '🎯',
          applies_to: hasPartner ? 'bersama' : userRole,
          is_default: false,
          is_active: true,
        })
        .select('id')
        .single()
      generatedCategoryId = newCat?.id ?? null
    }

    const isCompleted = p1 + (p2 ?? 0) >= numericTarget

    // 3. Create Goal
    const { data: newGoal, error } = await admin
      .from('goals')
      .insert({
        household_id: householdId,
        created_by_user_id: userId,
        name: name.trim(),
        target_date: targetDate,
        target_amount: numericTarget,
        partner_1_contribution: p1,
        partner_2_contribution: p2,
        category_id: categoryId || null,
        passive_account_id: passiveAccountId,
        generated_category_id: generatedCategoryId,
        icon: icon || '🎯',
        description: description?.trim() || null,
        status: isCompleted ? 'completed' : 'active',
        completed_at: isCompleted ? new Date().toISOString() : null,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    // Link passive account to goal_id
    if (passiveAccountId && newGoal?.id) {
      await admin
        .from('financial_accounts')
        .update({ goal_id: newGoal.id })
        .eq('id', passiveAccountId)
    }

    // 4. If initial contribution > 0, record transaction from source account
    if (initialContribution > 0 && sourceAccountId) {
      const todayStr = new Date().toISOString().split('T')[0]
      const timeStr = new Date().toTimeString().split(' ')[0]

      await admin.from('transactions').insert({
        household_id: householdId,
        account_id: sourceAccountId,
        category_id: generatedCategoryId,
        recorded_by_user_id: userId,
        owner_type: userRole || 'bersama',
        type: 'goals',
        amount: String(initialContribution),
        transaction_date: todayStr,
        transaction_time: timeStr,
        merchant_name: `Setoran Awal Goals: ${name.trim()}`,
        note: `Kontribusi awal untuk target goals: ${name.trim()}`,
        source: 'manual',
      })
      // Note: Trigger trg_transactions_balance automatically deducts amount from sourceAccountId
    }

    return {
      success: true,
      goal: newGoal,
      passiveAccountId,
    }
  } catch (err: any) {
    console.error('[goals.post] error:', err?.message ?? err)
    throw createError({ statusCode: err?.statusCode || 500, statusMessage: err?.statusMessage || err?.message || 'Gagal membuat goal' })
  }
})
