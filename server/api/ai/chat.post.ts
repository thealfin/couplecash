import { GoogleGenerativeAI } from '@google/generative-ai'
import { getSupabaseAdmin, getUserFromToken } from '../../utils/supabaseAdmin'

function fmtRp(n: number): string {
  const num = Math.round(Number(n) || 0)
  if (num < 0) return '-Rp ' + Math.abs(num).toLocaleString('id-ID')
  return 'Rp ' + num.toLocaleString('id-ID')
}

async function buildFinancialContext(admin: any, householdId: string, userRole: string = 'single'): Promise<string> {
  try {
    // 1. Fetch Accounts
    const { data: accounts = [] } = await admin
      .from('financial_accounts')
      .select('*')
      .eq('household_id', householdId)
      .eq('is_deleted', false)

    let totalAsset = 0
    let totalDebt = 0
    const ownershipNet = { suami: 0, istri: 0, bersama: 0, single: 0 }
    const positiveAccounts: string[] = []
    const negativeAccounts: string[] = []

    for (const acc of (accounts || [])) {
      const bal = Number(acc.current_balance) || 0
      const owner = acc.owner_type || 'bersama'

      if (acc.account_type === 'debt' || bal < 0) {
        totalDebt += Math.abs(bal)
        if (owner === 'suami') ownershipNet.suami -= Math.abs(bal)
        else if (owner === 'istri') ownershipNet.istri -= Math.abs(bal)
        else if (owner === 'sendiri') ownershipNet.single -= Math.abs(bal)
        else ownershipNet.bersama -= Math.abs(bal)

        negativeAccounts.push(`  * ${acc.name} (${String(acc.account_type).toUpperCase()} - ${owner.toUpperCase()}): ${fmtRp(bal)}`)
      } else {
        totalAsset += bal
        if (owner === 'suami') ownershipNet.suami += bal
        else if (owner === 'istri') ownershipNet.istri += bal
        else if (owner === 'sendiri') ownershipNet.single += bal
        else ownershipNet.bersama += bal

        positiveAccounts.push(`  * ${acc.name} (${String(acc.account_type).toUpperCase()} - ${owner.toUpperCase()}): ${fmtRp(bal)}`)
      }
    }

    const netWorth = totalAsset - totalDebt

    // 2. Fetch Current Month Transactions
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth() + 1
    const startOfMonth = `${y}-${String(m).padStart(2, '0')}-01`
    const lastDayOfMonth = new Date(y, m, 0).getDate()
    const endOfMonth = `${y}-${String(m).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`

    const { data: monthTxs = [] } = await admin
      .from('transactions')
      .select('*, category:categories(id, name)')
      .eq('household_id', householdId)
      .eq('is_deleted', false)
      .gte('transaction_date', startOfMonth)
      .lte('transaction_date', endOfMonth)

    let totalIncome = 0
    let totalExpense = 0
    const categoryTotals: Record<string, number> = {}

    for (const tx of (monthTxs || [])) {
      const amt = Number(tx.amount) || 0
      if (tx.type === 'income') {
        totalIncome += amt
      } else if (tx.type === 'expense') {
        totalExpense += amt
        const catName = tx.category?.name || 'Lain-lain'
        categoryTotals[catName] = (categoryTotals[catName] || 0) + amt
      }
    }

    const netFlow = totalIncome - totalExpense
    const topCategories = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)

    // 3. Budgets
    const { data: activeBudgets = [] } = await admin
      .from('budgets')
      .select('*, category:categories(id, name)')
      .eq('household_id', householdId)
      .eq('is_active', true)

    // 4. Pending Bills
    const { data: pendingBills = [] } = await admin
      .from('bills')
      .select('*')
      .eq('household_id', householdId)
      .eq('status', 'pending')
      .order('due_date', { ascending: true })

    // 5. Goals
    const { data: activeGoals = [] } = await admin
      .from('goals')
      .select('*')
      .eq('household_id', householdId)
      .eq('status', 'active')

    // Assemble Safe Context
    let ctx = `[RINGKASAN DATA KEUANGAN KELUARGA SAAT INI]:\n`
    ctx += `- Peran Pengguna: ${userRole.toUpperCase()}\n`
    ctx += `- Total Kekayaan Bersih (Net Worth): ${fmtRp(netWorth)}\n`
    ctx += `- Total Saldo Aset Kas/Rekening Biasa (Saldo Positif): ${fmtRp(totalAsset)}\n`
    ctx += `- Total Beban Kewajiban / Hutang / Saldo Minus: ${totalDebt > 0 ? `-${fmtRp(totalDebt)}` : 'Rp 0'}\n`

    if (userRole === 'single') {
      ctx += `- Total Saldo Pribadi: ${fmtRp(ownershipNet.single || netWorth)}\n`
    } else {
      ctx += `- Rincian Saldo Bersih per Kepemilikan:\n`
      ctx += `  * Saldo Bersih Suami: ${fmtRp(ownershipNet.suami)}\n`
      ctx += `  * Saldo Bersih Istri: ${fmtRp(ownershipNet.istri)}\n`
      ctx += `  * Saldo Bersih Bersama: ${fmtRp(ownershipNet.bersama)}\n`
    }

    ctx += `\n- Rincian Rekening Aset (Saldo Positif):\n`
    ctx += positiveAccounts.length > 0 ? positiveAccounts.join('\n') + '\n' : '  (Belum ada rekening aset aktif)\n'

    ctx += `\n- Rincian Hutang & Saldo Minus (Kewajiban Aktif):\n`
    ctx += negativeAccounts.length > 0 ? negativeAccounts.join('\n') + '\n' : '  (Tidak ada hutang aktif. Keuangan sehat!)\n'

    ctx += `\n[ARUS KAS BULAN INI (${y}-${String(m).padStart(2, '0')}]:\n`
    ctx += `- Total Pemasukan: ${fmtRp(totalIncome)}\n`
    ctx += `- Total Pengeluaran: ${fmtRp(totalExpense)}\n`
    ctx += `- Arus Kas Bersih (Surplus/Defisit): ${fmtRp(netFlow)}\n`

    if (topCategories.length > 0) {
      ctx += `- Pengeluaran Terbesar:\n`
      topCategories.forEach(([cat, total]) => {
        ctx += `  * ${cat}: ${fmtRp(total)}\n`
      })
    }

    if (activeBudgets.length > 0) {
      ctx += `\n- Alokasi Anggaran Aktif:\n`
      activeBudgets.forEach((b: any) => {
        ctx += `  * ${b.name || b.category?.name || 'Anggaran'}: Batas ${fmtRp(Number(b.limit_amount))}\n`
      })
    }

    if (pendingBills.length > 0) {
      ctx += `\n- Tagihan Belum Lunas:\n`
      pendingBills.slice(0, 5).forEach((b: any) => {
        ctx += `  * ${b.name}: ${fmtRp(Number(b.amount))} (Jatuh tempo: ${b.due_date})\n`
      })
    }

    if (activeGoals.length > 0) {
      ctx += `\n- Target Impian Tabungan (Goals):\n`
      activeGoals.slice(0, 3).forEach((g: any) => {
        const cur = (Number(g.partner1_contribution) || 0) + (Number(g.partner2_contribution) || 0)
        const tgt = Number(g.target_amount) || 1
        const pct = Math.round((cur / tgt) * 100)
        ctx += `  * ${g.name}: ${fmtRp(cur)} / ${fmtRp(tgt)} (${pct}%)\n`
      })
    }

    return ctx
  } catch (err: any) {
    console.warn('[buildFinancialContext] Error constructing context:', err)
    return `[RINGKASAN DATA KEUANGAN KELUARGA]:\nData keuangan sedang diperbarui.`
  }
}

