<script setup lang="ts">
definePageMeta({ layout: 'app' })

useHead({
  title: 'Beranda — CoupleCash',
})

const { currentHousehold, hasPartner, currentUser, isBalanceHidden, toggleBalanceVisibility, openSyncModal, getAuthToken, currentToken, logout } = useAuth()

interface DashboardData {
  totalBalance: number
  totalBalanceText: string
  breakdown: { suami: number; istri: number; bersama: number; sendiri?: number }
  monthlyChange: {
    pct: number
    direction: 'up' | 'down' | 'flat'
    label: string
  }
  couple: { suami: string; istri: string }
  totalDebt?: number
  totalDebtText?: string
  activeDebtCount?: number
  debtItems?: Array<{
    id: string
    name: string
    type: 'negative_balance' | 'manual_debt'
    icon: string
    ownerType: string
    amount: number
    amountText: string
    badgeText: string
    subtitle: string
    sourceAccountId: string
  }>
  accounts: Array<{
    id: string
    icon: string
    name: string
    ownerLabel: string
    ownerType: string
    balance: number
    balanceText: string
    number: string | null
  }>
  activeAssetAccounts?: Array<{
    id: string
    name: string
    balance: number
    balanceText: string
    ownerType: string
    ownerLabel: string
  }>
  transactions: Array<{
    id: string
    icon: string
    name: string
    meta: string
    amountText: string
    type: string
    owner: string
    previousRole?: string | null
  }>
}

if (import.meta.client && !currentToken.value) {
  await getAuthToken()
}

const dashboardFetchKey = computed(() => `dashboard-${currentUser.value?.id || 'guest'}`)
const billsFetchKey = computed(() => `bills-${currentUser.value?.id || 'guest'}`)

const { data, refresh, error: dashboardError } = await useFetch<DashboardData>('/api/dashboard', {
  key: dashboardFetchKey.value,
  watch: [currentToken],
  headers: computed(() => {
    const t = currentToken.value
    return t ? { Authorization: `Bearer ${t}` } : {}
  }),
})

// Bills & Subscriptions data fetch
const { data: billsResponse, refresh: refreshBills, error: billsError } = await useFetch<any>('/api/bills', {
  key: billsFetchKey.value,
  watch: [currentToken],
  headers: computed(() => {
    const t = currentToken.value
    return t ? { Authorization: `Bearer ${t}` } : {}
  }),
})

// Re-fetch data when partner is linked/synced or user changes
watch([hasPartner, () => currentUser.value?.id], async () => {
  if (currentToken.value) {
    await Promise.all([refresh(), refreshBills()]).catch(() => {})
  }
})

const { startTour, shouldTriggerTour } = useWalkthrough()

