<script setup lang="ts">
definePageMeta({ layout: 'app' })
useHead({ title: 'Harta Bersama & Pemisahan — CoupleCash' })

const router = useRouter()
const { getAuthToken, currentUser } = useAuth()

interface SharedAccount {
  id: string
  name: string
  type: 'account'
  accountType: string
  balance: number
  icon: string
  ownerType: string
}

interface SharedGoal {
  id: string
  name: string
  type: 'goal'
  targetAmount: number
  actualBalance: number
  partner1Contribution: number
  partner2Contribution: number
  icon: string
  ownerType: string
}

interface PartnerInfo {
  id: string
  name: string
  role: string
}

const currentStep = ref<1 | 2 | 3 | 4>(1)
const loading = ref(true)
const submitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const householdId = ref('')
const partner1 = ref<PartnerInfo>({ id: '', name: 'Suami', role: 'suami' })
const partner2 = ref<PartnerInfo>({ id: '', name: 'Istri', role: 'istri' })
const sharedAccounts = ref<SharedAccount[]>([])
const sharedGoals = ref<SharedGoal[]>([])

const summary = ref({
  totalSharedAccountsBalance: 0,
  totalSharedGoalsBalance: 0,
  totalSettlementValue: 0,
  sharedAccountsCount: 0,
  sharedGoalsCount: 0,
  hasSharedItems: false,
})

const nonSettlementSummary = ref({
  categoriesCount: 0,
  budgetsCount: 0,
  billsCount: 0,
  debtsCount: 0,
})

// Decisions state
interface AccountDecisionUI {
  id: string
  action: 'bagikan' | 'tidak_dibagi'
  method: 'persentase' | 'nominal'
  partner1Pct: number
  partner2Pct: number
  partner1Amount: number
  partner2Amount: number
  keepFor: 'partner1' | 'partner2'
}

interface GoalDecisionUI {
  id: string
  action: 'bagikan' | 'tidak_dibagi'
  method: 'persentase' | 'nominal'
  partner1Pct: number
  partner2Pct: number
  partner1Amount: number
  partner2Amount: number
  keepFor: 'partner1' | 'partner2'
}

const accountDecisions = ref<Record<string, AccountDecisionUI>>({})
const goalDecisions = ref<Record<string, GoalDecisionUI>>({})
const userConfirmed = ref(false)

function fmtRp(n: number): string {
  const num = Number(n) || 0
  return 'Rp ' + num.toLocaleString('id-ID')
}

