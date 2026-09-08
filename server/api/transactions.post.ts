import { getSupabaseAdmin } from '../utils/supabaseAdmin'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const {
      type = 'expense',
      amount,
      tax_amount = 0,
      taxAmount = 0,
      payment_method = null,
      paymentMethod = null,
      name,
      categoryName,
      accountName,
      accountId: directAccountId = null,
      transactionDate,
      transactionTime,
      note,
      ownerType = 'bersama',
      source = 'manual',
      receiptObjectKey = null,
      billId = null,
      targetDebtAccountId = null,
      newAccountType = null,
    } = body

    if (!amount || Number(amount) <= 0) {
      throw createError({ statusCode: 400, statusMessage: 'Nominal transaksi harus lebih dari 0' })
    }

    const numAmount = Number(amount)
    const numTax = Number(tax_amount || taxAmount || 0)

    if (numTax < 0) {
      throw createError({ statusCode: 400, statusMessage: 'Pajak tidak boleh bernilai negatif' })
    }

    if (numTax > numAmount) {
      throw createError({ statusCode: 400, statusMessage: 'Pajak tidak boleh lebih besar dari total transaksi' })
    }

    const authHeader = getHeader(event, 'Authorization')
    const admin = getSupabaseAdmin()

    let householdId: string | null = null
    let userId: string | null = null
    let userRole: string | null = null

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      const { data: { user } } = await admin.auth.getUser(token)
      if (user) {
        const { data: profile } = await admin.from('users').select('id, household_id, role').eq('auth_user_id', user.id).single()
        if (profile) {
          userId = profile.id
          householdId = profile.household_id
          userRole = profile.role
        }
      }
    }

    if (!householdId || !userId) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    // Determine finalOwnerType based on user role
    let finalOwnerType = ownerType
    if (userRole === 'single') {
      finalOwnerType = 'sendiri'
    } else if (ownerType === 'sendiri') {
      finalOwnerType = 'sendiri'
    } else if (!ownerType) {
      finalOwnerType = userRole === 'istri' ? 'istri' : (userRole === 'suami' ? 'suami' : 'bersama')
    }

    // 1. Get or find matching account
    let accountId: string | null = null
    let accountTypeFound: string = 'bank'

    if (directAccountId) {
      const { data: acc } = await admin
        .from('financial_accounts')
        .select('id, account_type, current_balance')
        .eq('id', directAccountId)
        .eq('household_id', householdId)
        .eq('is_deleted', false)
        .single()
      if (acc) {
        accountId = acc.id
        accountTypeFound = acc.account_type
      }
    }

    if (!accountId && accountName) {
      const { data: acc } = await admin
        .from('financial_accounts')
        .select('id, account_type, current_balance')
        .eq('household_id', householdId)
        .ilike('name', `%${accountName}%`)
        .eq('is_deleted', false)
        .limit(1)
        .single()

      if (acc) {
        accountId = acc.id
        accountTypeFound = acc.account_type
      }
    }

    // Fallback to first available account if not found
    if (!accountId) {
      const { data: firstAcc } = await admin
        .from('financial_accounts')
        .select('id, account_type, current_balance')
        .eq('household_id', householdId)
        .eq('is_deleted', false)
        .limit(1)
        .single()
      accountId = firstAcc?.id ?? null
      if (firstAcc) accountTypeFound = firstAcc.account_type
    }

    // Payment method rule: only for non-cash and non-crypto
    let finalPaymentMethod: string | null = payment_method || paymentMethod || null
    const allowedPaymentMethods = ['QRIS', 'DEBIT_CARD', 'CREDIT_CARD', 'BANK_TRANSFER', 'VIRTUAL_ACCOUNT']
    if (finalPaymentMethod && !allowedPaymentMethods.includes(finalPaymentMethod)) {
      finalPaymentMethod = null
    }
    if (accountTypeFound === 'cash' || accountTypeFound === 'crypto') {
      finalPaymentMethod = null
    }

    if (!accountId) {
      // Create a default account if none exists
      const { data: newAcc } = await admin
        .from('financial_accounts')
        .insert({
          household_id: householdId,
          name: accountName || 'BCA Utama',
          account_type: 'bank',
          owner_type: finalOwnerType,
          current_balance: String(amount),
        })
        .select('id')
        .single()
      accountId = newAcc?.id ?? null
    }

    // 2. Get or create category
    let categoryId: string | null = null
    const targetCatName = categoryName || (type === 'income' ? 'Gaji & Bonus' : 'Makan & Minum')

    const { data: cat } = await admin
      .from('categories')
      .select('id')
      .eq('household_id', householdId)
      .eq('type', type)
      .ilike('name', `%${targetCatName}%`)
      .limit(1)
      .single()

    if (cat) {
      categoryId = cat.id
    } else {
      // Create category if missing
      const { data: newCat } = await admin
        .from('categories')
        .insert({
          household_id: householdId,
          type: type,
          name: targetCatName,
          icon: type === 'income' ? 'payments' : 'restaurant',
          applies_to: finalOwnerType,
        })
        .select('id')
        .single()
      categoryId = newCat?.id ?? null
    }

    // 3. Detect if category is linked to a Goal and update goal & passive account
    let txType = type
    let matchingGoal: any = null

    if (categoryId) {
      const { data: gByCat } = await admin
        .from('goals')
        .select('*')
        .eq('household_id', householdId)
        .eq('is_deleted', false)
        .or(`generated_category_id.eq.${categoryId},category_id.eq.${categoryId}`)
        .limit(1)
        .maybeSingle()
      if (gByCat) matchingGoal = gByCat
    }

    if (!matchingGoal && (targetCatName.toLowerCase().includes('goals:') || targetCatName.toLowerCase().includes('goal:'))) {
      const cleanGoalName = targetCatName.replace(/[\(\)]/g, '').replace(/goals?:/i, '').trim()
      if (cleanGoalName) {
        const { data: gByName } = await admin
          .from('goals')
          .select('*')
          .eq('household_id', householdId)
          .eq('is_deleted', false)
          .ilike('name', `%${cleanGoalName}%`)
          .limit(1)
          .maybeSingle()
        if (gByName) matchingGoal = gByName
      }
    }

    if (matchingGoal && type !== 'income') {
      txType = 'goals'
      const numAmount = Number(amount)

      // Fetch household members to check couple status and user role
      const { data: members = [] } = await admin
        .from('users')
        .select('id, role')
        .eq('household_id', householdId)
      const hasPartner = (members ?? []).some((m: any) => m.role === 'suami') && (members ?? []).some((m: any) => m.role === 'istri')
      const { data: currentProfile } = await admin.from('users').select('role').eq('id', userId).single()
      const currentRole = currentProfile?.role || 'suami'

      let p1 = Number(matchingGoal.partner_1_contribution) || 0
      let p2 = matchingGoal.partner_2_contribution !== null && matchingGoal.partner_2_contribution !== undefined
        ? Number(matchingGoal.partner_2_contribution)
        : null

      if (hasPartner) {
        if (ownerType === 'suami') {
          p1 += numAmount
        } else if (ownerType === 'istri') {
          p2 = (p2 ?? 0) + numAmount
        } else {
          // If 'bersama', credit according to current user's role
          if (currentRole === 'istri') {
            p2 = (p2 ?? 0) + numAmount
          } else {
            p1 += numAmount
          }
        }
      } else {
        p1 += numAmount
      }

      const targetAmount = Number(matchingGoal.target_amount) || 0
      const totalCollected = p1 + (p2 ?? 0)
      const isCompleted = totalCollected >= targetAmount

      // Update goal progress
      await admin
        .from('goals')
        .update({
          partner_1_contribution: p1,
          partner_2_contribution: p2,
          status: isCompleted ? 'completed' : 'active',
          completed_at: isCompleted ? (matchingGoal.completed_at || new Date().toISOString()) : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', matchingGoal.id)

      // Credit passive account
      if (matchingGoal.passive_account_id) {
        const { data: currentPassive } = await admin
          .from('financial_accounts')
          .select('current_balance')
          .eq('id', matchingGoal.passive_account_id)
          .single()

        const newPassiveBal = (Number(currentPassive?.current_balance) || 0) + numAmount
        await admin
          .from('financial_accounts')
          .update({
            current_balance: String(newPassiveBal),
            updated_at: new Date().toISOString(),
          })
          .eq('id', matchingGoal.passive_account_id)
      }
    }

    // 3.5 Debt Payment Handling if targetDebtAccountId is supplied
    let finalEventLabel: string | null = null
    let debtNoteAppend = ''

    if (targetDebtAccountId && type === 'expense') {
      const { data: debtAcc, error: debtErr } = await admin
        .from('financial_accounts')
        .select('*')
        .eq('id', targetDebtAccountId)
        .eq('household_id', householdId)
        .eq('is_deleted', false)
        .single()

      if (debtErr || !debtAcc) {
        throw createError({ statusCode: 404, statusMessage: 'Akun hutang yang dituju tidak ditemukan' })
      }

      const outstandingDebt = Math.abs(Number(debtAcc.current_balance))
      const isOverpaid = numAmount > outstandingDebt && outstandingDebt >= 0
      const newDebtBal = Number(debtAcc.current_balance) + numAmount

      const targetUpdatePayload: Record<string, any> = {
        current_balance: String(newDebtBal),
        updated_at: new Date().toISOString(),
      }

      if (newDebtBal >= 0) {
        targetUpdatePayload.debt_status = 'paid_off'
        // If debt balance is now positive / overpaid, automatically convert from debt to positive asset account
        if (newDebtBal > 0 || isOverpaid || newAccountType) {
          const resolvedType = newAccountType || 'bank'
          targetUpdatePayload.account_type = resolvedType
          targetUpdatePayload.icon = resolvedType === 'bank' ? 'account_balance' : resolvedType === 'e_wallet' ? 'account_balance_wallet' : resolvedType === 'cash' ? 'payments' : 'savings'
          debtNoteAppend = ` (Pelunasan Hutang & Konversi Akun: ${debtAcc.name} menjadi ${resolvedType.toUpperCase()})`
        } else {
          debtNoteAppend = ` (Pelunasan Hutang: ${debtAcc.name})`
        }
      } else {
        targetUpdatePayload.debt_status = 'partially_paid'
        debtNoteAppend = ` (Pembayaran Hutang Sebagian: ${debtAcc.name})`
      }

      await admin
        .from('financial_accounts')
        .update(targetUpdatePayload)
        .eq('id', debtAcc.id)

      finalEventLabel = 'debt_payment'
    }

    // 4. Insert transaction
    const dateStr = transactionDate || new Date().toISOString().split('T')[0]
    const timeStr = transactionTime || new Date().toTimeString().split(' ')[0]

    const { data: newTx, error: txErr } = await admin
      .from('transactions')
      .insert({
        household_id: householdId,
        account_id: accountId,
        category_id: categoryId,
        recorded_by_user_id: userId,
        owner_type: finalOwnerType,
        type: txType,
        amount: String(numAmount),
        tax_amount: String(numTax),
        payment_method: finalPaymentMethod,
        transaction_date: dateStr,
        transaction_time: timeStr,
        merchant_name: name || (matchingGoal ? `Setoran Goals: ${matchingGoal.name}` : null),
        note: (note ? note + debtNoteAppend : (name ? name + debtNoteAppend : null)),
        event_label: finalEventLabel,
        source: source,
        receipt_object_key: receiptObjectKey,
      })
      .select('*')
      .single()

    if (txErr) {
      console.error('[transactions.post] error inserting:', txErr)
      throw createError({ statusCode: 500, statusMessage: txErr.message })
    }

    // 5. If linked to a bill, mark bill as 'lunas' and set linked_transaction_id
    if (billId) {
      const { error: billUpdateErr } = await admin
        .from('bills')
        .update({
          status: 'lunas',
          linked_transaction_id: newTx.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', billId)
        .eq('household_id', householdId)

      if (billUpdateErr) {
        console.warn('[transactions.post] Warning: Failed to update bill status:', billUpdateErr.message)
      }
    }

    // Note: Balance deduction from source account is handled by database trigger `trg_transactions_balance`

    return {
      success: true,
      transaction: newTx,
    }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[transactions.post] error:', err?.message ?? err)
    throw createError({ statusCode: 500, statusMessage: err?.message ?? 'Internal server error' })
  }
})
