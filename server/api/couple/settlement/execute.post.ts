import { getSupabaseAdmin, getUserFromToken } from '../../../utils/supabaseAdmin'
import crypto from 'node:crypto'

interface AccountDecision {
  id: string
  action: 'bagikan' | 'tidak_dibagi'
  method?: 'persentase' | 'nominal'
  partner1Pct?: number
  partner2Pct?: number
  partner1Amount?: number
  partner2Amount?: number
  keepFor?: 'partner1' | 'partner2'
}

interface GoalDecision {
  id: string
  action: 'bagikan' | 'tidak_dibagi'
  method?: 'persentase' | 'nominal'
  partner1Pct?: number
  partner2Pct?: number
  partner1Amount?: number
  partner2Amount?: number
  keepFor?: 'partner1' | 'partner2'
}

export default defineEventHandler(async (event) => {
  try {
    const authHeader = getHeader(event, 'Authorization')
    const user = await getUserFromToken(authHeader)

    if (!user) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const admin = getSupabaseAdmin()

    // 1. Get current user & household
    const { data: currentProfile, error: profileErr } = await admin
      .from('users')
      .select('id, household_id, role, full_name')
      .eq('auth_user_id', user.id)
      .single()

    if (profileErr || !currentProfile?.household_id) {
      throw createError({ statusCode: 404, statusMessage: 'Profil atau household tidak ditemukan' })
    }

    const householdId = currentProfile.household_id

    // 2. Identify partner 1 (suami) and partner 2 (istri)
    const { data: members = [] } = await admin
      .from('users')
      .select('id, role, full_name, auth_user_id')
      .eq('household_id', householdId)

    const partner1 = members?.find((m: any) => m.role === 'suami') || currentProfile
    const partner2 = members?.find((m: any) => m.id !== partner1.id)

    if (!partner2) {
      throw createError({ statusCode: 400, statusMessage: 'Tidak ada pasangan yang terhubung dalam keluarga ini' })
    }

    const body = await readBody(event).catch(() => ({}))
    const {
      accountDecisions = [] as AccountDecision[],
      goalDecisions = [] as GoalDecision[],
      userConfirmed = false,
    } = body

    if (!userConfirmed) {
      throw createError({ statusCode: 400, statusMessage: 'Konfirmasi penyelesaian wajib dicentang' })
    }

    // 3. Query existing shared accounts and goals for validation
    const { data: rawAccounts = [] } = await admin
      .from('financial_accounts')
      .select('*')
      .eq('household_id', householdId)
      .eq('is_deleted', false)
      .eq('owner_type', 'bersama')
      .neq('account_type', 'debt')
      .not('name', 'like', 'Goals (%')

    const { data: rawGoals = [] } = await admin
      .from('goals')
      .select('*')
      .eq('household_id', householdId)
      .eq('is_deleted', false)
      .eq('status', 'active')

    // 4. Validate Decisions
    const accountAllocations: any[] = []
    for (const acc of rawAccounts) {
      const decision = accountDecisions.find((d: AccountDecision) => d.id === acc.id)
      const balance = Math.max(0, Number(acc.current_balance) || 0)

      if (!decision || decision.action === 'bagikan') {
        const method = decision?.method || 'persentase'
        let p1Amt = 0
        let p2Amt = 0

        if (method === 'persentase') {
          const p1Pct = Number(decision?.partner1Pct ?? 50)
          const p2Pct = Number(decision?.partner2Pct ?? 50)
          if (p1Pct + p2Pct !== 100) {
            throw createError({
              statusCode: 400,
              statusMessage: `Total persentase pembagian pos akun "${acc.name}" harus tepat 100% (saat ini ${p1Pct + p2Pct}%)`,
            })
          }
          p1Amt = Math.round((balance * p1Pct) / 100)
          p2Amt = balance - p1Amt
        } else {
          p1Amt = Number(decision?.partner1Amount ?? Math.round(balance / 2))
          p2Amt = Number(decision?.partner2Amount ?? (balance - p1Amt))
          if (p1Amt + p2Amt !== balance) {
            throw createError({
              statusCode: 400,
              statusMessage: `Total nominal pembagian pos akun "${acc.name}" (Rp ${(p1Amt + p2Amt).toLocaleString('id-ID')}) tidak sesuai dengan saldo yang tersedia (Rp ${balance.toLocaleString('id-ID')})`,
            })
          }
        }

        accountAllocations.push({
          accountId: acc.id,
          name: acc.name,
          accountType: acc.account_type,
          originalBalance: balance,
          action: 'bagikan',
          method,
          partner1Amount: p1Amt,
          partner2Amount: p2Amt,
        })
      } else {
        // Tidak dibagi
        const keepFor = decision.keepFor || 'partner1'
        accountAllocations.push({
          accountId: acc.id,
          name: acc.name,
          accountType: acc.account_type,
          originalBalance: balance,
          action: 'tidak_dibagi',
          keepFor,
        })
      }
    }

    const goalAllocations: any[] = []
    for (const g of rawGoals) {
      // Only process shared goals
      const isShared = g.owner_type === 'bersama' || ((Number(g.partner_1_contribution) || 0) > 0 && (Number(g.partner_2_contribution) || 0) > 0)
      if (!isShared) continue

      const actualBalance = (Number(g.partner_1_contribution) || 0) + (Number(g.partner_2_contribution) || 0)
      const decision = goalDecisions.find((d: GoalDecision) => d.id === g.id)

      if (!decision || decision.action === 'bagikan') {
        const method = decision?.method || 'persentase'
        let p1Amt = 0
        let p2Amt = 0

        if (method === 'persentase') {
          const p1Pct = Number(decision?.partner1Pct ?? 50)
          const p2Pct = Number(decision?.partner2Pct ?? 50)
          if (p1Pct + p2Pct !== 100) {
            throw createError({
              statusCode: 400,
              statusMessage: `Total persentase pembagian goal "${g.name}" harus tepat 100% (saat ini ${p1Pct + p2Pct}%)`,
            })
          }
          p1Amt = Math.round((actualBalance * p1Pct) / 100)
          p2Amt = actualBalance - p1Amt
        } else {
          p1Amt = Number(decision?.partner1Amount ?? Math.round(actualBalance / 2))
          p2Amt = Number(decision?.partner2Amount ?? (actualBalance - p1Amt))
          if (p1Amt + p2Amt !== actualBalance) {
            throw createError({
              statusCode: 400,
              statusMessage: `Total nominal pembagian goal "${g.name}" (Rp ${(p1Amt + p2Amt).toLocaleString('id-ID')}) tidak sesuai dengan saldo aktual (Rp ${actualBalance.toLocaleString('id-ID')})`,
            })
          }
        }

        goalAllocations.push({
          goalId: g.id,
          name: g.name,
          targetAmount: Number(g.target_amount) || 0,
          actualBalance,
          action: 'bagikan',
          method,
          partner1Amount: p1Amt,
          partner2Amount: p2Amt,
        })
      } else {
        const keepFor = decision.keepFor || 'partner1'
        goalAllocations.push({
          goalId: g.id,
          name: g.name,
          targetAmount: Number(g.target_amount) || 0,
          actualBalance,
          action: 'tidak_dibagi',
          keepFor,
        })
      }
    }

    // 5. Create new household for partner2
    const randomCode = crypto.randomBytes(4).toString('hex')
    const { data: newHousehold, error: newHhErr } = await admin
      .from('households')
      .insert({
        name: `Keluarga ${partner2.full_name.split(' ')[0]}`,
        invite_code: randomCode,
      })
      .select()
      .single()

    if (newHhErr || !newHousehold) {
      throw createError({ statusCode: 500, statusMessage: 'Gagal membuat household baru untuk pemisahan data' })
    }

    // 6. Record Settlement in database (Auditability)
    const { data: settlementRecord, error: setErr } = await admin
      .from('settlements')
      .insert({
        household_id: householdId,
        initiated_by_user_id: currentProfile.id,
        partner_1_id: partner1.id,
        partner_2_id: partner2.id,
        status: 'completed',
        settlement_data: {
          accounts: accountAllocations,
          goals: goalAllocations,
        },
        separation_summary: {
          timestamp: new Date().toISOString(),
          partner1Name: partner1.full_name,
          partner2Name: partner2.full_name,
        },
        completed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (setErr || !settlementRecord) {
      console.error('[settlement/execute] error creating settlement record:', setErr)
      throw createError({ statusCode: 500, statusMessage: 'Gagal mencatat audit penyelesaian harta bersama' })
    }

    const settlementId = settlementRecord.id

    // 7. Execute Account Settlements
    for (const alloc of accountAllocations) {
      if (alloc.action === 'bagikan') {
        // Create personal account for partner1 in original household
        if (alloc.partner1Amount > 0) {
          await admin.from('financial_accounts').insert({
            household_id: householdId,
            name: `${alloc.name} (${partner1.full_name.split(' ')[0]})`,
            account_type: alloc.accountType,
            initial_balance: alloc.partner1Amount,
            current_balance: alloc.partner1Amount,
            owner_type: 'suami',
            derived_from_id: alloc.accountId,
            settlement_id: settlementId,
          })
        }
        // Create personal account for partner2 in new household
        if (alloc.partner2Amount > 0) {
          await admin.from('financial_accounts').insert({
            household_id: newHousehold.id,
            name: `${alloc.name} (${partner2.full_name.split(' ')[0]})`,
            account_type: alloc.accountType,
            initial_balance: alloc.partner2Amount,
            current_balance: alloc.partner2Amount,
            owner_type: 'istri',
            derived_from_id: alloc.accountId,
            settlement_id: settlementId,
          })
        }
        // Archive original shared account
        await admin
          .from('financial_accounts')
          .update({ is_deleted: true, current_balance: 0, updated_at: new Date().toISOString() })
          .eq('id', alloc.accountId)
      } else {
        // Tidak dibagi
        if (alloc.keepFor === 'partner2') {
          await admin
            .from('financial_accounts')
            .update({ household_id: newHousehold.id, owner_type: 'istri', updated_at: new Date().toISOString() })
            .eq('id', alloc.accountId)
        } else {
          await admin
            .from('financial_accounts')
            .update({ owner_type: 'suami', updated_at: new Date().toISOString() })
            .eq('id', alloc.accountId)
        }
      }
    }

    // 8. Execute Goal Settlements
    for (const gAlloc of goalAllocations) {
      if (gAlloc.action === 'bagikan') {
        // Create personal goal for partner1 in original household
        if (gAlloc.partner1Amount > 0) {
          await admin.from('goals').insert({
            household_id: householdId,
            created_by_user_id: partner1.id,
            name: `${gAlloc.name} (${partner1.full_name.split(' ')[0]})`,
            target_amount: gAlloc.targetAmount,
            partner_1_contribution: gAlloc.partner1Amount,
            partner_2_contribution: 0,
            owner_type: 'suami',
            derived_from_id: gAlloc.goalId,
            settlement_id: settlementId,
            status: 'active',
            target_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          })
        }
        // Create personal goal for partner2 in new household
        if (gAlloc.partner2Amount > 0) {
          await admin.from('goals').insert({
            household_id: newHousehold.id,
            created_by_user_id: partner2.id,
            name: `${gAlloc.name} (${partner2.full_name.split(' ')[0]})`,
            target_amount: gAlloc.targetAmount,
            partner_1_contribution: gAlloc.partner2Amount,
            partner_2_contribution: 0,
            owner_type: 'istri',
            derived_from_id: gAlloc.goalId,
            settlement_id: settlementId,
            status: 'active',
            target_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          })
        }
        // Archive original goal
        await admin
          .from('goals')
          .update({ is_deleted: true, status: 'settled', updated_at: new Date().toISOString() })
          .eq('id', gAlloc.goalId)
      } else {
        // Tidak dibagi
        if (gAlloc.keepFor === 'partner2') {
          await admin
            .from('goals')
            .update({ household_id: newHousehold.id, owner_type: 'istri', updated_at: new Date().toISOString() })
            .eq('id', gAlloc.goalId)
        } else {
          await admin
            .from('goals')
            .update({ owner_type: 'suami', updated_at: new Date().toISOString() })
            .eq('id', gAlloc.goalId)
        }
      }
    }

    // 9. AUTOMATIC DATA SEPARATION FOR NON-HARTA ITEMS (Sections P, Q, R, S, T, U)

    // A. Move strictly partner2 accounts to newHousehold
    await admin
      .from('financial_accounts')
      .update({ household_id: newHousehold.id, updated_at: new Date().toISOString() })
      .eq('household_id', householdId)
      .eq('owner_type', 'istri')

    // B. Move partner2 personal goals (created by partner2 and 0 partner1 contribution)
    await admin
      .from('goals')
      .update({ household_id: newHousehold.id, updated_at: new Date().toISOString() })
      .eq('household_id', householdId)
      .eq('created_by_user_id', partner2.id)
      .or('partner_1_contribution.is.null,partner_1_contribution.eq.0')

    // C. Master Data Categories Separation (Section Q & R)
    // Move istri categories
    await admin
      .from('categories')
      .update({ household_id: newHousehold.id })
      .eq('household_id', householdId)
      .eq('applies_to', 'istri')

    // Duplicate shared categories to newHousehold so partner2 has complete master categories
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

    // D. Master Data Budgets Separation (Section S)
    // Move partner2 budgets
    await admin
      .from('budgets')
      .update({ household_id: newHousehold.id, updated_at: new Date().toISOString() })
      .eq('household_id', householdId)
      .eq('owner_type', 'istri')

    // Duplicate shared budgets with full limit to newHousehold
    const { data: sharedBudgets = [] } = await admin
      .from('budgets')
      .select('name, limit_amount, period_type, period_start, period_end, is_active')
      .eq('household_id', householdId)
      .eq('owner_type', 'bersama')
      .eq('is_active', true)

    if (sharedBudgets.length > 0) {
      await admin.from('budgets').insert(
        sharedBudgets.map((b: any) => ({
          ...b,
          household_id: newHousehold.id,
          owner_type: 'bersama',
        }))
      )
    }

    // E. Master Data Bills Separation (Section T)
    // Move partner2 bills
    await admin
      .from('bills')
      .update({ household_id: newHousehold.id, updated_at: new Date().toISOString() })
      .eq('household_id', householdId)
      .eq('owner_type', 'istri')

    // Duplicate shared bills with full amount to newHousehold
    const { data: sharedBills = [] } = await admin
      .from('bills')
      .select('name, amount, due_date, is_recurring, recurrence_rule, reminder_days_before, icon')
      .eq('household_id', householdId)
      .eq('owner_type', 'bersama')

    if (sharedBills.length > 0) {
      await admin.from('bills').insert(
        sharedBills.map((bl: any) => ({
          ...bl,
          household_id: newHousehold.id,
          owner_type: 'bersama',
          status: 'pending',
        }))
      )
    }

    // F. Move partner2 historical transactions (Section X: NO DUPLICATION)
    await admin
      .from('transactions')
      .update({ household_id: newHousehold.id, updated_at: new Date().toISOString() })
      .eq('household_id', householdId)
      .eq('recorded_by_user_id', partner2.id)

    // 10. Disconnect Household & set roles to 'single'
    await admin
      .from('users')
      .update({
        household_id: newHousehold.id,
        role: 'single',
        updated_at: new Date().toISOString(),
      })
      .eq('id', partner2.id)

    await admin
      .from('users')
      .update({
        role: 'single',
        updated_at: new Date().toISOString(),
      })
      .eq('id', partner1.id)

    // Update household names to reflect single status
    await admin
      .from('households')
      .update({
        name: `Keluarga ${partner1.full_name.split(' ')[0]}`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', householdId)

    return {
      success: true,
      settlementId,
      message: 'Penyelesaian harta bersama dan pemisahan data finansial berhasil dilakukan secara tuntas.',
      allocations: {
        accounts: accountAllocations,
        goals: goalAllocations,
      },
    }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[settlement/execute.post] error:', err?.message ?? err)
    throw createError({ statusCode: 500, statusMessage: err?.message ?? 'Gagal memproses penyelesaian harta bersama' })
  }
})