onMounted(async () => {
  if (import.meta.client) {
    if (!currentToken.value) {
      const token = await getAuthToken()
      if (!token) {
        await logout(false)
        navigateTo('/auth/login')
        return
      }
    }

    if (dashboardError.value?.statusCode === 401 || billsError.value?.statusCode === 401) {
      const token = await getAuthToken()
      if (!token) {
        await logout(false)
        navigateTo('/auth/login')
        return
      }
    }

    // Ensure real-time freshness when mounting component
    try {
      await Promise.all([refresh(), refreshBills()])
    } catch (e: any) {
      if (e?.statusCode === 401) {
        await logout(false)
        navigateTo('/auth/login')
        return
      }
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('couple-synced', () => {
      if (currentToken.value) {
        refresh().catch(() => {})
        refreshBills().catch(() => {})
      }
    })
  }

  // Trigger walkthrough tour for Beranda if not seen yet
  setTimeout(() => {
    if (shouldTriggerTour('beranda')) {
      startTour('beranda')
    }
  }, 500)
})

const billTabFilter = ref<'pending' | 'paid'>('pending')
const billsList = computed(() => billsResponse.value?.data ?? [])
const billsSummary = computed(() => billsResponse.value?.summary ?? {
  totalUnpaid: 0,
  totalUnpaidText: 'Rp 0',
  urgentCount: 0,
  overdueCount: 0,
  pendingCount: 0,
  paidCount: 0
})

const filteredBills = computed(() => {
  if (billTabFilter.value === 'pending') {
    return billsList.value.filter((b: any) => b.status === 'pending')
  }
  return billsList.value.filter((b: any) => b.status === 'lunas')
})

function getBillIcon(name: string) {
  const n = (name || '').toLowerCase()
  if (n.includes('listrik') || n.includes('pln') || n.includes('token')) return 'bolt'
  if (n.includes('internet') || n.includes('wifi') || n.includes('indihome') || n.includes('biznet') || n.includes('myrepublic')) return 'wifi'
  if (n.includes('air') || n.includes('pdam')) return 'water_drop'
  if (n.includes('bpjs') || n.includes('asuransi') || n.includes('kesehatan')) return 'health_and_safety'
  if (n.includes('netflix') || n.includes('spotify') || n.includes('disney') || n.includes('youtube')) return 'subscriptions'
  if (n.includes('sewa') || n.includes('kontrakan') || n.includes('kos') || n.includes('apartemen')) return 'home_work'
  if (n.includes('kartu kredit') || n.includes('cc') || n.includes('cicilan')) return 'credit_card'
  if (n.includes('pulsa') || n.includes('paket data') || n.includes('telkomsel') || n.includes('indosat') || n.includes('xl')) return 'smartphone'
  return 'receipt_long'
}

function fmtBalance(n: number) {
  const num = Number(n) || 0
  const prefix = num < 0 ? '-' : ''
  return prefix + Math.abs(num).toLocaleString('id-ID').replace(/,/g, '.')
}

function fmtRp(n: number) {
  const num = Number(n) || 0
  const prefix = num < 0 ? '-Rp ' : 'Rp '
  return prefix + Math.abs(num).toLocaleString('id-ID')
}

const isTotalNegative = computed(() => {
  return (data.value?.totalBalance ?? 0) < 0
})

const displayBalance = computed(() => {
  if (isBalanceHidden.value) return '***.***.***'
  const val = data.value?.totalBalance ?? 0
  return fmtBalance(val)
})

const breakdownData = computed(() => data.value?.breakdown ?? { suami: 0, istri: 0, bersama: 0 })
const accounts = computed(() => data.value?.accounts ?? [])
const transactions = computed(() => data.value?.transactions ?? [])
const monthlyChange = computed(() => data.value?.monthlyChange ?? { pct: 0, direction: 'flat', label: '0%' })
const suamiName = computed(() => currentHousehold.value?.suami?.firstName || 'Suami')
const istriName = computed(() => currentHousehold.value?.istri?.firstName || 'Istri')

const totalDebt = computed(() => data.value?.totalDebt ?? 0)
const totalDebtText = computed(() => data.value?.totalDebtText ?? 'Rp 0')
const activeDebtCount = computed(() => data.value?.activeDebtCount ?? 0)
const debtItems = computed(() => data.value?.debtItems ?? [])
const activeAssetAccounts = computed(() => data.value?.activeAssetAccounts ?? [])

// Debt payment modal state
const isDebtModalOpen = ref(false)
const activeDebtItem = ref<any>(null)
const selectedSourceAccountId = ref('')
const isPayingDebt = ref(false)
const debtPaymentError = ref('')
const customDebtPayAmount = ref<number>(0)
const isDebtOverpayModalOpen = ref(false)
const newDebtAccountType = ref<'bank' | 'e_wallet' | 'cash' | 'deposito'>('bank')

const debtAccountTypeOptions = [
  { value: 'bank', label: 'Rekening Bank', desc: 'Ubah menjadi saldo rekening tabungan', icon: 'account_balance' },
  { value: 'e_wallet', label: 'E-Wallet', desc: 'Ubah menjadi dompet digital', icon: 'account_balance_wallet' },
  { value: 'cash', label: 'Kas Tunai', desc: 'Ubah menjadi uang tunai di dompet', icon: 'payments' },
  { value: 'deposito', label: 'Deposito', desc: 'Ubah menjadi simpanan / investasi', icon: 'savings' },
]

function openDebtModal(item: any) {
  activeDebtItem.value = item
  customDebtPayAmount.value = item.amount
  selectedSourceAccountId.value = activeAssetAccounts.value[0]?.id || ''
  debtPaymentError.value = ''
  isDebtModalOpen.value = true
}

function handleDebtPaymentSubmit() {
  if (!activeDebtItem.value || !selectedSourceAccountId.value) return
  const amountToPay = customDebtPayAmount.value || activeDebtItem.value.amount
  if (amountToPay > activeDebtItem.value.amount) {
    isDebtOverpayModalOpen.value = true
    return
  }
  executeDebtPayment()
}

async function confirmOverpayAndExecute() {
  isDebtOverpayModalOpen.value = false
  await executeDebtPayment(newDebtAccountType.value)
}

async function executeDebtPayment(chosenNewType?: string) {
  if (!activeDebtItem.value || !selectedSourceAccountId.value) return
  isPayingDebt.value = true
  debtPaymentError.value = ''
  try {
    const t = await getAuthToken()
    const amountToPay = customDebtPayAmount.value || activeDebtItem.value.amount
    await $fetch('/api/accounts/pay-debt', {
      method: 'POST',
      headers: t ? { Authorization: `Bearer ${t}` } : {},
      body: {
        targetAccountId: activeDebtItem.value.sourceAccountId,
        sourceAccountId: selectedSourceAccountId.value,
        amount: amountToPay,
        newAccountType: chosenNewType || null,
      },
    })
    isDebtModalOpen.value = false
    await Promise.all([refresh(), refreshBills()])
  } catch (err: any) {
    debtPaymentError.value = err?.statusMessage || err?.message || 'Gagal memproses pembayaran hutang'
  } finally {
    isPayingDebt.value = false
  }
}

// Bill payment modal state
const isPayBillModalOpen = ref(false)
const activePayBill = ref<any>(null)
const selectedPayAccountId = ref('')
const isSubmittingPayBill = ref(false)
const payBillError = ref('')

const selectableAccountsForBill = computed(() => {
  const role = currentUser.value?.role
  return activeAssetAccounts.value.filter((a: any) => {
    if (!role) return true
    if (role === 'suami') return a.ownerType === 'suami' || a.ownerType === 'bersama'
    if (role === 'istri') return a.ownerType === 'istri' || a.ownerType === 'bersama'
    return true
  })
})

const selectedPayAccount = computed(() => {
  return activeAssetAccounts.value.find((a: any) => a.id === selectedPayAccountId.value)
})

function openPayBillModal(bill: any) {
  activePayBill.value = bill
  payBillError.value = ''
  const matchingAcc = selectableAccountsForBill.value.find((a: any) => a.balance >= bill.amount)
  selectedPayAccountId.value = matchingAcc?.id || selectableAccountsForBill.value[0]?.id || ''
  isPayBillModalOpen.value = true
}

async function confirmPayBill() {
  if (!activePayBill.value || !selectedPayAccountId.value) return
  isSubmittingPayBill.value = true
  payBillError.value = ''
  try {
    const t = await getAuthToken()
    await $fetch('/api/bills/pay', {
      method: 'POST',
      headers: t ? { Authorization: `Bearer ${t}` } : {},
      body: {
        billId: activePayBill.value.id,
        sourceAccountId: selectedPayAccountId.value
      }
    })
    isPayBillModalOpen.value = false
    await Promise.all([refresh(), refreshBills()])
  } catch (err: any) {
    payBillError.value = err?.data?.message || err?.statusMessage || err?.message || 'Gagal memproses pembayaran tagihan'
  } finally {
    isSubmittingPayBill.value = false
  }
}



function stripClass(owner: string) {
  return owner === 'bersama' ? 'primary' : owner
}

function getAccountDisplayBalance(accText: string) {
  if (isBalanceHidden.value) return 'Rp •••••••'
  return accText
}
</script>

<template>
  <div class="beranda-page animate-fade-in">

    <!-- Hero Balance Card -->
    <section class="section-hero">
      <div class="hero-card">
        <!-- Decorative blobs -->
        <div class="hero-blob hero-blob--1"></div>
        <div class="hero-blob hero-blob--2"></div>

        <!-- Header Hero Top -->
        <div class="hero-top">
          <span class="hero-label">{{ hasPartner ? 'Total Saldo Bersama' : 'Total Saldo Saya' }}</span>
          <button
            id="btn-toggle-balance"
            class="hero-eye-btn"
            @click="toggleBalanceVisibility"
            :aria-label="isBalanceHidden ? 'Tampilkan semua saldo' : 'Sembunyikan semua saldo'"
          >
            <span class="material-symbols-outlined" style="font-size:18px">
              {{ isBalanceHidden ? 'visibility_off' : 'visibility' }}
            </span>
          </button>
        </div>

        <div class="hero-balance">
          <div class="hero-amount">
            <span class="hero-currency">{{ isTotalNegative && !isBalanceHidden ? '-Rp' : 'Rp' }}</span>
            <span class="hero-number tabular-nums" :class="{ 'hero-number--hidden': isBalanceHidden }">
              {{ displayBalance.replace(/^-/, '') }}
            </span>
          </div>
          <div class="hero-badge" :class="monthlyChange.direction === 'down' ? 'hero-badge--down' : ''">
            <span class="material-symbols-outlined" style="font-size:14px">
              {{ monthlyChange.direction === 'down' ? 'arrow_downward' : 'arrow_upward' }}
            </span>
            <span>{{ monthlyChange.label }}</span>
            <span class="hero-badge-sub">Bulan ini</span>
          </div>
        </div>

        <!-- Mini breakdown (JIKA SUDAH BERPASANGAN) -->
        <div v-if="hasPartner" class="hero-breakdown">
          <div class="hero-breakdown-item">
            <div class="breakdown-dot breakdown-dot--suami"></div>
            <div>
              <p class="breakdown-label">Suami ({{ suamiName }})</p>
              <p class="breakdown-amount tabular-nums">
                {{ isBalanceHidden ? 'Rp •••••••' : fmtRp(breakdownData.suami) }}
              </p>
            </div>
          </div>
          <div class="hero-breakdown-divider"></div>
          <div class="hero-breakdown-item">
            <div class="breakdown-dot breakdown-dot--istri"></div>
            <div>
              <p class="breakdown-label">Istri ({{ istriName }})</p>
              <p class="breakdown-amount tabular-nums">
                {{ isBalanceHidden ? 'Rp •••••••' : fmtRp(breakdownData.istri) }}
              </p>
            </div>
          </div>
          <div class="hero-breakdown-divider"></div>
          <div class="hero-breakdown-item">
            <div class="breakdown-dot breakdown-dot--bersama"></div>
            <div>
              <p class="breakdown-label">Bersama</p>
              <p class="breakdown-amount tabular-nums">
                {{ isBalanceHidden ? 'Rp •••••••' : fmtRp(breakdownData.bersama) }}
              </p>
            </div>
          </div>
        </div>

        <!-- Single Partner Add Button (JIKA BELUM BERPASANGAN) -->
        <div v-else class="hero-unpaired-breakdown" @click="openSyncModal">
          <div class="unpaired-add-circle">
            <span class="material-symbols-outlined text-[18px]">add</span>
          </div>
          <span class="unpaired-add-text">tambahkan pasangan anda</span>
        </div>

      </div>
    </section>

    <!-- Pos Akun Finansial -->
    <section class="section">
      <div class="section-header px-page">
        <h2 class="section-title">Pos Akun Finansial</h2>
        <NuxtLink to="/akun/kelola-akun" class="section-action">Lihat Semua</NuxtLink>
      </div>
      <div class="accounts-scroll hide-scrollbar">
        <div v-for="acc in accounts" :key="acc.id" class="account-card">
          <div class="account-strip" :class="`account-strip--${stripClass(acc.ownerType)}`"></div>
          <div class="account-header">
            <div class="account-icon-wrap" :class="`account-icon-wrap--${stripClass(acc.ownerType)}`">
              <span class="material-symbols-outlined" style="font-size:20px">{{ acc.icon }}</span>
            </div>
            <div>
              <p class="account-name">{{ acc.name }}</p>
              <p class="account-owner">{{ acc.ownerLabel }}</p>
            </div>
            <div v-if="acc.ownerType === 'bersama'" class="account-badge-group">
              <div class="account-badge account-badge--suami" style="margin-right:-6px;z-index:1">S</div>
              <div class="account-badge account-badge--istri">I</div>
            </div>
            <div v-else-if="acc.ownerType === 'suami'" class="account-badge account-badge--suami">S</div>
            <div v-else class="account-badge account-badge--istri">I</div>
          </div>
          <p class="account-balance tabular-nums" :class="{ 'account-balance--negative': acc.balance < 0 }">{{ getAccountDisplayBalance(acc.balanceText) }}</p>
          <p class="account-number">{{ acc.number }}</p>
        </div>

        <!-- Add Button -->
        <div class="account-add-btn">
          <NuxtLink to="/akun/kelola-akun" class="add-circle" id="btn-add-account" aria-label="Tambah akun">
            <span class="material-symbols-outlined">add</span>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Pengingat Tagihan Section -->
    <section class="section px-page" id="section-tagihan">
      <div class="flex items-center justify-between pb-1">
        <div class="flex items-center gap-2">
          <div class="flex items-center gap-1.5">
            <span class="material-symbols-outlined text-primary text-[20px]">receipt_long</span>
            <h2 class="text-base font-bold text-on-surface">Pengingat Tagihan</h2>
          </div>
          <!-- Urgency Badges -->
          <span
            v-if="billsSummary.overdueCount > 0"
            class="text-[10px] bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded-full border border-rose-300 flex items-center gap-1 animate-pulse"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            {{ billsSummary.overdueCount }} Terlambat
          </span>
          <span
            v-else-if="billsSummary.urgentCount > 0"
            class="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full border border-amber-300 flex items-center gap-1"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            {{ billsSummary.urgentCount }} Perlu Bayar (H-3)
          </span>
          <span
            v-else-if="billsSummary.pendingCount > 0"
            class="text-[10px] bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded-full border border-indigo-200"
          >
            {{ billsSummary.pendingCount }} Aktif
          </span>
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-0.5 py-0.5 px-2 rounded-lg hover:bg-primary/5 transition-colors cursor-pointer"
            @click="navigateTo('/akun/tagihan')"
          >
            <span class="material-symbols-outlined text-[16px]">add</span>
            <span>Tagihan</span>
          </button>
        </div>
      </div>

      <div class="bg-surface-container-lowest rounded-2xl p-3.5 shadow-sm flex flex-col gap-3 border border-outline-variant/30">
        <!-- Summary Strip: Total Tagihan Unpaid & Quick Filter -->
        <div class="flex items-center justify-between px-3 py-2 bg-surface-container-low rounded-xl text-xs flex-wrap gap-2">
          <div class="flex items-center gap-2">
            <span class="text-muted">Total Tagihan:</span>
            <span class="font-bold text-on-surface tabular-nums">{{ billsSummary.totalUnpaidText }}</span>
          </div>
          <!-- Filter Tabs: Belum Bayar vs Lunas -->
          <div class="flex items-center gap-1 bg-surface-container-lowest/80 p-0.5 rounded-lg border border-outline-variant/20 text-[11px]">
            <button
              type="button"
              class="px-2.5 py-0.5 rounded-md font-semibold transition-all cursor-pointer"
              :class="billTabFilter === 'pending' ? 'bg-primary text-white shadow-xs' : 'text-muted hover:text-on-surface'"
              @click="billTabFilter = 'pending'"
            >
              Belum Bayar ({{ billsSummary.pendingCount }})
            </button>
            <button
              type="button"
              class="px-2.5 py-0.5 rounded-md font-semibold transition-all cursor-pointer"
              :class="billTabFilter === 'paid' ? 'bg-primary text-white shadow-xs' : 'text-muted hover:text-on-surface'"
              @click="billTabFilter = 'paid'"
            >
              Lunas ({{ billsSummary.paidCount }})
            </button>
          </div>
        </div>

        <!-- Bill Cards List -->
        <div v-if="filteredBills.length > 0" class="flex flex-col gap-2.5">
          <div
            v-for="b in filteredBills"
            :key="b.id"
            class="flex items-center justify-between p-3 bg-surface rounded-xl border transition-all gap-2.5"
            :class="[
              b.status === 'lunas'
                ? 'border-emerald-200/60 bg-emerald-50/20'
                : b.isOverdue
                  ? 'border-rose-300 bg-rose-50/30'
                  : b.isUrgent
                    ? 'border-amber-300 bg-amber-50/30 shadow-xs'
                    : 'border-outline-variant/20 hover:bg-surface-container-low'
            ]"
          >
            <!-- Left Info -->
            <div class="flex items-center gap-3 min-w-0">
              <div
                class="w-10 h-10 rounded-xl flex items-center justify-center font-bold relative shrink-0"
                :class="[
                  b.status === 'lunas'
                    ? 'bg-emerald-100 text-emerald-700'
                    : b.isOverdue
                      ? 'bg-rose-100 text-rose-700'
                      : b.isUrgent
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-indigo-50 text-indigo-700'
                ]"
              >
                <span class="material-symbols-outlined text-[20px]">{{ getBillIcon(b.name) }}</span>
                <div
                  class="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border border-surface flex items-center justify-center text-[7px] text-white font-bold"
                  :class="b.ownerType === 'suami' ? 'bg-suami' : b.ownerType === 'istri' ? 'bg-istri' : 'bg-primary'"
                >
                  {{ b.ownerType === 'suami' ? 'S' : b.ownerType === 'istri' ? 'I' : 'B' }}
                </div>
              </div>

              <div class="min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <p class="text-xs font-bold text-on-surface truncate">{{ b.name }}</p>
                  <!-- Urgency Badge -->
                  <span
                    v-if="b.status === 'pending'"
                    class="text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap"
                    :class="[
                      b.urgencyLevel === 'overdue'
                        ? 'bg-rose-100 text-rose-700 border border-rose-300'
                        : b.urgencyLevel === 'today'
                          ? 'bg-rose-500 text-white font-extrabold animate-pulse'
                          : b.urgencyLevel === 'urgent'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300 font-bold'
                            : 'bg-slate-100 text-slate-700'
                    ]"
                  >
                    {{ b.badgeText }}
                  </span>
                  <span
                    v-else
                    class="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200"
                  >
                    Lunas
                  </span>
                </div>
                <div class="flex items-center gap-2 mt-0.5 text-[11px] text-muted">
                  <span>Jatuh tempo: {{ b.dueDate }}</span>
                  <span v-if="b.isRecurring" class="text-[9px] bg-surface-container px-1.5 py-0.2 rounded text-muted font-medium">Bulanan</span>
                </div>
              </div>
            </div>

            <!-- Right Actions & Amount -->
            <div class="text-right shrink-0 flex flex-col items-end gap-1.5">
              <p class="text-xs font-bold text-on-surface tabular-nums">{{ b.amountText }}</p>
              
              <button
                v-if="b.status === 'pending'"
                type="button"
                class="text-[11px] font-bold px-3 py-1 rounded-xl active:scale-95 transition-all flex items-center gap-1 bg-gradient-to-r from-primary to-indigo-600 text-white shadow-sm hover:shadow-md cursor-pointer"
                @click="openPayBillModal(b)"
              >
                <span class="material-symbols-outlined text-[13px]">payments</span>
                <span>Bayar &amp; Catat</span>
              </button>
              <div v-else class="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                <span class="material-symbols-outlined text-[14px]">check_circle</span>
                <span>Terbayar</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="text-center py-5 px-3 flex flex-col items-center justify-center">
          <div class="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1.5">
            <span class="material-symbols-outlined text-[20px]">check</span>
          </div>
          <p class="text-xs font-bold text-on-surface">
            {{ billTabFilter === 'pending' ? 'Tidak ada tagihan tertunda! 🎉' : 'Belum ada riwayat tagihan lunas' }}
          </p>
          <p class="text-[11px] text-muted max-w-[260px] mt-0.5">
            {{ billTabFilter === 'pending' ? 'Semua tagihan keluarga telah lunas atau belum ada tagihan terdaftar.' : 'Tagihan yang telah dibayar akan muncul di sini.' }}
          </p>
          <button
            v-if="billTabFilter === 'pending'"
            type="button"
            class="mt-2.5 text-xs text-primary font-bold hover:underline flex items-center gap-1 cursor-pointer"
            @click="navigateTo('/akun/tagihan')"
          >
            <span class="material-symbols-outlined text-[14px]">add</span> Tambah Tagihan Baru
          </button>
        </div>
      </div>
    </section>

    <!-- Hutang & Kewajiban Section -->
    <section class="section px-page" id="section-hutang" v-if="debtItems.length > 0">
      <div class="flex items-center justify-between pb-1">
        <div class="flex items-center gap-2">
          <h2 class="text-base font-bold text-on-surface">Hutang &amp; Kewajiban</h2>
          <span class="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full border border-amber-300">
            {{ activeDebtCount }} Aktif
          </span>
        </div>
        <div class="text-right shrink-0">
          <span class="text-[10px] text-muted block leading-tight">Total Kewajiban</span>
          <span class="font-bold text-xs text-rose-600 tabular-nums">{{ totalDebtText }}</span>
        </div>
      </div>

      <div class="bg-surface-container-lowest rounded-2xl p-3 shadow-sm flex flex-col gap-2.5 border border-outline-variant/30">
        <!-- Notice: Saldo Positif Tidak Berkurang -->
        <div class="flex items-center gap-2 px-2.5 py-2 bg-surface-container-low rounded-xl text-muted text-[11px] leading-snug">
          <span class="material-symbols-outlined text-[16px] text-primary shrink-0">info</span>
          <span>Saldo aset aktif tetap utuh <strong class="text-on-surface font-semibold">{{ displayBalance }}</strong> (terpisah dari kewajiban).</span>
        </div>

        <!-- Items: Detected minus accounts and dedicated debt accounts -->
        <div v-if="debtItems.length > 0" class="flex flex-col gap-2">
          <div
            v-for="d in debtItems"
            :key="d.id"
            class="flex items-center justify-between p-2.5 bg-surface rounded-xl border border-outline-variant/20 hover:bg-surface-container-low transition-colors gap-2"
          >
            <div class="flex items-center gap-2.5 min-w-0">
              <div
                class="w-9 h-9 rounded-lg flex items-center justify-center font-bold relative shrink-0"
                :class="d.type === 'negative_balance' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'"
              >
                <span class="material-symbols-outlined text-[19px]">{{ d.icon }}</span>
                <div
                  class="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border border-surface flex items-center justify-center text-[7px] text-white font-bold"
                  :class="d.ownerType === 'suami' ? 'bg-suami' : d.ownerType === 'istri' ? 'bg-istri' : 'bg-primary'"
                >
                  {{ d.ownerType === 'suami' ? 'S' : d.ownerType === 'istri' ? 'I' : 'B' }}
                </div>
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <p class="text-xs font-semibold text-on-surface truncate">{{ d.name }}</p>
                  <span
                    class="text-[9px] font-semibold px-1.5 py-0.2 rounded-full whitespace-nowrap"
                    :class="d.type === 'negative_balance' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'"
                  >
                    {{ d.badgeText }}
                  </span>
                </div>
                <p class="text-[11px] text-muted truncate">{{ d.subtitle }}</p>
              </div>
            </div>
            <div class="text-right shrink-0 flex flex-col items-end gap-1">
              <p class="text-xs font-bold text-rose-600 tabular-nums">-{{ d.amountText }}</p>
              <button
                type="button"
                class="text-[10px] font-semibold px-2.5 py-1 rounded-full active:scale-95 transition-transform flex items-center gap-1 shadow-xs"
                :class="d.type === 'negative_balance' ? 'text-primary bg-primary/10 hover:bg-primary/20' : 'bg-primary text-white'"
                @click="openDebtModal(d)"
              >
                <span class="material-symbols-outlined text-[12px]">{{ d.type === 'negative_balance' ? 'refresh' : 'payments' }}</span>
                <span>{{ d.type === 'negative_balance' ? 'Top Up / Pulihkan' : 'Bayar Hutang' }}</span>
              </button>
            </div>
          </div>
        </div>

        <div v-else class="text-center py-2 text-xs text-muted">
          Tidak ada hutang atau saldo minus aktif. Keuangan sehat! 🎉
        </div>
      </div>
    </section>

    <!-- Transaksi Terakhir -->
    <section class="section px-page">
      <div class="section-header">
        <h2 class="section-title">Transaksi Terakhir</h2>
        <button class="section-action">Riwayat</button>
      </div>

      <div class="transaction-list">
        <div
          v-for="tx in transactions"
          :key="tx.id"
          class="transaction-item"
        >
          <!-- Icon -->
          <div class="tx-icon-wrap" :class="`tx-icon-wrap--${tx.owner}`">
            <span class="material-symbols-outlined" style="font-size:20px">{{ tx.icon }}</span>
            <!-- Owner badge(s) -->
            <template v-if="tx.owner === 'bersama'">
              <div class="tx-owner-badge-group">
                <div class="tx-owner-badge tx-owner-badge--suami">S</div>
                <div class="tx-owner-badge tx-owner-badge--istri">I</div>
              </div>
            </template>
            <template v-else-if="tx.owner === 'sendiri'">
              <div class="tx-owner-badge bg-primary text-white">
                S
              </div>
            </template>
            <template v-else>
              <div class="tx-owner-badge" :class="`tx-owner-badge--${tx.owner}`">
                {{ tx.owner === 'suami' ? 'S' : 'I' }}
              </div>
            </template>
          </div>

          <!-- Info -->
          <div class="tx-info">
            <div class="flex items-center gap-1.5 flex-wrap">
              <p class="tx-name">{{ tx.name }}</p>
              <span
                v-if="tx.previousRole"
                class="text-[9px] bg-slate-100 text-slate-600 font-semibold px-1.5 py-0.2 rounded border border-slate-200"
                :title="`Dibuat saat berstatus ${tx.previousRole}`"
              >
                Riwayat: {{ tx.previousRole === 'suami' ? 'Suami' : 'Istri' }}
              </span>
            </div>
            <p class="tx-meta">{{ tx.meta }}</p>
          </div>

          <!-- Amount -->
          <p class="tx-amount tabular-nums" :class="tx.type === 'income' ? 'tx-amount--income' : 'tx-amount--expense'">
            {{ tx.amountText }}
          </p>
        </div>
      </div>
    </section>

    <!-- Modal Dialog: Pembayaran Hutang / Pemulihan Saldo Minus -->
    <div
      v-if="isDebtModalOpen && activeDebtItem"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 transition-opacity duration-300 animate-fade-in"
      @click.self="isDebtModalOpen = false"
    >
      <div class="bg-surface-container-lowest w-full max-w-md rounded-3xl p-5 shadow-2xl flex flex-col gap-4 border border-outline-variant/30 max-h-[85vh] overflow-y-auto">
        <div class="flex items-center justify-between pb-2 border-b border-outline-variant/20">
          <div class="flex items-center gap-2">
            <div class="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <span class="material-symbols-outlined text-[20px]">payments</span>
            </div>
            <div>
              <h3 class="text-base text-on-surface font-bold leading-tight">
                {{ activeDebtItem.type === 'negative_balance' ? 'Pulihkan ' : 'Bayar ' }}{{ activeDebtItem.name }}
              </h3>
              <p class="text-xs text-muted">Pilih sumber dana pelunasan</p>
            </div>
          </div>
          <button
            type="button"
            class="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-muted hover:text-on-surface"
            @click="isDebtModalOpen = false"
          >
            <span class="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <!-- Nominal Input Box -->
        <div class="p-3 bg-surface-container-low rounded-2xl flex flex-col gap-1.5 border border-outline-variant/20">
          <div class="flex items-center justify-between">
            <span class="text-xs text-muted">Sisa Hutang Saat Ini</span>
            <span class="font-bold text-rose-600 text-xs tabular-nums">{{ activeDebtItem.amountText }}</span>
          </div>
          <div class="flex items-center justify-between pt-1 border-t border-outline-variant/10">
            <label class="text-xs font-bold text-on-surface">Nominal Bayar</label>
            <div class="flex items-center gap-1">
              <span class="text-xs text-muted font-bold">Rp</span>
              <input
                type="number"
                v-model.number="customDebtPayAmount"
                class="w-32 text-right font-bold text-xs bg-surface rounded-xl px-2.5 py-1 border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary tabular-nums"
                min="1"
              />
            </div>
          </div>
          <span v-if="customDebtPayAmount > activeDebtItem.amount" class="text-[10px] text-emerald-600 font-bold">
            💡 Melebihi sisa hutang (+Rp {{ (customDebtPayAmount - activeDebtItem.amount).toLocaleString('id-ID') }}). Sisa kelebihan akan dialihkan menjadi saldo rekening!
          </span>
        </div>

        <!-- Source Account Selection -->
        <div class="flex flex-col gap-2">
          <span class="text-[11px] text-muted uppercase tracking-wider font-semibold">Bayar dari Pos Akun</span>
          <div class="flex flex-col gap-2 max-h-48 overflow-y-auto hide-scrollbar">
            <label
              v-for="acc in activeAssetAccounts"
              :key="acc.id"
              class="flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer"
              :class="selectedSourceAccountId === acc.id ? 'border-primary bg-primary/5' : 'border-outline-variant/30 bg-surface hover:bg-surface-container-low'"
            >
              <div class="flex items-center gap-2.5">
                <span class="material-symbols-outlined text-[18px]" :class="selectedSourceAccountId === acc.id ? 'text-primary' : 'text-muted'">
                  {{ selectedSourceAccountId === acc.id ? 'check_circle' : 'radio_button_unchecked' }}
                </span>
                <div>
                  <p class="text-xs font-semibold text-on-surface leading-tight">{{ acc.name }} ({{ acc.ownerLabel }})</p>
                  <p class="text-[11px] text-muted">Saldo: {{ acc.balanceText }}</p>
                </div>
              </div>
              <input type="radio" :value="acc.id" v-model="selectedSourceAccountId" class="hidden" />
            </label>
          </div>
          <p v-if="activeAssetAccounts.length === 0" class="text-xs text-rose-600">
            Tidak ada pos akun aktif dengan saldo positif untuk pelunasan.
          </p>
        </div>

        <div v-if="debtPaymentError" class="p-2.5 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-200">
          {{ debtPaymentError }}
        </div>

        <button
          type="button"
          class="w-full py-3 bg-primary text-white rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          :disabled="isPayingDebt || !selectedSourceAccountId || customDebtPayAmount <= 0"
          @click="handleDebtPaymentSubmit"
        >
          <span v-if="isPayingDebt" class="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
          <span v-else class="material-symbols-outlined text-[18px]">verified</span>
          <span>Konfirmasi Pembayaran</span>
        </button>
      </div>
    </div>

    <!-- Modal Dialog: Konfirmasi Kelebihan Pelunasan Hutang (Beranda) -->
    <div
      v-if="isDebtOverpayModalOpen && activeDebtItem"
      class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4 transition-opacity duration-300 animate-fade-in"
      @click.self="isDebtOverpayModalOpen = false"
    >
      <div class="bg-surface-container-lowest w-full max-w-md rounded-3xl p-5 shadow-2xl flex flex-col gap-4 border border-outline-variant/30 max-h-[90vh] overflow-y-auto m-auto">
        <!-- Header -->
        <div class="flex items-center justify-between pb-2 border-b border-outline-variant/20">
          <div class="flex items-center gap-2.5">
            <div class="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-[22px]">price_change</span>
            </div>
            <div>
              <h3 class="text-sm font-bold text-on-surface">Pelunasan Melebihi Sisa Hutang</h3>
              <p class="text-[11px] text-muted">Konfirmasi pengalihan sisa kelebihan dana</p>
            </div>
          </div>
          <button
            type="button"
            class="w-7 h-7 rounded-full bg-surface-container hover:bg-surface-variant flex items-center justify-center text-muted hover:text-on-surface transition-colors cursor-pointer"
            @click="isDebtOverpayModalOpen = false"
          >
            <span class="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>

        <!-- Info Breakdown Box -->
        <div class="p-3.5 bg-surface rounded-2xl border border-outline-variant/20 flex flex-col gap-2">
          <div class="flex items-center justify-between text-xs">
            <span class="text-muted">Sisa Hutang "{{ activeDebtItem.name }}"</span>
            <span class="font-bold text-rose-600">Rp {{ activeDebtItem.amount.toLocaleString('id-ID') }}</span>
          </div>
          <div class="flex items-center justify-between text-xs">
            <span class="text-muted">Nominal Dibayarkan</span>
            <span class="font-bold text-on-surface">Rp {{ customDebtPayAmount.toLocaleString('id-ID') }}</span>
          </div>
          <div class="pt-2 border-t border-outline-variant/20 flex items-center justify-between">
            <div>
              <span class="text-xs font-bold text-emerald-600 block">Kelebihan Pembayaran</span>
              <span class="text-[10px] text-muted">Akan otomatis menjadi saldo rekening</span>
            </div>
            <span class="text-sm font-extrabold text-emerald-600 tabular-nums">
              +Rp {{ (customDebtPayAmount - activeDebtItem.amount).toLocaleString('id-ID') }}
            </span>
          </div>
        </div>

        <!-- Opsi Pilihan Jenis Pos Akun Baru -->
        <div class="flex flex-col gap-2">
          <label class="text-xs font-bold text-on-surface">
            Pilih Jenis Pos Akun Baru untuk "{{ activeDebtItem.name }}":
          </label>
          <div class="grid grid-cols-1 gap-2">
            <button
              v-for="opt in debtAccountTypeOptions"
              :key="opt.value"
              type="button"
              class="p-3 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer"
              :class="newDebtAccountType === opt.value
                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                : 'border-outline-variant/30 bg-surface hover:bg-surface-container-low'"
              @click="newDebtAccountType = opt.value as any"
            >
              <div
                class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                :class="newDebtAccountType === opt.value ? 'bg-primary text-white' : 'bg-surface-container text-muted'"
              >
                <span class="material-symbols-outlined text-[19px]">{{ opt.icon }}</span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-xs font-bold text-on-surface">{{ opt.label }}</p>
                <p class="text-[10px] text-muted">{{ opt.desc }}</p>
              </div>
              <span class="material-symbols-outlined text-[18px]" :class="newDebtAccountType === opt.value ? 'text-primary' : 'text-transparent'">
                check_circle
              </span>
            </button>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            class="px-4 py-2.5 rounded-xl bg-surface-container hover:bg-surface-variant text-xs font-semibold text-muted hover:text-on-surface transition-colors cursor-pointer"
            @click="isDebtOverpayModalOpen = false"
          >
            Batal
          </button>
          <button
            type="button"
            class="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
            @click="confirmOverpayAndExecute"
          >
            <span class="material-symbols-outlined text-[16px]">check</span>
            <span>Konfirmasi &amp; Ubah Pos Akun</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Modal Dialog: Bayar & Catat Tagihan -->
    <div
      v-if="isPayBillModalOpen && activePayBill"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 transition-opacity duration-300 animate-fade-in"
      @click.self="isPayBillModalOpen = false"
    >
      <div class="bg-surface-container-lowest w-full max-w-md rounded-3xl p-5 shadow-2xl flex flex-col gap-4 border border-outline-variant/30 max-h-[90vh] overflow-y-auto">
        <!-- Header -->
        <div class="flex items-center justify-between pb-2 border-b border-outline-variant/20">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <span class="material-symbols-outlined text-[20px]">receipt_long</span>
            </div>
            <div>
              <h3 class="text-sm font-bold text-on-surface">Bayar &amp; Catat Tagihan</h3>
              <p class="text-[11px] text-muted">Tandai lunas dan potong saldo akun otomatis</p>
            </div>
          </div>
          <button
            type="button"
            class="w-7 h-7 rounded-full bg-surface-container hover:bg-surface-variant flex items-center justify-center text-muted hover:text-on-surface transition-colors cursor-pointer"
            @click="isPayBillModalOpen = false"
          >
            <span class="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>

        <!-- Detail Tagihan Box -->
        <div class="p-3.5 bg-surface rounded-2xl border border-outline-variant/20 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs text-muted font-medium">Nama Tagihan</span>
            <span class="text-xs font-bold text-on-surface">{{ activePayBill.name }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-xs text-muted font-medium">Jatuh Tempo</span>
            <div class="flex items-center gap-1.5">
              <span class="text-xs font-semibold text-on-surface">{{ activePayBill.dueDate }}</span>
              <span
                class="text-[9px] font-bold px-1.5 py-0.2 rounded-full"
                :class="activePayBill.isUrgent || activePayBill.isOverdue ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'"
              >
                {{ activePayBill.badgeText }}
              </span>
            </div>
          </div>
          <div class="flex items-center justify-between pt-2 border-t border-outline-variant/10">
            <span class="text-xs font-bold text-on-surface">Nominal Pembayaran</span>
            <span class="text-base font-extrabold text-primary tabular-nums">{{ activePayBill.amountText }}</span>
          </div>
        </div>

        <!-- Pilihan Pos Akun Sumber -->
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold text-on-surface">Pilih Pos Akun Sumber Pembayaran</label>
          <select
            v-model="selectedPayAccountId"
            class="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-outline-variant/50 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer"
          >
            <option
              v-for="acc in selectableAccountsForBill"
              :key="acc.id"
              :value="acc.id"
            >
              {{ acc.name }} ({{ acc.ownerLabel }}) — Saldo: {{ acc.balanceText }}
            </option>
          </select>
          <span class="text-[10px] text-muted">Saldo akun yang dipilih akan otomatis terpotong melalui pencatatan transaksi pengeluaran.</span>
        </div>

        <!-- Warning jika saldo tidak cukup -->
        <div
          v-if="selectedPayAccount && selectedPayAccount.balance < activePayBill.amount"
          class="flex items-start gap-2 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs"
        >
          <span class="material-symbols-outlined text-[16px] shrink-0 mt-0.5">warning</span>
          <span>
            Saldo akun <strong class="font-bold">{{ selectedPayAccount.name }}</strong> ({{ selectedPayAccount.balanceText }}) tidak mencukupi untuk tagihan {{ activePayBill.amountText }}. Saldo akan menjadi minus jika dilanjutkan.
          </span>
        </div>

        <!-- Error Alert -->
        <div
          v-if="payBillError"
          class="flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs"
        >
          <span class="material-symbols-outlined text-[16px] shrink-0">error</span>
          <span>{{ payBillError }}</span>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            class="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-variant text-xs font-semibold text-muted hover:text-on-surface transition-colors cursor-pointer"
            @click="isPayBillModalOpen = false"
            :disabled="isSubmittingPayBill"
          >
            Batal
          </button>
          <button
            type="button"
            class="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
            @click="confirmPayBill"
            :disabled="isSubmittingPayBill || !selectedPayAccountId"
          >
            <span v-if="isSubmittingPayBill" class="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
            <span v-else class="material-symbols-outlined text-[16px]">payments</span>
            <span>{{ isSubmittingPayBill ? 'Memproses...' : 'Konfirmasi & Catat Pengeluaran' }}</span>
          </button>
        </div>
      </div>
    </div>



  </div>
</template>

<style scoped>
.beranda-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding-bottom: 16px;
}