async function generateWithRetry(
  genAI: GoogleGenerativeAI,
  prompt: string,
  systemInstruction: string,
  preferredModel: string = 'gemini-2.5-flash',
  maxRounds = 3
): Promise<{ text: string; usedModel: string }> {
  // Pool of candidate models starting with preferredModel
  const candidatePool = [
    preferredModel,
    'gemini-3.6-flash',
    'gemini-3.7-flash',
    'gemini-flash-latest',
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-3.1-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
  ].filter((v, i, a) => Boolean(v) && a.indexOf(v) === i)

  let lastError: any = null

  for (let round = 1; round <= maxRounds; round++) {
    for (const modelName of candidatePool) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName, systemInstruction })
        const result = await model.generateContent(prompt)
        const text = result.response.text()
        if (text) {
          if (modelName !== preferredModel) {
            console.log(`[AI Round-Robin] Successfully generated reply using fallback model "${modelName}" (preferred was "${preferredModel}")`)
          }
          return { text, usedModel: modelName }
        }
      } catch (err: any) {
        lastError = err
        const msg = String(err?.message || '').toLowerCase()
        const status = err?.status || err?.statusCode

        // Check if model is experiencing high demand (503), rate limits (429), busy, not found, or temporary server spike
        const isHighDemandOrBusy =
          status === 503 ||
          status === 429 ||
          msg.includes('503') ||
          msg.includes('429') ||
          msg.includes('high demand') ||
          msg.includes('service unavailable') ||
          msg.includes('overloaded') ||
          msg.includes('quota') ||
          msg.includes('resource exhausted') ||
          msg.includes('not found') ||
          msg.includes('unsupported') ||
          (status >= 500 && status < 600)

        if (isHighDemandOrBusy) {
          console.warn(`[AI Round-Robin] Model "${modelName}" busy/high-demand (${status || 'unknown'}). Round-robining immediately to next model...`)
          continue
        }

        // Check fatal invalid API key
        if (status === 400 && (msg.includes('api_key_invalid') || msg.includes('api key not valid'))) {
          throw err
        }

        console.warn(`[AI Round-Robin] Model "${modelName}" error (${msg.slice(0, 80)}...). Continuing to next candidate...`)
        continue
      }
    }

    // If all models in the candidate pool returned high-demand or busy in this round, pause briefly before next round
    if (round < maxRounds) {
      const waitMs = round * 800 + Math.floor(Math.random() * 300)
      console.warn(`[AI Round-Robin] All models in pool returned busy on round ${round}. Pausing ${waitMs}ms before round ${round + 1}...`)
      await new Promise((r) => setTimeout(r, waitMs))
    }
  }

  throw lastError || new Error('Semua model AI sedang mengalami lonjakan trafik tinggi dari Google. Sistem terus mencoba, silakan ulangi sesaat lagi.')
}