// Fetch detected items
async function loadDetect() {
  loading.value = true
  errorMessage.value = ''
  try {
    const token = await getAuthToken()
    if (!token) {
      router.push('/auth/login')
      return
    }

    const res: any = await $fetch('/api/couple/settlement/detect', {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (res?.success) {
      householdId.value = res.householdId
      if (res.partner1) partner1.value = res.partner1
      if (res.partner2) partner2.value = res.partner2
      sharedAccounts.value = res.sharedAccounts || []
      sharedGoals.value = res.sharedGoals || []
      summary.value = res.summary || summary.value
      nonSettlementSummary.value = res.nonSettlementSummary || nonSettlementSummary.value

      // Initialize decisions for accounts
      const accMap: Record<string, AccountDecisionUI> = {}
      for (const acc of sharedAccounts.value) {
        const half = Math.round(acc.balance / 2)
        accMap[acc.id] = {
          id: acc.id,
          action: 'bagikan',
          method: 'persentase',
          partner1Pct: 50,
          partner2Pct: 50,
          partner1Amount: half,
          partner2Amount: acc.balance - half,
          keepFor: 'partner1',
        }
      }
      accountDecisions.value = accMap

      // Initialize decisions for goals
      const goalMap: Record<string, GoalDecisionUI> = {}
      for (const g of sharedGoals.value) {
        const half = Math.round(g.actualBalance / 2)
        goalMap[g.id] = {
          id: g.id,
          action: 'bagikan',
          method: 'persentase',
          partner1Pct: 50,
          partner2Pct: 50,
          partner1Amount: half,
          partner2Amount: g.actualBalance - half,
          keepFor: 'partner1',
        }
      }
      goalDecisions.value = goalMap
    }
  } catch (err: any) {
    errorMessage.value = err?.message || 'Gagal memuat inventarisasi harta bersama'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadDetect()
})

// Sync helpers for percentages & nominals
function onAccountPctChange(id: string, which: 'p1' | 'p2', val: number, total: number) {
  const d = accountDecisions.value[id]
  if (!d) return
  if (which === 'p1') {
    d.partner1Pct = Math.max(0, Math.min(100, Number(val) || 0))
    d.partner2Pct = 100 - d.partner1Pct
  } else {
    d.partner2Pct = Math.max(0, Math.min(100, Number(val) || 0))
    d.partner1Pct = 100 - d.partner2Pct
  }
  d.partner1Amount = Math.round((total * d.partner1Pct) / 100)
  d.partner2Amount = total - d.partner1Amount
}

function onGoalPctChange(id: string, which: 'p1' | 'p2', val: number, total: number) {
  const d = goalDecisions.value[id]
  if (!d) return
  if (which === 'p1') {
    d.partner1Pct = Math.max(0, Math.min(100, Number(val) || 0))
    d.partner2Pct = 100 - d.partner1Pct
  } else {
    d.partner2Pct = Math.max(0, Math.min(100, Number(val) || 0))
    d.partner1Pct = 100 - d.partner2Pct
  }
  d.partner1Amount = Math.round((total * d.partner1Pct) / 100)
  d.partner2Amount = total - d.partner1Amount
}

// Validation checkers for Step 2
const isStep2Valid = computed(() => {
  for (const acc of sharedAccounts.value) {
    const d = accountDecisions.value[acc.id]
    if (!d) continue
    if (d.action === 'bagikan') {
      if (d.method === 'persentase') {
        if (d.partner1Pct + d.partner2Pct !== 100) return false
      } else {
        if (d.partner1Amount + d.partner2Amount !== acc.balance) return false
      }
    }
  }

  for (const g of sharedGoals.value) {
    const d = goalDecisions.value[g.id]
    if (!d) continue
    if (d.action === 'bagikan') {
      if (d.method === 'persentase') {
        if (d.partner1Pct + d.partner2Pct !== 100) return false
      } else {
        if (d.partner1Amount + d.partner2Amount !== g.actualBalance) return false
      }
    }
  }

  return true
})

// Calculations for Review (Step 3)
const reviewPartner1Total = computed(() => {
  let sum = 0
  for (const acc of sharedAccounts.value) {
    const d = accountDecisions.value[acc.id]
    if (d?.action === 'bagikan') sum += d.partner1Amount
    else if (d?.action === 'tidak_dibagi' && d.keepFor === 'partner1') sum += acc.balance
  }
  for (const g of sharedGoals.value) {
    const d = goalDecisions.value[g.id]
    if (d?.action === 'bagikan') sum += d.partner1Amount
    else if (d?.action === 'tidak_dibagi' && d.keepFor === 'partner1') sum += g.actualBalance
  }
  return sum
})

const reviewPartner2Total = computed(() => {
  let sum = 0
  for (const acc of sharedAccounts.value) {
    const d = accountDecisions.value[acc.id]
    if (d?.action === 'bagikan') sum += d.partner2Amount
    else if (d?.action === 'tidak_dibagi' && d.keepFor === 'partner2') sum += acc.balance
  }
  for (const g of sharedGoals.value) {
    const d = goalDecisions.value[g.id]
    if (d?.action === 'bagikan') sum += d.partner2Amount
    else if (d?.action === 'tidak_dibagi' && d.keepFor === 'partner2') sum += g.actualBalance
  }
  return sum
})

// Execute final settlement
async function handleExecuteSettlement() {
  if (!userConfirmed.value) {
    errorMessage.value = 'Silakan centang persetujuan terlebih dahulu.'
    return
  }

  submitting.value = true
  errorMessage.value = ''

  try {
    const token = await getAuthToken()
    if (!token) throw new Error('Sesi autentikasi tidak ditemukan')

    const payload = {
      accountDecisions: Object.values(accountDecisions.value),
      goalDecisions: Object.values(goalDecisions.value),
      userConfirmed: true,
    }

    const res: any = await $fetch('/api/couple/settlement/execute', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: payload,
    })

    if (res?.success) {
      successMessage.value = res.message || 'Penyelesaian harta bersama dan pemisahan data berhasil!'
      setTimeout(() => {
        router.push('/beranda')
      }, 2500)
    }
  } catch (err: any) {
    errorMessage.value = err?.data?.statusMessage || err?.message || 'Gagal memproses pemisahan harta'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="harta-page animate-fade-in px-4 py-4 max-w-lg mx-auto min-h-screen pb-24">

    <!-- Top Navigation -->
    <div class="flex items-center justify-between mb-4">
      <button
        type="button"
        class="w-10 h-10 rounded-full bg-white dark:bg-[#15171e] shadow-xs border border-purple-100 dark:border-[#282b37] flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1e2029] transition active:scale-95 cursor-pointer"
        @click="router.push('/akun')"
        aria-label="Kembali ke Akun"
      >
        <span class="material-symbols-outlined text-[20px]">arrow_back</span>
      </button>
      <div class="text-center">
        <h1 class="text-base font-extrabold text-slate-900 dark:text-white leading-tight">Harta Bersama</h1>
        <p class="text-[11px] text-purple-600 dark:text-indigo-400 font-semibold">Penyelesaian &amp; Pemisahan Data</p>
      </div>
      <div class="w-10"></div>
    </div>

    <!-- Step Progress Indicator -->
    <div class="bg-white dark:bg-[#15171e] rounded-2xl p-3 shadow-xs border border-purple-50 dark:border-[#282b37] mb-4 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
      <div class="flex items-center gap-1.5" :class="{ 'text-indigo-600 dark:text-indigo-400 font-bold': currentStep === 1 }">
        <span class="w-5 h-5 rounded-full flex items-center justify-center text-[11px]" :class="currentStep === 1 ? 'bg-indigo-600 text-white' : currentStep > 1 ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-[#1e2029] text-slate-600 dark:text-slate-400'">
          {{ currentStep > 1 ? '✓' : '1' }}
        </span>
        <span>Aset</span>
      </div>
      <span class="text-slate-300 dark:text-slate-600">─</span>
      <div class="flex items-center gap-1.5" :class="{ 'text-indigo-600 dark:text-indigo-400 font-bold': currentStep === 2 }">
        <span class="w-5 h-5 rounded-full flex items-center justify-center text-[11px]" :class="currentStep === 2 ? 'bg-indigo-600 text-white' : currentStep > 2 ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-[#1e2029] text-slate-600 dark:text-slate-400'">
          {{ currentStep > 2 ? '✓' : '2' }}
        </span>
        <span>Bagi</span>
      </div>
      <span class="text-slate-300 dark:text-slate-600">─</span>
      <div class="flex items-center gap-1.5" :class="{ 'text-indigo-600 dark:text-indigo-400 font-bold': currentStep === 3 }">
        <span class="w-5 h-5 rounded-full flex items-center justify-center text-[11px]" :class="currentStep === 3 ? 'bg-indigo-600 text-white' : currentStep > 3 ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-[#1e2029] text-slate-600 dark:text-slate-400'">
          {{ currentStep > 3 ? '✓' : '3' }}
        </span>
        <span>Review</span>
      </div>
      <span class="text-slate-300 dark:text-slate-600">─</span>
      <div class="flex items-center gap-1.5" :class="{ 'text-indigo-600 dark:text-indigo-400 font-bold': currentStep === 4 }">
        <span class="w-5 h-5 rounded-full flex items-center justify-center text-[11px]" :class="currentStep === 4 ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-[#1e2029] text-slate-600 dark:text-slate-400'">
          4
        </span>
        <span>Final</span>
      </div>
    </div>

    <!-- Error & Success Alerts -->
    <div v-if="errorMessage" class="mb-4 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs rounded-2xl flex items-start gap-2">
      <span class="material-symbols-outlined text-[18px] text-rose-600 dark:text-rose-400 shrink-0">error</span>
      <div>{{ errorMessage }}</div>
    </div>

    <div v-if="successMessage" class="mb-4 p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs rounded-2xl flex items-start gap-2.5">
      <span class="material-symbols-outlined text-[20px] text-emerald-600 dark:text-emerald-400 shrink-0">check_circle</span>
      <div>
        <h4 class="font-bold text-sm text-emerald-900 dark:text-emerald-200 mb-0.5">Pemisahan Selesai!</h4>
        <p>{{ successMessage }} Mengalihkan ke beranda...</p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="py-16 text-center text-slate-500 dark:text-slate-400 text-xs space-y-2">
      <span class="material-symbols-outlined text-[32px] animate-spin text-indigo-600 dark:text-indigo-400">progress_activity</span>
      <p>Memindai dan menginventarisasi harta bersama...</p>
    </div>

    <!-- STEP 1: DETEKSI & INVENTARISASI HARTA BERSAMA -->
    <div v-else-if="currentStep === 1" class="space-y-4">

      <!-- Summary Hero Card -->
      <div class="bg-gradient-to-br from-indigo-700 via-indigo-600 to-purple-700 text-white rounded-3xl p-5 shadow-lg shadow-indigo-100 dark:shadow-none relative overflow-hidden">
        <div class="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
        <div class="flex items-center gap-2 mb-2">
          <span class="material-symbols-outlined text-[20px] text-indigo-200">balance</span>
          <span class="text-[11px] font-bold uppercase tracking-wider text-indigo-200">Harta Bersama Terdeteksi</span>
        </div>
        <div class="text-3xl font-extrabold tracking-tight mb-2">
          {{ fmtRp(summary.totalSettlementValue) }}
        </div>
        <p class="text-xs text-indigo-100/90 leading-relaxed">
          Total akumulasi dari {{ summary.sharedAccountsCount }} Pos Akun Bersama dan {{ summary.sharedGoalsCount }} Goals Bersama yang terdaftar.
        </p>
        <div class="mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-xs">
          <div>
            <span class="text-indigo-200 text-[11px]">Akun Bersama:</span><br/>
            <strong>{{ fmtRp(summary.totalSharedAccountsBalance) }}</strong>
          </div>
          <div class="text-right">
            <span class="text-indigo-200 text-[11px]">Goals Bersama:</span><br/>
            <strong>{{ fmtRp(summary.totalSharedGoalsBalance) }}</strong>
          </div>
        </div>
      </div>

      <!-- Scope Disclaimer Note (Section C) -->
      <div class="bg-amber-50/80 dark:bg-amber-950/25 border border-amber-200/90 dark:border-amber-800/40 rounded-2xl p-3.5 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
        <span class="material-symbols-outlined text-amber-600 dark:text-amber-400 text-[20px] shrink-0 mt-0.5">info</span>
        <div class="leading-relaxed text-[11.5px]">
          <strong>Batasan Objek:</strong> Kategori, budget, tagihan, dan kewajiban <strong>tidak termasuk</strong> dalam pembagian harta bersama. Objek tersebut akan otomatis dipisahkan menjadi data personal masing-masing pengguna.
        </div>
      </div>

      <!-- Section: Pos Akun Bersama -->
      <div>
        <h3 class="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2 px-1 flex items-center justify-between">
          <span>Pos Akun Bersama ({{ sharedAccounts.length }})</span>
          <span class="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">Ownership: Bersama</span>
        </h3>

        <div v-if="sharedAccounts.length === 0" class="bg-white dark:bg-[#15171e] rounded-2xl p-4 text-center text-xs text-slate-400 dark:text-slate-500 border border-purple-50 dark:border-[#282b37]">
          Tidak ada Pos Akun yang ditandai sebagai milik bersama.
        </div>

        <div v-else class="space-y-2.5">
          <div
            v-for="acc in sharedAccounts"
            :key="acc.id"
            class="bg-white dark:bg-[#15171e] rounded-2xl p-4 shadow-xs border border-purple-50 dark:border-[#282b37] flex items-center justify-between"
          >
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-purple-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
                <span class="material-symbols-outlined text-[20px]">{{ acc.icon }}</span>
              </div>
              <div>
                <h4 class="text-sm font-bold text-slate-900 dark:text-white">{{ acc.name }}</h4>
                <p class="text-[11px] text-slate-400 capitalize">{{ acc.accountType }} • Pos Akun Bersama</p>
              </div>
            </div>
            <div class="text-right">
              <div class="text-sm font-extrabold text-slate-900 dark:text-white">{{ fmtRp(acc.balance) }}</div>
              <span class="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 rounded-full">Akan Ditinjau</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Section: Goals Bersama -->
      <div>
        <h3 class="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2 px-1 flex items-center justify-between">
          <span>Goals Bersama ({{ sharedGoals.length }})</span>
          <span class="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">Saldo Aktual</span>
        </h3>

        <div v-if="sharedGoals.length === 0" class="bg-white dark:bg-[#15171e] rounded-2xl p-4 text-center text-xs text-slate-400 dark:text-slate-500 border border-purple-50 dark:border-[#282b37]">
          Tidak ada Goals dengan kontribusi bersama.
        </div>

        <div v-else class="space-y-2.5">
          <div
            v-for="g in sharedGoals"
            :key="g.id"
            class="bg-white dark:bg-[#15171e] rounded-2xl p-4 shadow-xs border border-purple-50 dark:border-[#282b37] flex items-center justify-between"
          >
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-lg">
                {{ g.icon }}
              </div>
              <div>
                <h4 class="text-sm font-bold text-slate-900 dark:text-white">{{ g.name }}</h4>
                <p class="text-[11px] text-slate-400">Target: {{ fmtRp(g.targetAmount) }}</p>
              </div>
            </div>
            <div class="text-right">
              <div class="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">{{ fmtRp(g.actualBalance) }}</div>
              <span class="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Saldo Saat Ini</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 1 Actions -->
      <div class="pt-4">
        <button
          type="button"
          class="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none transition flex items-center justify-center gap-2 text-sm cursor-pointer"
          @click="currentStep = 2"
        >
          <span>Lanjut ke Penentuan Pembagian</span>
          <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
        </button>
      </div>

    </div>

    <!-- STEP 2: KONFIGURASI PEMBAGIAN -->
    <div v-else-if="currentStep === 2" class="space-y-5">

      <div class="bg-indigo-50/70 dark:bg-indigo-950/25 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl p-3.5 text-xs text-indigo-950 dark:text-indigo-200">
        <p class="font-bold mb-1">Tentukan Keputusan Setiap Item</p>
        <p class="text-[11.5px] text-indigo-900/80 dark:text-indigo-300 leading-relaxed">
          Pilih apakah item akan <strong>Dibagikan</strong> (Persentase atau Nominal) atau <strong>Tidak Dibagi</strong> (melanjutkan kepemilikan personal salah satu pihak).
        </p>
      </div>

      <!-- Configure Shared Accounts -->
      <div v-if="sharedAccounts.length > 0" class="space-y-4">
        <h3 class="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider px-1">Pembagian Pos Akun Bersama</h3>

        <div
          v-for="acc in sharedAccounts"
          :key="acc.id"
          class="bg-white dark:bg-[#15171e] rounded-3xl p-4 shadow-xs border border-purple-50 dark:border-[#282b37] space-y-3.5"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <span class="material-symbols-outlined text-indigo-600 dark:text-indigo-400 text-[22px]">{{ acc.icon }}</span>
              <div>
                <h4 class="text-sm font-bold text-slate-900 dark:text-white leading-tight">{{ acc.name }}</h4>
                <p class="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">{{ fmtRp(acc.balance) }}</p>
              </div>
            </div>

            <!-- Action Toggle (Bagikan vs Tidak Dibagi) -->
            <div class="flex bg-slate-100 dark:bg-[#1e2029] p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                class="px-2.5 py-1 rounded-lg transition"
                :class="accountDecisions[acc.id]?.action === 'bagikan' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'"
                @click="accountDecisions[acc.id].action = 'bagikan'"
              >
                Bagikan
              </button>
              <button
                type="button"
                class="px-2.5 py-1 rounded-lg transition"
                :class="accountDecisions[acc.id]?.action === 'tidak_dibagi' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'"
                @click="accountDecisions[acc.id].action = 'tidak_dibagi'"
              >
                Tidak Dibagi
              </button>
            </div>
          </div>

          <!-- IF BAGIKAN -->
          <div v-if="accountDecisions[acc.id]?.action === 'bagikan'" class="pt-2 border-t border-slate-100 dark:border-[#282b37] space-y-3">
            <!-- Method Segmented Control -->
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-500 dark:text-slate-400 font-medium">Metode Pembagian:</span>
              <div class="flex bg-slate-100 dark:bg-[#1e2029] p-0.5 rounded-lg text-[11px] font-semibold">
                <button
                  type="button"
                  class="px-2 py-0.5 rounded"
                  :class="accountDecisions[acc.id]?.method === 'persentase' ? 'bg-white dark:bg-[#282b37] text-indigo-700 dark:text-indigo-300 shadow-xs' : 'text-slate-500 dark:text-slate-400'"
                  @click="accountDecisions[acc.id].method = 'persentase'"
                >
                  Persentase (%)
                </button>
                <button
                  type="button"
                  class="px-2 py-0.5 rounded"
                  :class="accountDecisions[acc.id]?.method === 'nominal' ? 'bg-white dark:bg-[#282b37] text-indigo-700 dark:text-indigo-300 shadow-xs' : 'text-slate-500 dark:text-slate-400'"
                  @click="accountDecisions[acc.id].method = 'nominal'"
                >
                  Nominal (Rp)
                </button>
              </div>
            </div>

            <!-- If Percentage -->
            <div v-if="accountDecisions[acc.id]?.method === 'persentase'" class="space-y-2">
              <div class="grid grid-cols-2 gap-3 text-xs">
                <div class="bg-purple-50/60 dark:bg-indigo-950/25 p-2.5 rounded-2xl border border-purple-100 dark:border-indigo-900/40">
                  <div class="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">{{ partner1.name }} (Suami)</div>
                  <div class="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      v-model.number="accountDecisions[acc.id].partner1Pct"
                      @input="onAccountPctChange(acc.id, 'p1', accountDecisions[acc.id].partner1Pct, acc.balance)"
                      class="w-16 px-2 py-1 bg-white dark:bg-[#1e2029] border border-purple-200 dark:border-[#2e313d] rounded-lg font-bold text-center text-sm text-slate-800 dark:text-white"
                    />
                    <span class="font-bold text-slate-700 dark:text-slate-300">%</span>
                  </div>
                  <div class="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                    {{ fmtRp(accountDecisions[acc.id].partner1Amount) }}
                  </div>
                </div>

                <div class="bg-pink-50/60 dark:bg-pink-950/25 p-2.5 rounded-2xl border border-pink-100 dark:border-pink-900/40">
                  <div class="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">{{ partner2.name }} (Istri)</div>
                  <div class="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      v-model.number="accountDecisions[acc.id].partner2Pct"
                      @input="onAccountPctChange(acc.id, 'p2', accountDecisions[acc.id].partner2Pct, acc.balance)"
                      class="w-16 px-2 py-1 bg-white dark:bg-[#1e2029] border border-pink-200 dark:border-[#2e313d] rounded-lg font-bold text-center text-sm text-slate-800 dark:text-white"
                    />
                    <span class="font-bold text-slate-700 dark:text-slate-300">%</span>
                  </div>
                  <div class="text-[11px] font-bold text-pink-600 dark:text-pink-400 mt-1">
                    {{ fmtRp(accountDecisions[acc.id].partner2Amount) }}
                  </div>
                </div>
              </div>

              <div v-if="accountDecisions[acc.id].partner1Pct + accountDecisions[acc.id].partner2Pct !== 100" class="text-rose-600 dark:text-rose-400 text-[11px] font-semibold">
                ⚠ Total persentase harus tepat 100% (saat ini {{ accountDecisions[acc.id].partner1Pct + accountDecisions[acc.id].partner2Pct }}%).
              </div>
            </div>

            <!-- If Nominal -->
            <div v-else class="space-y-2">
              <div class="grid grid-cols-2 gap-3 text-xs">
                <div class="bg-purple-50/60 dark:bg-indigo-950/25 p-2.5 rounded-2xl border border-purple-100 dark:border-indigo-900/40">
                  <div class="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">{{ partner1.name }} (Suami)</div>
                  <input
                    type="number"
                    min="0"
                    v-model.number="accountDecisions[acc.id].partner1Amount"
                    class="w-full px-2 py-1.5 bg-white dark:bg-[#1e2029] border border-purple-200 dark:border-[#2e313d] rounded-lg font-bold text-xs text-slate-800 dark:text-white"
                    placeholder="Nominal Rp"
                  />
                </div>

                <div class="bg-pink-50/60 dark:bg-pink-950/25 p-2.5 rounded-2xl border border-pink-100 dark:border-pink-900/40">
                  <div class="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">{{ partner2.name }} (Istri)</div>
                  <input
                    type="number"
                    min="0"
                    v-model.number="accountDecisions[acc.id].partner2Amount"
                    class="w-full px-2 py-1.5 bg-white dark:bg-[#1e2029] border border-pink-200 dark:border-[#2e313d] rounded-lg font-bold text-xs text-slate-800 dark:text-white"
                    placeholder="Nominal Rp"
                  />
                </div>
              </div>

              <!-- Validation Message -->
              <div v-if="accountDecisions[acc.id].partner1Amount + accountDecisions[acc.id].partner2Amount !== acc.balance" class="text-rose-600 dark:text-rose-400 text-[11px] font-semibold">
                <span v-if="accountDecisions[acc.id].partner1Amount + accountDecisions[acc.id].partner2Amount < acc.balance">
                  ⚠ Masih ada {{ fmtRp(acc.balance - (accountDecisions[acc.id].partner1Amount + accountDecisions[acc.id].partner2Amount)) }} yang belum dialokasikan.
                </span>
                <span v-else>
                  ⚠ Total pembagian melebihi saldo yang tersedia (kelebihan {{ fmtRp((accountDecisions[acc.id].partner1Amount + accountDecisions[acc.id].partner2Amount) - acc.balance) }}).
                </span>
              </div>
            </div>
          </div>

          <!-- IF TIDAK DIBAGI -->
          <div v-else class="pt-2 border-t border-slate-100 dark:border-[#282b37] space-y-2 text-xs">
            <span class="text-slate-500 dark:text-slate-400 font-medium">Kepemilikan personal setelah pemisahan:</span>
            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                class="py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer"
                :class="accountDecisions[acc.id]?.keepFor === 'partner1' ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' : 'bg-slate-50 dark:bg-[#1e2029] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#2e313d]'"
                @click="accountDecisions[acc.id].keepFor = 'partner1'"
              >
                Tetap pada {{ partner1.name }}
              </button>
              <button
                type="button"
                class="py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer"
                :class="accountDecisions[acc.id]?.keepFor === 'partner2' ? 'bg-pink-600 text-white border-pink-600 shadow-xs' : 'bg-slate-50 dark:bg-[#1e2029] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#2e313d]'"
                @click="accountDecisions[acc.id].keepFor = 'partner2'"
              >
                Tetap pada {{ partner2.name }}
              </button>
            </div>
          </div>

        </div>
      </div>

      <!-- Configure Shared Goals -->
      <div v-if="sharedGoals.length > 0" class="space-y-4">
        <h3 class="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider px-1">Pembagian Goals Bersama</h3>

        <div
          v-for="g in sharedGoals"
          :key="g.id"
          class="bg-white dark:bg-[#15171e] rounded-3xl p-4 shadow-xs border border-purple-50 dark:border-[#282b37] space-y-3.5"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <span class="text-2xl">{{ g.icon }}</span>
              <div>
                <h4 class="text-sm font-bold text-slate-900 dark:text-white leading-tight">{{ g.name }}</h4>
                <div class="flex items-center gap-1.5 mt-0.5">
                  <span class="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">{{ fmtRp(g.actualBalance) }}</span>
                  <span class="text-[10px] text-slate-400">(Saldo Aktual)</span>
                </div>
              </div>
            </div>

            <div class="flex bg-slate-100 dark:bg-[#1e2029] p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                class="px-2.5 py-1 rounded-lg transition"
                :class="goalDecisions[g.id]?.action === 'bagikan' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'"
                @click="goalDecisions[g.id].action = 'bagikan'"
              >
                Bagikan
              </button>
              <button
                type="button"
                class="px-2.5 py-1 rounded-lg transition"
                :class="goalDecisions[g.id]?.action === 'tidak_dibagi' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'"
                @click="goalDecisions[g.id].action = 'tidak_dibagi'"
              >
                Tidak Dibagi
              </button>
            </div>
          </div>

          <!-- Subtext regarding target vs actual -->
          <p class="text-[11px] text-slate-400 dark:text-slate-400 bg-slate-50 dark:bg-[#1e2029]/60 p-2 rounded-xl">
            Target Goal: {{ fmtRp(g.targetAmount) }} • Sesuai aturan, nilai yang diselesaikan adalah <strong>saldo aktual tabungan saat ini</strong> ({{ fmtRp(g.actualBalance) }}).
          </p>

          <!-- IF BAGIKAN GOAL -->
          <div v-if="goalDecisions[g.id]?.action === 'bagikan'" class="pt-2 border-t border-slate-100 dark:border-[#282b37] space-y-3">
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-500 dark:text-slate-400 font-medium">Metode Pembagian:</span>
              <div class="flex bg-slate-100 dark:bg-[#1e2029] p-0.5 rounded-lg text-[11px] font-semibold">
                <button
                  type="button"
                  class="px-2 py-0.5 rounded"
                  :class="goalDecisions[g.id]?.method === 'persentase' ? 'bg-white dark:bg-[#282b37] text-indigo-700 dark:text-indigo-300 shadow-xs' : 'text-slate-500 dark:text-slate-400'"
                  @click="goalDecisions[g.id].method = 'persentase'"
                >
                  Persentase (%)
                </button>
                <button
                  type="button"
                  class="px-2 py-0.5 rounded"
                  :class="goalDecisions[g.id]?.method === 'nominal' ? 'bg-white dark:bg-[#282b37] text-indigo-700 dark:text-indigo-300 shadow-xs' : 'text-slate-500 dark:text-slate-400'"
                  @click="goalDecisions[g.id].method = 'nominal'"
                >
                  Nominal (Rp)
                </button>
              </div>
            </div>

            <div v-if="goalDecisions[g.id]?.method === 'persentase'" class="space-y-2">
              <div class="grid grid-cols-2 gap-3 text-xs">
                <div class="bg-purple-50/60 dark:bg-indigo-950/25 p-2.5 rounded-2xl border border-purple-100 dark:border-indigo-900/40">
                  <div class="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">{{ partner1.name }} (Suami)</div>
                  <div class="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      v-model.number="goalDecisions[g.id].partner1Pct"
                      @input="onGoalPctChange(g.id, 'p1', goalDecisions[g.id].partner1Pct, g.actualBalance)"
                      class="w-16 px-2 py-1 bg-white dark:bg-[#1e2029] border border-purple-200 dark:border-[#2e313d] rounded-lg font-bold text-center text-sm text-slate-800 dark:text-white"
                    />
                    <span class="font-bold text-slate-700 dark:text-slate-300">%</span>
                  </div>
                  <div class="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                    {{ fmtRp(goalDecisions[g.id].partner1Amount) }}
                  </div>
                </div>

                <div class="bg-pink-50/60 dark:bg-pink-950/25 p-2.5 rounded-2xl border border-pink-100 dark:border-pink-900/40">
                  <div class="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">{{ partner2.name }} (Istri)</div>
                  <div class="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      v-model.number="goalDecisions[g.id].partner2Pct"
                      @input="onGoalPctChange(g.id, 'p2', goalDecisions[g.id].partner2Pct, g.actualBalance)"
                      class="w-16 px-2 py-1 bg-white dark:bg-[#1e2029] border border-pink-200 dark:border-[#2e313d] rounded-lg font-bold text-center text-sm text-slate-800 dark:text-white"
                    />
                    <span class="font-bold text-slate-700 dark:text-slate-300">%</span>
                  </div>
                  <div class="text-[11px] font-bold text-pink-600 dark:text-pink-400 mt-1">
                    {{ fmtRp(goalDecisions[g.id].partner2Amount) }}
                  </div>
                </div>
              </div>

              <div v-if="goalDecisions[g.id].partner1Pct + goalDecisions[g.id].partner2Pct !== 100" class="text-rose-600 dark:text-rose-400 text-[11px] font-semibold">
                ⚠ Total persentase harus tepat 100% (saat ini {{ goalDecisions[g.id].partner1Pct + goalDecisions[g.id].partner2Pct }}%).
              </div>
            </div>

            <div v-else class="space-y-2">
              <div class="grid grid-cols-2 gap-3 text-xs">
                <div class="bg-purple-50/60 dark:bg-indigo-950/25 p-2.5 rounded-2xl border border-purple-100 dark:border-indigo-900/40">
                  <div class="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">{{ partner1.name }} (Suami)</div>
                  <input
                    type="number"
                    min="0"
                    v-model.number="goalDecisions[g.id].partner1Amount"
                    class="w-full px-2 py-1.5 bg-white dark:bg-[#1e2029] border border-purple-200 dark:border-[#2e313d] rounded-lg font-bold text-xs text-slate-800 dark:text-white"
                    placeholder="Nominal Rp"
                  />
                </div>

                <div class="bg-pink-50/60 dark:bg-pink-950/25 p-2.5 rounded-2xl border border-pink-100 dark:border-pink-900/40">
                  <div class="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">{{ partner2.name }} (Istri)</div>
                  <input
                    type="number"
                    min="0"
                    v-model.number="goalDecisions[g.id].partner2Amount"
                    class="w-full px-2 py-1.5 bg-white dark:bg-[#1e2029] border border-pink-200 dark:border-[#2e313d] rounded-lg font-bold text-xs text-slate-800 dark:text-white"
                    placeholder="Nominal Rp"
                  />
                </div>
              </div>

              <div v-if="goalDecisions[g.id].partner1Amount + goalDecisions[g.id].partner2Amount !== g.actualBalance" class="text-rose-600 dark:text-rose-400 text-[11px] font-semibold">
                <span v-if="goalDecisions[g.id].partner1Amount + goalDecisions[g.id].partner2Amount < g.actualBalance">
                  ⚠ Masih ada {{ fmtRp(g.actualBalance - (goalDecisions[g.id].partner1Amount + goalDecisions[g.id].partner2Amount)) }} yang belum dialokasikan.
                </span>
                <span v-else>
                  ⚠ Total pembagian melebihi saldo aktual goal (kelebihan {{ fmtRp((goalDecisions[g.id].partner1Amount + goalDecisions[g.id].partner2Amount) - g.actualBalance) }}).
                </span>
              </div>
            </div>
          </div>

          <!-- IF TIDAK DIBAGI GOAL -->
          <div v-else class="pt-2 border-t border-slate-100 dark:border-[#282b37] space-y-2 text-xs">
            <span class="text-slate-500 dark:text-slate-400 font-medium">Kepemilikan personal setelah pemisahan:</span>
            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                class="py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer"
                :class="goalDecisions[g.id]?.keepFor === 'partner1' ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' : 'bg-slate-50 dark:bg-[#1e2029] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#2e313d]'"
                @click="goalDecisions[g.id].keepFor = 'partner1'"
              >
                Tetap pada {{ partner1.name }}
              </button>
              <button
                type="button"
                class="py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer"
                :class="goalDecisions[g.id]?.keepFor === 'partner2' ? 'bg-pink-600 text-white border-pink-600 shadow-xs' : 'bg-slate-50 dark:bg-[#1e2029] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#2e313d]'"
                @click="goalDecisions[g.id].keepFor = 'partner2'"
              >
                Tetap pada {{ partner2.name }}
              </button>
            </div>
          </div>

        </div>
      </div>

      <!-- Navigation Step 2 -->
      <div class="flex items-center gap-3 pt-4">
        <button
          type="button"
          class="flex-1 py-3 px-4 bg-slate-100 dark:bg-[#1e2029] hover:bg-slate-200 dark:hover:bg-[#252834] font-bold rounded-2xl text-slate-700 dark:text-slate-200 text-xs transition cursor-pointer"
          @click="currentStep = 1"
        >
          Kembali
        </button>
        <button
          type="button"
          :disabled="!isStep2Valid"
          class="flex-[2] py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 active:scale-[0.99] text-white font-bold rounded-2xl shadow-md dark:shadow-none transition flex items-center justify-center gap-1.5 text-xs cursor-pointer"
          @click="currentStep = 3"
        >
          <span>Lanjut ke Review Pemisahan</span>
          <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
        </button>
      </div>

    </div>

    <!-- STEP 3: REVIEW PEMISAHAN -->
    <div v-else-if="currentStep === 3" class="space-y-5">

      <!-- SECTION 1: HARTA YANG DIBAGI -->
      <div class="bg-white dark:bg-[#15171e] rounded-3xl p-5 shadow-xs border border-purple-50 dark:border-[#282b37] space-y-3.5">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-indigo-600 dark:text-indigo-400 text-[20px]">handshake</span>
          <h3 class="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Bagian 1: Harta yang Dibagi</h3>
        </div>

        <div class="grid grid-cols-2 gap-3 text-xs mb-3">
          <div class="bg-purple-50/70 dark:bg-indigo-950/25 p-3 rounded-2xl border border-purple-100 dark:border-indigo-900/40">
            <div class="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Total Diterima {{ partner1.name }}</div>
            <div class="text-base font-extrabold text-indigo-700 dark:text-indigo-400 mt-0.5">{{ fmtRp(reviewPartner1Total) }}</div>
          </div>
          <div class="bg-pink-50/70 dark:bg-pink-950/25 p-3 rounded-2xl border border-pink-100 dark:border-pink-900/40">
            <div class="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Total Diterima {{ partner2.name }}</div>
            <div class="text-base font-extrabold text-pink-700 dark:text-pink-400 mt-0.5">{{ fmtRp(reviewPartner2Total) }}</div>
          </div>
        </div>

        <!-- Accounts summary -->
        <div class="space-y-2 text-xs">
          <div v-for="acc in sharedAccounts" :key="acc.id" class="p-2.5 bg-slate-50 dark:bg-[#1e2029] rounded-xl flex items-center justify-between">
            <div>
              <span class="font-bold text-slate-900 dark:text-white">{{ acc.name }}</span>
              <span class="text-[11px] text-slate-400 block">{{ fmtRp(acc.balance) }}</span>
            </div>
            <div class="text-right text-[11.5px]">
              <span v-if="accountDecisions[acc.id]?.action === 'bagikan'">
                {{ partner1.name }}: <strong class="text-slate-900 dark:text-white">{{ fmtRp(accountDecisions[acc.id]?.partner1Amount) }}</strong><br/>
                {{ partner2.name }}: <strong class="text-slate-900 dark:text-white">{{ fmtRp(accountDecisions[acc.id]?.partner2Amount) }}</strong>
              </span>
              <span v-else class="font-bold text-slate-700 dark:text-slate-200">
                Tetap pada {{ accountDecisions[acc.id]?.keepFor === 'partner1' ? partner1.name : partner2.name }}
              </span>
            </div>
          </div>

          <!-- Goals summary -->
          <div v-for="g in sharedGoals" :key="g.id" class="p-2.5 bg-slate-50 dark:bg-[#1e2029] rounded-xl flex items-center justify-between">
            <div>
              <span class="font-bold text-slate-900 dark:text-white">{{ g.name }}</span>
              <span class="text-[11px] text-slate-400 block">Saldo: {{ fmtRp(g.actualBalance) }}</span>
            </div>
            <div class="text-right text-[11.5px]">
              <span v-if="goalDecisions[g.id]?.action === 'bagikan'">
                {{ partner1.name }}: <strong class="text-slate-900 dark:text-white">{{ fmtRp(goalDecisions[g.id]?.partner1Amount) }}</strong><br/>
                {{ partner2.name }}: <strong class="text-slate-900 dark:text-white">{{ fmtRp(goalDecisions[g.id]?.partner2Amount) }}</strong>
              </span>
              <span v-else class="font-bold text-slate-700 dark:text-slate-200">
                Tetap pada {{ goalDecisions[g.id]?.keepFor === 'partner1' ? partner1.name : partner2.name }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- SECTION 2: DATA YANG AKAN DIPISAHKAN (NON-SETTLEMENT) -->
      <div class="bg-white dark:bg-[#15171e] rounded-3xl p-5 shadow-xs border border-purple-50 dark:border-[#282b37] space-y-3">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-purple-600 dark:text-indigo-400 text-[20px]">folder_copy</span>
          <h3 class="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Bagian 2: Data yang Dipisahkan Mandiri</h3>
        </div>

        <p class="text-[11.5px] text-slate-600 dark:text-slate-300 leading-relaxed">
          Data di bawah ini <strong>tidak dibagi secara nominal</strong>, melainkan dipisahkan menjadi master data personal masing-masing tanpa menduplikasi riwayat transaksi.
        </p>

        <div class="grid grid-cols-2 gap-2.5 text-xs">
          <div class="p-3 bg-slate-50 dark:bg-[#1e2029] rounded-2xl">
            <div class="text-lg font-extrabold text-slate-900 dark:text-white">{{ nonSettlementSummary.categoriesCount }} Kategori</div>
            <p class="text-[10.5px] text-slate-400 mt-0.5">Menjadi kategori personal masing-masing</p>
          </div>
          <div class="p-3 bg-slate-50 dark:bg-[#1e2029] rounded-2xl">
            <div class="text-lg font-extrabold text-slate-900 dark:text-white">{{ nonSettlementSummary.budgetsCount }} Budget</div>
            <p class="text-[10.5px] text-slate-400 mt-0.5">Menjadi limit budget personal masing-masing</p>
          </div>
          <div class="p-3 bg-slate-50 dark:bg-[#1e2029] rounded-2xl">
            <div class="text-lg font-extrabold text-slate-900 dark:text-white">{{ nonSettlementSummary.billsCount }} Tagihan</div>
            <p class="text-[10.5px] text-slate-400 mt-0.5">Menjadi pengingat tagihan personal</p>
          </div>
          <div class="p-3 bg-slate-50 dark:bg-[#1e2029] rounded-2xl">
            <div class="text-lg font-extrabold text-slate-900 dark:text-white">{{ nonSettlementSummary.debtsCount }} Kewajiban</div>
            <p class="text-[10.5px] text-slate-400 mt-0.5">Mengikuti penanggung jawab existing</p>
          </div>
        </div>
      </div>

      <!-- Disclaimer Note -->
      <p class="text-[11px] text-center text-slate-400 px-3">
        CoupleCash memfasilitasi pencatatan dan kalkulasi berdasarkan input dan kesepakatan kedua pengguna secara mandiri.
      </p>

      <!-- Navigation Step 3 -->
      <div class="flex items-center gap-3 pt-2">
        <button
          type="button"
          class="flex-1 py-3 px-4 bg-slate-100 dark:bg-[#1e2029] hover:bg-slate-200 dark:hover:bg-[#252834] font-bold rounded-2xl text-slate-700 dark:text-slate-200 text-xs transition cursor-pointer"
          @click="currentStep = 2"
        >
          Ubah Pembagian
        </button>
        <button
          type="button"
          class="flex-[2] py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-bold rounded-2xl shadow-md dark:shadow-none transition flex items-center justify-center gap-1.5 text-xs cursor-pointer"
          @click="currentStep = 4"
        >
          <span>Konfirmasi Final</span>
          <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
        </button>
      </div>

    </div>

    <!-- STEP 4: KONFIRMASI FINAL -->
    <div v-else-if="currentStep === 4" class="space-y-5">

      <div class="bg-rose-50 dark:bg-rose-950/25 border border-rose-100 dark:border-rose-900/40 rounded-3xl p-5 text-center space-y-3">
        <div class="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
          <span class="material-symbols-outlined text-[32px]">warning</span>
        </div>

        <h3 class="text-lg font-extrabold text-slate-900 dark:text-white">Siap Memisahkan Keuangan?</h3>
        <p class="text-xs text-rose-950/80 dark:text-rose-200 leading-relaxed text-left">
          Pos Akun dan Goals yang Anda pilih akan diproses sesuai kesepakatan pembagian. Kategori, budget, dan tagihan akan dipisahkan menjadi data personal masing-masing. Status keluarga akan diakhiri dan kedua akun kembali ke mode independen.
        </p>

        <div class="pt-2 border-t border-rose-200/60 dark:border-rose-900/40 text-left">
          <label class="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              v-model="userConfirmed"
              class="w-4 h-4 rounded mt-0.5 text-rose-600 focus:ring-rose-500 cursor-pointer"
            />
            <span class="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-snug">
              Saya telah memeriksa hasil pemisahan dan setuju untuk memproses pemisahan data ini.
            </span>
          </label>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="space-y-2.5 pt-2">
        <button
          type="button"
          :disabled="!userConfirmed || submitting"
          class="w-full py-4 px-4 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 active:scale-[0.99] text-white font-bold rounded-2xl shadow-lg shadow-rose-200 dark:shadow-none transition flex items-center justify-center gap-2 text-sm cursor-pointer"
          @click="handleExecuteSettlement"
        >
          <span v-if="submitting" class="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
          <span v-else class="material-symbols-outlined text-[18px]">lock_reset</span>
          <span>{{ submitting ? 'Memproses Pemisahan Data...' : 'Konfirmasi & Pisahkan Keuangan' }}</span>
        </button>

        <button
          type="button"
          :disabled="submitting"
          class="w-full py-3 px-4 bg-slate-100 dark:bg-[#1e2029] hover:bg-slate-200 dark:hover:bg-[#252834] font-bold rounded-2xl text-slate-700 dark:text-slate-200 text-xs transition cursor-pointer"
          @click="currentStep = 3"
        >
          Kembali ke Review
        </button>
      </div>

    </div>

  </div>
</template>

<style scoped>
.harta-page {
  font-family: inherit;
}
</style>