.px-page { padding: 0 16px; }

/* ── Section ── */
.section { display: flex; flex-direction: column; gap: 12px; }

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--on-surface);
}

.section-action {
  font-size: 14px;
  font-weight: 500;
  color: var(--primary);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  text-decoration: none;
}

/* ── Hero ── */
.section-hero { padding: 16px 16px 0; }

.hero-card {
  position: relative;
  width: 100%;
  border-radius: 24px;
  background: linear-gradient(135deg, var(--primary) 0%, var(--surface-tint) 50%, var(--secondary) 100%);
  padding: 20px;
  color: white;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(70, 72, 212, 0.35);
}

.hero-blob {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  filter: blur(40px);
  pointer-events: none;
}
.hero-blob--1 { width: 200px; height: 200px; top: -60px; right: -60px; }
.hero-blob--2 { width: 120px; height: 120px; bottom: -30px; left: -20px; }

.hero-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.hero-label {
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.8);
}

.hero-eye-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s;
  position: relative;
  z-index: 2;
}
.hero-eye-btn:hover { background: rgba(255, 255, 255, 0.3); }
.hero-eye-btn:active { transform: scale(0.93); }

/* Avatar di pojok kanan atas hero card */
.hero-avatar-wrapper {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s;
  z-index: 10;
}
.hero-avatar-wrapper:hover { background: rgba(255, 255, 255, 0.3); }
.hero-avatar-wrapper:active { transform: scale(0.93); }