export default defineEventHandler(async (event) => {
  try {
    const authHeader = getHeader(event, 'Authorization')
    const user = await getUserFromToken(authHeader)

    if (!user) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const admin = getSupabaseAdmin()
    const { data: currentUser } = await admin
      .from('users')
      .select('id, household_id, role')
      .eq('auth_user_id', user.id)
      .single()

    if (!currentUser || !currentUser.household_id) {
      throw createError({ statusCode: 404, statusMessage: 'User profile not found' })
    }

    // STRICT BYOK ENFORCEMENT
    // Check key from header X-Gemini-Api-Key or request body
    const reqHeaderKey = getHeader(event, 'x-gemini-api-key')
    const body = await readBody(event)
    const { sessionId, message, customPersonaPrompt, model: requestedModel, apiKey: bodyApiKey } = body || {}

    const userApiKey = (reqHeaderKey || bodyApiKey || process.env.GEMINI_API_KEY || '').trim()

    if (!userApiKey) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Kunci Google Gemini API (BYOK) belum diisi. Silakan masukkan API Key Anda di Pengaturan AI untuk menggunakan asisten keuangan.'
      })
    }

    if (!message || !String(message).trim()) {
      throw createError({ statusCode: 400, statusMessage: 'Pesan tidak boleh kosong' })
    }

    const trimmedMsg = String(message).trim()

    // Manage Session
    let activeSessionId = sessionId

    if (!activeSessionId) {
      const { data: sessions = [] } = await admin
        .from('ai_chat_sessions')
        .select('*')
        .eq('household_id', currentUser.household_id)
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(1)

      if (sessions && sessions.length > 0) {
        activeSessionId = sessions[0].id
      }
    }

    if (!activeSessionId) {
      const { data: newSession, error: newSessErr } = await admin
        .from('ai_chat_sessions')
        .insert({
          household_id: currentUser.household_id,
          user_id: currentUser.id,
          title: 'Konsultasi Finansial',
        })
        .select()
        .single()

      if (newSessErr || !newSession) {
        throw createError({ statusCode: 500, statusMessage: 'Gagal membuat sesi chat' })
      }
      activeSessionId = newSession.id
    }

    // 1. Insert user message into database
    const { data: savedUserMsg, error: userMsgErr } = await admin
      .from('ai_chat_messages')
      .insert({
        session_id: activeSessionId,
        sender: 'user',
        message: trimmedMsg,
      })
      .select()
      .single()

    if (userMsgErr) {
      console.warn('[ai.chat.post] user message insert warning:', userMsgErr.message)
    }

    // 2. Build Safe Financial Context
    const financialContext = await buildFinancialContext(
      admin,
      currentUser.household_id,
      currentUser.role || 'single'
    )

    // 3. Prepare System Instruction
    const defaultPersona = `Mulai sekarang dan seterusnya, berikan semua jawaban Anda dengan gaya bahasa yang santai, natural, kasual, dan mengalir seperti percakapan sehari-hari teman sebaya. Hindari bahasa yang terlalu kaku atau formal. PENTING: Jangan gunakan simbol atau format markdown apa pun dalam teks Anda (seperti tanda bintang tunggal atau ganda * ** untuk cetak tebal/miring, tanda pagar # untuk judul, baris baru menggunakan strip -, atau simbol format lainnya). Tuliskan jawaban Anda dalam bentuk teks biasa (plain text) yang bersih, hanya mengandalkan spasi, tanda baca normal (koma, titik, tanda tanya), dan paragraf baru untuk merapikan tulisan.`

    const personaInstruction = customPersonaPrompt || defaultPersona

    const systemInstruction = `${personaInstruction}

Anda adalah "CoupleCash AI", asisten dan penasihat keuangan keluarga yang ramah, bijak, hangat, dan suportif bagi pasangan suami istri maupun pengguna single di Indonesia.
Pedoman Finansial:
1. Anda memiliki akses penuh ke data ringkasan finansial pengguna: saldo kas/rekening positif, kewajiban/hutang, arus kas bulanan, anggaran, tagihan, dan target tabungan.
2. Berikan saran praktis, terstruktur, bijak, dan actionable untuk membantu pengguna mengelola anggaran, hemat belanja, melunasi tagihan tepat waktu, dan mencapai target tabungan bersama.
3. Rujuk angka-angka saldo dan data finansial yang relevan saat menjawab pertanyaan.
4. Jangan pernah meminta nomor rekening bank rahasia, kata sandi, PIN, atau data rahasia perbankan.
5. PENTING: Jangan pernah gunakan simbol format markdown apa pun (*, **, #, atau strip -). Jawaban harus selalu dalam teks biasa (plain text) yang bersih dan mengalir rapi.`

    const prompt = `${financialContext}\n\n[PERTANYAAN PENGGUNA]:\n${trimmedMsg}`

    // 4. Generate with Gemini BYOK (Automatic Round-Robin on Demand Spikes/503)
    const genAI = new GoogleGenerativeAI(userApiKey)
    const { text: rawReply, usedModel } = await generateWithRetry(genAI, prompt, systemInstruction, requestedModel || 'gemini-2.5-flash')

    // Clean any stubborn markdown symbols (garansi 100% plain text bersih)
    const cleanedReply = rawReply
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/^[-*+]\s+/gm, '')
      .replace(/`{1,3}(.*?)`{1,3}/g, '$1')
      .trim()

    // 5. Insert model response
    const { data: savedModelMsg, error: modelMsgErr } = await admin
      .from('ai_chat_messages')
      .insert({
        session_id: activeSessionId,
        sender: 'model',
        message: cleanedReply,
      })
      .select()
      .single()

    if (modelMsgErr) {
      console.warn('[ai.chat.post] model message insert warning:', modelMsgErr.message)
    }

    // Update Session title if default
    const { data: titleRes } = await admin
      .from('ai_chat_sessions')
      .select('title')
      .eq('id', activeSessionId)
      .single()

    if (titleRes && (!titleRes.title || titleRes.title === 'Konsultasi Finansial' || titleRes.title === 'Chat Baru')) {
      const summaryTitle = trimmedMsg.length > 35 ? trimmedMsg.substring(0, 35) + '...' : trimmedMsg
      await admin.from('ai_chat_sessions').update({ title: summaryTitle }).eq('id', activeSessionId)
    }

    // 6. Realtime Supabase Broadcast: emit websocket event so connected clients get instant native feel
    try {
      const channel = admin.channel(`chat_session_${activeSessionId}`)
      await channel.send({
        type: 'broadcast',
        event: 'new_message',
        payload: {
          id: savedModelMsg?.id,
          sessionId: activeSessionId,
          sender: 'model',
          message: cleanedReply,
          createdAt: savedModelMsg?.created_at,
        },
      })
    } catch (realtimeErr) {
      console.warn('[ai.chat.post] Realtime broadcast warning:', realtimeErr)
    }

    return {
      success: true,
      sessionId: activeSessionId,
      userMessage: savedUserMsg ? {
        id: savedUserMsg.id,
        sessionId: savedUserMsg.session_id,
        sender: savedUserMsg.sender,
        message: savedUserMsg.message,
        createdAt: savedUserMsg.created_at,
      } : null,
      message: savedModelMsg ? {
        id: savedModelMsg.id,
        sessionId: savedModelMsg.session_id,
        sender: savedModelMsg.sender,
        message: savedModelMsg.message,
        createdAt: savedModelMsg.created_at,
      } : null,
      response: cleanedReply,
      usedModel,
    }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[ai.chat.post] error:', err?.message ?? err)
    throw createError({ statusCode: 500, statusMessage: err?.message ?? 'Internal server error' })
  }
})