.hero-avataar-bg {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}
.hero-avataar-bg--syncing {
  animation: spin 1s linear infinite;
  pointer-events: none;
}
.hero-avataar-bg--has-partner {
  background: var(--gabungan);
  color: white;
}
.hero-avataar-bg--no-partner {
  background: var(--primary);
  color: white;
}

/* Animasi loading */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.hero-balance { margin-bottom: 16px; }

.hero-amount {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.hero-currency {
  font-size: 16px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
}

.hero-number {
  font-size: 34px;
  font-weight: 700;
  letter-spacing: -0.02em;
  transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.hero-number--hidden {
  letter-spacing: 0.05em;
  font-size: 28px;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  background: rgba(16, 185, 129, 0.25);
  padding: 3px 10px 3px 6px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  transition: background 0.3s;
}
.hero-badge--down {
  background: rgba(239, 68, 68, 0.25);
}

.hero-badge-sub {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
  margin-left: 2px;
}

/* Indicator add partner when no partner */
.hero-add-partner-indicator {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  color: var(--muted);
}
.hero-add-partner-indicator .material-symbols-outlined {
  font-variation-settings: 'FILL' 0;
}
.hero-add-partner-text {
  color: var(--primary);
  font-weight: 500;
}

/* Hero breakdown bar */
.hero-breakdown {
  display: flex;
  align-items: center;
  gap: 0;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  padding: 10px 14px;
  backdrop-filter: blur(8px);
  position: relative;
  z-index: 2;
}

.hero-breakdown-item {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.hero-breakdown-divider {
  width: 1px;
  height: 28px;
  background: rgba(255, 255, 255, 0.25);
  margin: 0 10px;
}

.breakdown-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.breakdown-dot--suami { background: var(--suami); }
.breakdown-dot--istri { background: var(--istri); }
.breakdown-dot--bersama { background: var(--gabungan); }

.breakdown-label {
  margin: 0;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.7);
  white-space: nowrap;
}
.breakdown-amount {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: white;
  white-space: nowrap;
}

/* Unpaired single add partner element */
.hero-unpaired-breakdown {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.16);
  border-radius: 14px;
  padding: 10px 16px;
  backdrop-filter: blur(8px);
  cursor: pointer;
  width: fit-content;
  transition: background 0.15s, transform 0.15s;
  position: relative;
  z-index: 2;
}
.hero-unpaired-breakdown:hover { background: rgba(255, 255, 255, 0.24); }
.hero-unpaired-breakdown:active { transform: scale(0.97); }

.unpaired-add-circle {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.unpaired-add-text {
  font-size: 12px;
  font-weight: 600;
  color: white;
  letter-spacing: -0.01em;
}

/* ── Accounts Scroll ── */
.accounts-scroll {
  display: flex;
  overflow-x: auto;
  gap: 12px;
  padding: 4px 16px 8px;
  scroll-snap-type: x mandatory;
}

.account-card {
  scroll-snap-align: center;
  flex-shrink: 0;
  width: 220px;
  background: var(--surface-container-low);
  border-radius: 16px;
  padding: 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
  overflow: hidden;
  transition: transform 0.15s;
}
.account-card:active { transform: scale(0.98); }

.account-strip {
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  border-radius: 4px 0 0 4px;
}
.account-strip--suami { background: var(--suami); }
.account-strip--istri { background: var(--istri); }
.account-strip--primary { background: var(--primary); }

.account-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.account-icon-wrap {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.account-icon-wrap--suami { background: color-mix(in srgb, var(--suami) 15%, transparent); color: var(--suami); }
.account-icon-wrap--istri { background: color-mix(in srgb, var(--istri) 15%, transparent); color: var(--istri); }
.account-icon-wrap--primary { background: color-mix(in srgb, var(--primary) 15%, transparent); color: var(--primary); }

.account-name {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--on-surface);
}
.account-owner {
  margin: 0;
  font-size: 11px;
  color: var(--muted);
}

.account-badge {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: 700;
  color: white;
  border: 2px solid var(--surface-container-low);
  margin-left: auto;
}
.account-badge--suami { background: var(--suami); }
.account-badge--istri { background: var(--istri); }

.account-badge-group {
  display: flex;
  align-items: center;
  margin-left: auto;
}

.account-balance {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--on-surface);
}
.account-balance--negative {
  color: #dc2626 !important;
}
.account-number {
  margin: 0;
  font-size: 11px;
  color: var(--muted);
}

.account-add-btn {
  scroll-snap-align: center;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding: 0 8px;
}
.add-circle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--surface-container);
  color: var(--on-surface-variant);
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  transition: background 0.15s;
}
.add-circle:hover { background: var(--surface-container-high); }
.add-circle:active { transform: scale(0.93); }

/* ── Transaction List ── */
.transaction-list {
  background: var(--surface-container-lowest);
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.transaction-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid color-mix(in srgb, var(--outline-variant) 40%, transparent);
  transition: background 0.1s;
  cursor: pointer;
}
.transaction-item:last-child { border-bottom: none; }
.transaction-item:active { background: var(--surface-container-low); }

.tx-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  flex-shrink: 0;
}
.tx-icon-wrap--suami { background: color-mix(in srgb, var(--suami) 12%, transparent); color: var(--suami); }
.tx-icon-wrap--istri { background: color-mix(in srgb, var(--istri) 12%, transparent); color: var(--istri); }
.tx-icon-wrap--bersama { background: color-mix(in srgb, var(--income) 12%, transparent); color: var(--income); }

.tx-owner-badge {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  font-size: 8px;
  font-weight: 700;
  color: white;
  border: 2px solid var(--surface-container-lowest);
  display: flex;
  align-items: center;
  justify-content: center;
}
.tx-owner-badge--suami { background: var(--suami); }
.tx-owner-badge--istri { background: var(--istri); }

.tx-owner-badge-group {
  position: absolute;
  bottom: -2px;
  right: -4px;
  display: flex;
}
.tx-owner-badge-group .tx-owner-badge { position: static; margin-right: -4px; }
.tx-owner-badge-group .tx-owner-badge:last-child { margin-right: 0; }

.tx-info { flex: 1; min-width: 0; }
.tx-name {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--on-surface);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tx-meta {
  margin: 0;
  font-size: 11px;
  color: var(--muted);
}

.tx-amount {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
}
.tx-amount--income { color: var(--income); }
.tx-amount--expense { color: var(--expense); }
</style>
