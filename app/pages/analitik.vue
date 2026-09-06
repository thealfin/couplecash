<script setup lang="ts">
definePageMeta({ layout: 'app' })
useHead({ title: 'Analitik — CoupleCash' })

const { currentHousehold, hasPartner, currentUser, getAuthToken } = useAuth()
const router = useRouter()
const route = useRoute()

// ── Top Segmented View ──
const currentView = ref<'calendar' | 'trends'>(route.query.tab === 'trends' ? 'trends' : 'calendar')

// ── Calendar State ──
const monthNamesId = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]
const dayNamesId = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

const realToday = new Date()
const currentYear = ref(realToday.getFullYear())
const currentMonth = ref(realToday.getMonth() + 1) // 1-12

function formatDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const todayKey = formatDateKey(realToday)
const selectedDateStr = ref(todayKey)

// Fetch Calendar Data for currentYear & currentMonth
const calendarLoading = ref(false)
const calendarDailyData = ref<Record<string, {
  income: number
  expense: number
  debt: number
  hasBill?: boolean
  bills?: any[]
  transactions: any[]
}>>({})

// Pay bill modal state inside analitik
const isPayBillModalOpen = ref(false)
const activePayBill = ref<any>(null)
const selectedPayAccountId = ref('')
const isSubmittingPayBill = ref(false)
const payBillError = ref('')
const activeAssetAccounts = ref<any[]>([])

async function fetchAccounts() {
  try {
    const token = await getAuthToken()
    const res = await $fetch<any>('/api/dashboard', {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    activeAssetAccounts.value = res.activeAssetAccounts || []
  } catch (err) {
    console.warn('[analitik] Failed to load accounts:', err)
  }
}

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

async function openPayBillModal(bill: any) {
  if (activeAssetAccounts.value.length === 0) {
    await fetchAccounts()
  }
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
    await fetchCalendarData()
    await fetchAccounts()
  } catch (err: any) {
    payBillError.value = err?.data?.message || err?.statusMessage || err?.message || 'Gagal memproses pembayaran tagihan'
  } finally {
    isSubmittingPayBill.value = false
  }
}

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

async function fetchCalendarData() {
  calendarLoading.value = true
  try {
    const token = await getAuthToken()
    const res = await $fetch<{
      success: boolean
      year: number
      month: number
      dailyData: Record<string, any>
    }>('/api/analytics/calendar', {
      query: { year: currentYear.value, month: currentMonth.value },
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    calendarDailyData.value = res.dailyData || {}
  } catch (err) {
    console.error('[analitik] Failed to fetch calendar data:', err)
  } finally {
    calendarLoading.value = false
  }
}

onMounted(() => {
  fetchCalendarData()
  fetchAccounts()
})

// Watch year/month change
watch([currentYear, currentMonth], () => {
  fetchCalendarData()
})

const isCurrentMonthActive = computed(() => {
  return currentYear.value === realToday.getFullYear() && currentMonth.value === (realToday.getMonth() + 1)
})

function prevMonth() {
  if (currentMonth.value === 1) {
    currentMonth.value = 12
    currentYear.value -= 1
  } else {
    currentMonth.value -= 1
  }
}

function nextMonth() {
  if (currentMonth.value === 12) {
    currentMonth.value = 1
    currentYear.value += 1
  } else {
    currentMonth.value += 1
  }
}

function goToToday() {
  currentYear.value = realToday.getFullYear()
  currentMonth.value = realToday.getMonth() + 1
  selectedDateStr.value = todayKey
}

function selectDate(key: string) {
  selectedDateStr.value = key
}

// Calendar Grid Calculations
interface CalendarCell {
  dayNum: number
  dateKey: string
  isCurrentMonth: boolean
  isSelected: boolean
  isToday: boolean
  hasIncome: boolean
  hasExpense: boolean
  hasDebt: boolean
  hasBill: boolean
}

const calendarCells = computed<CalendarCell[]>(() => {
  const cells: CalendarCell[] = []
  const y = currentYear.value
  const m = currentMonth.value // 1-12

  const firstDayObj = new Date(y, m - 1, 1)
  const lastDayObj = new Date(y, m, 0)
  const totalDays = lastDayObj.getDate()
  const startingDayOfWeek = firstDayObj.getDay() // 0 = Sun

  // Leading days from previous month
  const prevMonthLastDay = new Date(y, m - 1, 0).getDate()
  for (let i = 0; i < startingDayOfWeek; i++) {
    const dayNum = prevMonthLastDay - startingDayOfWeek + i + 1
    const prevMonthNum = m === 1 ? 12 : m - 1
    const prevYearNum = m === 1 ? y - 1 : y
    const dKey = `${prevYearNum}-${String(prevMonthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
    const data = calendarDailyData.value[dKey]
    cells.push({
      dayNum,
      dateKey: dKey,
      isCurrentMonth: false,
      isSelected: dKey === selectedDateStr.value,
      isToday: dKey === todayKey,
      hasIncome: (data?.income ?? 0) > 0,
      hasExpense: (data?.expense ?? 0) > 0,
      hasDebt: (data?.debt ?? 0) > 0,
      hasBill: !!(data?.hasBill || (data?.bills && data.bills.length > 0)),
    })
  }

  // Days in active month
  for (let d = 1; d <= totalDays; d++) {
    const dKey = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const data = calendarDailyData.value[dKey]
    cells.push({
      dayNum: d,
      dateKey: dKey,
      isCurrentMonth: true,
      isSelected: dKey === selectedDateStr.value,
      isToday: dKey === todayKey,
      hasIncome: (data?.income ?? 0) > 0,
      hasExpense: (data?.expense ?? 0) > 0,
      hasDebt: (data?.debt ?? 0) > 0,
      hasBill: !!(data?.hasBill || (data?.bills && data.bills.length > 0)),
    })
  }

  // Trailing days
  const totalFilled = startingDayOfWeek + totalDays
  const remainingSlots = totalFilled % 7 === 0 ? 0 : 7 - (totalFilled % 7)
  for (let j = 1; j <= remainingSlots; j++) {
    const nextMonthNum = m === 12 ? 1 : m + 1
    const nextYearNum = m === 12 ? y + 1 : y
    const dKey = `${nextYearNum}-${String(nextMonthNum).padStart(2, '0')}-${String(j).padStart(2, '0')}`
    const data = calendarDailyData.value[dKey]
    cells.push({
      dayNum: j,
      dateKey: dKey,
      isCurrentMonth: false,
      isSelected: dKey === selectedDateStr.value,
      isToday: dKey === todayKey,
      hasIncome: (data?.income ?? 0) > 0,
      hasExpense: (data?.expense ?? 0) > 0,
      hasDebt: (data?.debt ?? 0) > 0,
      hasBill: !!(data?.hasBill || (data?.bills && data.bills.length > 0)),
    })
  }

  return cells
})

// Selected Date Summary
const selectedDateInfo = computed(() => {
  const parts = selectedDateStr.value.split('-').map(Number)
  if (parts.length < 3) return { title: 'Hari Ini', income: 0, expense: 0, debt: 0, net: 0, bills: [], transactions: [] }
  const dObj = new Date(parts[0], parts[1] - 1, parts[2])
  const dayName = dayNamesId[dObj.getDay()]
  const monthName = monthNamesId[dObj.getMonth()]
  const title = `${dayName}, ${parts[2]} ${monthName} ${parts[0]}`

  const dayData = calendarDailyData.value[selectedDateStr.value] || { income: 0, expense: 0, debt: 0, hasBill: false, bills: [], transactions: [] }
  const net = dayData.income - dayData.expense - dayData.debt

  return {
    title,
    income: dayData.income,
    expense: dayData.expense,
    debt: dayData.debt,
    net,
    bills: dayData.bills || [],
    transactions: dayData.transactions || [],
  }
})

function formatRupiah(num: number): string {
  return 'Rp ' + Math.abs(num).toLocaleString('id-ID')
}

// ── Trends & Category State ──
type Period = 'mingguan' | 'bulanan' | 'tahunan'
type CategoryType = 'expense' | 'income'

const activeFilter = ref<Period>('bulanan')
const activeType = ref<CategoryType>('expense')

const filters: Array<{ key: Period; label: string }> = [
  { key: 'mingguan', label: 'Minggu Ini' },
  { key: 'bulanan', label: 'Bulan Ini' },
  { key: 'tahunan', label: 'Tahun Ini' },
]

interface CategoryItem {
  icon: string
  name: string
  amountText: string
  amount: number
  pct: number
  colorClass: string
}

interface AnalyticsResponse {
  period: string
  expenseTotal: number
  expenseTotalText: string
  incomeTotal: number
  incomeTotalText: string
  expenseCategories: CategoryItem[]
  incomeCategories: CategoryItem[]
  contribution: {
    suami: number
    suamiText: string
    suamiName: string
    istri: number
    istriText: string
    istriName: string
    suamiPct: number
    istriPct: number
  }
  incomeContribution: {
    suami: number
    suamiText: string
    suamiName: string
    istri: number
    istriText: string
    istriName: string
    suamiPct: number
    istriPct: number
  }
  expenseTrend: Array<{ date: string; total: number }>
  incomeTrend: Array<{ date: string; total: number }>
}

const analyticsData = ref<AnalyticsResponse | null>(null)
const analyticsLoading = ref(false)

async function fetchAnalyticsData() {
  analyticsLoading.value = true
  try {
    const token = await getAuthToken()
    const res = await $fetch<AnalyticsResponse>('/api/analytics', {
      query: { period: activeFilter.value },
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    analyticsData.value = res
  } catch (err) {
    console.error('[analitik] Failed to fetch analytics data:', err)
  } finally {
    analyticsLoading.value = false
  }
}

watch(activeFilter, () => {
  fetchAnalyticsData()
})

onMounted(() => {
  fetchAnalyticsData()
})

const categories = computed(() => {
  if (activeType.value === 'income') {
    return analyticsData.value?.incomeCategories ?? []
  }
  return analyticsData.value?.expenseCategories ?? []
})

const trendPoints = computed(() => {
  if (activeType.value === 'income') {
    return analyticsData.value?.incomeTrend ?? []
  }
  return analyticsData.value?.expenseTrend ?? []
})

const trendPath = computed(() => {
  const points = trendPoints.value
  if (points.length < 2) return ''
  const max = Math.max(...points.map((p) => p.total), 1)
  const stepX = 100 / (points.length - 1)
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${(i * stepX).toFixed(1)},${(38 - (p.total / max) * 34).toFixed(1)}`)
    .join(' ')
})

const trendAreaPath = computed(() =>
  trendPath.value ? `${trendPath.value} L100,40 L0,40 Z` : ''
)
</script>

<template>
  <div class="analitik-page animate-fade-in pb-20">

    <!-- Top Segmented Nav Toggle -->
    <div class="px-4 pt-3 pb-1">
      <div class="bg-surface-container p-1 rounded-2xl flex items-center text-xs font-semibold text-muted shadow-inner">
        <button
          type="button"
          class="flex-1 py-2 px-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer"
          :class="currentView === 'calendar' ? 'bg-white text-primary shadow-sm font-bold' : 'text-on-surface-variant hover:text-on-background'"
          @click="currentView = 'calendar'"
        >
          <span class="material-symbols-outlined text-[16px]">calendar_month</span>
          <span>Kalender Finansial</span>
        </button>
        <button
          type="button"
          class="flex-1 py-2 px-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer"
          :class="currentView === 'trends' ? 'bg-white text-primary shadow-sm font-bold' : 'text-on-surface-variant hover:text-on-background'"
          @click="currentView = 'trends'"
        >
          <span class="material-symbols-outlined text-[16px]">insights</span>
          <span>Tren & Kategori</span>
        </button>
      </div>
    </div>

    <!-- ============================================== -->
    <!-- VIEW 1: KALENDER FINANSIAL                     -->
    <!-- ============================================== -->
    <div v-if="currentView === 'calendar'" class="flex flex-col w-full space-y-4 pt-1">
      
      <!-- Sync Status Banner -->
      <div class="px-4">
        <div class="bg-gradient-to-r from-primary/10 via-secondary/5 to-istri/10 rounded-2xl p-3.5 border border-primary/15 relative overflow-hidden flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 shadow-sm">
              <span class="material-symbols-outlined text-[20px]" style="font-variation-settings: 'FILL' 1;">event_repeat</span>
            </div>
            <div>
              <div class="flex items-center gap-1.5">
                <span class="text-[13px] font-bold text-on-background">Sinkronisasi Keuangan</span>
                <span class="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-100 text-emerald-700">Aktif</span>
              </div>
              <p class="text-[11px] text-muted leading-tight mt-0.5">Semua pemasukan & beban tercatat real-time.</p>
            </div>
          </div>
          <button
            type="button"
            class="px-3 py-1.5 rounded-xl bg-white border border-primary/20 text-primary text-[11px] font-bold hover:bg-primary/5 active:scale-95 transition-all shadow-xs cursor-pointer"
            @click="goToToday"
          >
            Hari Ini
          </button>
        </div>
      </div>

      <!-- Calendar Main Card -->
      <div class="px-4">
        <div class="bg-white rounded-3xl p-4 shadow-sm border border-surface-variant/50">
          
          <!-- Month Header Controls -->
          <div class="flex items-center justify-between mb-3 px-1">
            <div class="flex items-center gap-2">
              <h2 class="text-base font-bold text-on-background capitalize">
                {{ monthNamesId[currentMonth - 1] }} {{ currentYear }}
              </h2>
              <span
                v-if="isCurrentMonthActive"
                class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary"
              >
                Bulan Ini
              </span>
            </div>
            <div class="flex items-center gap-1">
              <button
                type="button"
                aria-label="Bulan Sebelumnya"
                class="w-8 h-8 rounded-full bg-surface-container-low hover:bg-surface-variant flex items-center justify-center text-on-surface active:scale-90 transition-all cursor-pointer"
                @click="prevMonth"
              >
                <span class="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              <button
                type="button"
                aria-label="Bulan Berikutnya"
                class="w-8 h-8 rounded-full bg-surface-container-low hover:bg-surface-variant flex items-center justify-center text-on-surface active:scale-90 transition-all cursor-pointer"
                @click="nextMonth"
              >
                <span class="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>

          <!-- Days Header (Min - Sab) -->
          <div class="grid grid-cols-7 text-center mb-1 text-[11px] font-semibold text-muted tracking-wide">
            <div class="text-rose-500 py-1">Min</div>
            <div class="py-1">Sen</div>
            <div class="py-1">Sel</div>
            <div class="py-1">Rab</div>
            <div class="py-1">Kam</div>
            <div class="py-1">Jum</div>
            <div class="py-1">Sab</div>
          </div>

          <!-- Calendar Days Grid -->
          <div class="grid grid-cols-7 gap-y-1 gap-x-1">
            <button
              v-for="cell in calendarCells"
              :key="cell.dateKey"
              type="button"
              class="relative flex flex-col items-center justify-center py-1.5 px-0.5 rounded-2xl transition-all duration-150 min-h-[44px] cursor-pointer"
              :class="[
                cell.isSelected
                  ? 'bg-primary text-white font-bold shadow-md shadow-primary/30 scale-105 z-10 ring-2 ring-primary/40'
                  : cell.isToday
                    ? 'bg-primary/10 text-primary font-bold hover:bg-primary/20 ring-1 ring-primary/30'
                    : cell.isCurrentMonth
                      ? 'text-on-surface hover:bg-surface-container font-medium'
                      : 'text-muted/40 font-normal hover:bg-surface-container/50'
              ]"
              @click="selectDate(cell.dateKey)"
            >
              <!-- Day Number -->
              <span class="text-[13px] leading-none mb-1">{{ cell.dayNum }}</span>

              <!-- Indicator Dots Container -->
              <div class="flex items-center gap-0.5 h-1.5 justify-center">
                <span
                  v-if="cell.hasIncome"
                  class="w-1.5 h-1.5 rounded-full"
                  :class="cell.isSelected ? 'bg-emerald-300' : 'bg-emerald-500'"
                ></span>
                <span
                  v-if="cell.hasExpense"
                  class="w-1.5 h-1.5 rounded-full"
                  :class="cell.isSelected ? 'bg-rose-300' : 'bg-rose-500'"
                ></span>
                <span
                  v-if="cell.hasDebt"
                  class="w-1.5 h-1.5 rounded-full"
                  :class="cell.isSelected ? 'bg-amber-300' : 'bg-amber-500'"
                ></span>
                <span
                  v-if="cell.hasBill"
                  class="w-1.5 h-1.5 rounded-full"
                  :class="cell.isSelected ? 'bg-indigo-300' : 'bg-indigo-600'"
                  title="Ada Tagihan"
                ></span>
                <span
                  v-if="!cell.hasIncome && !cell.hasExpense && !cell.hasDebt && !cell.hasBill"
                  class="w-1 h-1 rounded-full opacity-0"
                ></span>
              </div>
            </button>
          </div>

          <!-- Color Legend -->
          <div class="flex items-center justify-center gap-3 mt-3 pt-3 border-t border-surface-variant/40 text-[11px] text-muted flex-wrap">
            <div class="flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Pemasukan</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-rose-500"></span>
              <span>Pengeluaran</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>Hutang</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-indigo-600"></span>
              <span>Tagihan</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Ringkasan Harian (Daily Summary) -->
      <div class="px-4">
        <div class="bg-white rounded-3xl p-4 shadow-sm border border-surface-variant/50 space-y-3">
          <div class="flex items-center justify-between pb-1 border-b border-surface-variant/30">
            <div>
              <span class="text-[10px] font-semibold uppercase tracking-wider text-muted block">Ringkasan Harian</span>
              <h3 class="text-[15px] font-bold text-on-background">{{ selectedDateInfo.title }}</h3>
            </div>
            <span
              class="text-xs font-bold px-2.5 py-1 rounded-full"
              :class="[
                selectedDateInfo.net > 0
                  ? 'bg-emerald-100 text-emerald-700'
                  : selectedDateInfo.net < 0
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-surface-variant text-muted'
              ]"
            >
              {{ selectedDateInfo.net > 0 ? '+' : selectedDateInfo.net < 0 ? '-' : '' }}{{ formatRupiah(selectedDateInfo.net) }}
            </span>
          </div>

          <!-- 4 Metric Cards -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <!-- 1. Pemasukan -->
            <div class="bg-surface-container-low/70 rounded-2xl p-2.5 border border-emerald-200">
              <div class="flex items-center gap-1 text-emerald-600 text-[11px] font-semibold mb-1">
                <span class="material-symbols-outlined text-[15px]">arrow_upward</span>
                <span>Pemasukan</span>
              </div>
              <div class="font-bold text-xs sm:text-sm text-emerald-600 truncate font-tabular-number">
                {{ selectedDateInfo.income > 0 ? `+${formatRupiah(selectedDateInfo.income)}` : 'Rp 0' }}
              </div>
            </div>

            <!-- 2. Pengeluaran -->
            <div class="bg-surface-container-low/70 rounded-2xl p-2.5 border border-rose-200">
              <div class="flex items-center gap-1 text-rose-600 text-[11px] font-semibold mb-1">
                <span class="material-symbols-outlined text-[15px]">arrow_downward</span>
                <span>Pengeluaran</span>
              </div>
              <div class="font-bold text-xs sm:text-sm text-rose-600 truncate font-tabular-number">
                {{ selectedDateInfo.expense > 0 ? `-${formatRupiah(selectedDateInfo.expense)}` : 'Rp 0' }}
              </div>
            </div>

            <!-- 3. Hutang -->
            <div class="bg-surface-container-low/70 rounded-2xl p-2.5 border border-amber-200">
              <div class="flex items-center gap-1 text-amber-600 text-[11px] font-semibold mb-1">
                <span class="material-symbols-outlined text-[15px]">warning</span>
                <span>Hutang</span>
              </div>
              <div class="font-bold text-xs sm:text-sm text-amber-600 truncate font-tabular-number">
                {{ selectedDateInfo.debt > 0 ? `-${formatRupiah(selectedDateInfo.debt)}` : 'Rp 0' }}
              </div>
            </div>

            <!-- 4. Arus Kas Net -->
            <div class="bg-primary/5 rounded-2xl p-2.5 border border-primary/20">
              <div class="flex items-center gap-1 text-primary text-[11px] font-semibold mb-1">
                <span class="material-symbols-outlined text-[15px]">account_balance_wallet</span>
                <span>Arus Kas Net</span>
              </div>
              <div
                class="font-bold text-xs sm:text-sm truncate font-tabular-number"
                :class="selectedDateInfo.net >= 0 ? 'text-primary' : 'text-rose-600'"
              >
                {{ selectedDateInfo.net > 0 ? '+' : selectedDateInfo.net < 0 ? '-' : '' }}{{ formatRupiah(selectedDateInfo.net) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Bills on Selected Date -->
      <div v-if="selectedDateInfo.bills && selectedDateInfo.bills.length > 0" class="px-4 pb-2 space-y-2">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold text-on-background flex items-center gap-1.5">
            <span class="material-symbols-outlined text-indigo-600 text-[18px]">receipt_long</span>
            <span>Tagihan Jatuh Tempo</span>
          </h3>
          <span class="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
            {{ selectedDateInfo.bills.length }} Tagihan
          </span>
        </div>

        <div class="space-y-2">
          <div
            v-for="b in selectedDateInfo.bills"
            :key="b.id"
            class="bg-white rounded-2xl p-3.5 shadow-xs border flex items-center justify-between transition-all"
            :class="b.status === 'lunas' ? 'border-emerald-200 bg-emerald-50/20' : 'border-indigo-100 bg-indigo-50/10'"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-xl flex items-center justify-center font-bold relative shrink-0"
                :class="b.status === 'lunas' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'"
              >
                <span class="material-symbols-outlined text-[20px]">{{ getBillIcon(b.name) }}</span>
                <div
                  class="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border border-surface flex items-center justify-center text-[7px] text-white font-bold"
                  :class="b.owner === 'Suami' ? 'bg-suami' : b.owner === 'Istri' ? 'bg-istri' : 'bg-primary'"
                >
                  {{ b.owner === 'Suami' ? 'S' : b.owner === 'Istri' ? 'I' : 'B' }}
                </div>
              </div>
              <div>
                <div class="flex items-center gap-1.5">
                  <h4 class="text-[13px] font-bold text-on-background leading-snug">{{ b.name }}</h4>
                  <span
                    class="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
                    :class="b.status === 'lunas' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800 border border-amber-200'"
                  >
                    {{ b.status === 'lunas' ? 'Lunas' : 'Belum Bayar' }}
                  </span>
                </div>
                <p class="text-[11px] text-muted">
                  {{ b.owner }} • {{ b.isRecurring ? 'Bulanan' : 'Sekali' }}
                </p>
              </div>
            </div>

            <div class="text-right flex flex-col items-end gap-1.5">
              <span class="text-xs font-bold text-on-background tabular-nums">{{ b.amountText }}</span>
              <button
                v-if="b.status !== 'lunas'"
                type="button"
                class="text-[11px] font-bold px-3 py-1 rounded-xl bg-gradient-to-r from-primary to-indigo-600 text-white flex items-center gap-1 shadow-xs active:scale-95 transition-all cursor-pointer"
                @click="openPayBillModal(b)"
              >
                <span class="material-symbols-outlined text-[13px]">payments</span>
                <span>Bayar &amp; Catat</span>
              </button>
              <span v-else class="text-[11px] font-semibold text-emerald-600 flex items-center gap-0.5">
                <span class="material-symbols-outlined text-[13px]">check_circle</span> Lunas
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Transaction List Section -->
      <div class="px-4 pb-4 space-y-2">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold text-on-background flex items-center gap-1.5">
            <span class="material-symbols-outlined text-primary text-[18px]">receipt_long</span>
            <span>Daftar Transaksi</span>
          </h3>
          <span class="text-[11px] font-semibold text-muted bg-surface-container px-2 py-0.5 rounded-full">
            {{ selectedDateInfo.transactions.length }} Transaksi
          </span>
        </div>

        <!-- Clean Empty State -->
        <div
          v-if="selectedDateInfo.transactions.length === 0"
          class="bg-white rounded-3xl p-6 text-center shadow-sm border border-surface-variant/40 flex flex-col items-center justify-center"
        >
          <div class="w-14 h-14 rounded-2xl bg-surface-container flex items-center justify-center text-muted mb-2">
            <span class="material-symbols-outlined text-[30px]">event_available</span>
          </div>
          <h4 class="text-sm font-bold text-on-background">Tidak ada transaksi pada tanggal ini</h4>
          <p class="text-[12px] text-muted max-w-[240px] mt-1">Belum ada catatan pemasukan, pengeluaran, atau hutang pada tanggal ini.</p>
          <button
            type="button"
            class="mt-3 px-4 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-all flex items-center gap-1.5 cursor-pointer"
            @click="router.push(`/input/transaksi?date=${selectedDateStr}`)"
          >
            <span class="material-symbols-outlined text-[16px]">add_circle</span> Catat di Tanggal Ini
          </button>
        </div>

        <!-- List of Transactions -->
        <div v-else class="space-y-2">
          <div
            v-for="tx in selectedDateInfo.transactions"
            :key="tx.id"
            class="bg-white rounded-2xl p-3.5 shadow-xs border border-surface-variant/40 flex items-center justify-between hover:shadow-sm transition-all"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                :class="[
                  tx.type === 'income'
                    ? 'bg-emerald-100 text-emerald-600'
                    : tx.type === 'debt'
                      ? 'bg-amber-100 text-amber-600'
                      : 'bg-rose-100 text-rose-600'
                ]"
              >
                <span class="material-symbols-outlined text-[20px]">{{ tx.icon }}</span>
              </div>
              <div>
                <div class="flex items-center gap-1.5">
                  <h4 class="text-[13px] font-bold text-on-background leading-snug">{{ tx.title }}</h4>
                  <span
                    class="text-[9px] font-bold px-1.5 py-0.5 rounded-md border"
                    :class="[
                      tx.owner === 'Suami'
                        ? 'bg-blue-50 text-blue-600 border-blue-200'
                        : tx.owner === 'Istri'
                          ? 'bg-pink-50 text-pink-600 border-pink-200'
                          : 'bg-primary/10 text-primary border-primary/20'
                    ]"
                  >
                    {{ tx.owner }}
                  </span>
                </div>
                <div class="flex items-center gap-2 text-[11px] text-muted mt-0.5">
                  <span>{{ tx.time }}</span>
                  <span>•</span>
                  <span>{{ tx.category }}</span>
                  <span>•</span>
                  <span class="truncate max-w-[100px]">{{ tx.account }}</span>
                </div>
              </div>
            </div>

            <div class="text-right shrink-0">
              <span
                class="font-tabular-number text-[13px] font-bold block"
                :class="[
                  tx.type === 'income'
                    ? 'text-emerald-600'
                    : tx.type === 'debt'
                      ? 'text-amber-600'
                      : 'text-rose-600'
                ]"
              >
                {{ tx.type === 'income' ? '+' : '-' }}{{ formatRupiah(tx.amount) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ============================================== -->
    <!-- VIEW 2: TREN & KATEGORI (ANALYTICS)            -->
    <!-- ============================================== -->
    <div v-else class="flex flex-col w-full space-y-4 pt-1">
      
      <!-- Period Filter -->
      <div class="px-4">
        <div class="flex bg-surface-container-low p-1 rounded-2xl gap-1 border border-surface-variant/40">
          <button
            v-for="f in filters"
            :key="f.key"
            type="button"
            class="flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            :class="activeFilter === f.key ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:text-on-background'"
            @click="activeFilter = f.key"
          >
            {{ f.label }}
          </button>
        </div>
      </div>

      <!-- Couple AI Insights Card -->
      <div class="px-4">
        <div class="bg-gradient-to-br from-primary/10 via-primary/5 to-surface-container-low rounded-2xl p-4 border border-primary/20 shadow-xs relative overflow-hidden">
          <div class="absolute -right-6 -bottom-6 w-28 h-28 bg-primary/10 rounded-full blur-2xl pointer-events-none"></div>
          <div class="flex items-start justify-between mb-3">
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center shadow-xs">
                <span class="material-symbols-outlined text-[16px]">smart_toy</span>
              </div>
              <span class="text-[12px] font-bold text-primary uppercase tracking-wide flex items-center gap-1">
                Couple AI Insights <span class="material-symbols-outlined text-[13px]">auto_awesome</span>
              </span>
            </div>
            <span class="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
              Sinkron Berdua
            </span>
          </div>
          <p class="text-[13px] text-on-surface font-medium leading-relaxed mb-3.5">
            Total pengeluaran tercatat <strong class="text-on-background font-semibold">{{ analyticsData?.expenseTotalText || 'Rp 0' }}</strong> 
            dan pemasukan <strong class="text-emerald-600 font-semibold">{{ analyticsData?.incomeTotalText || 'Rp 0' }}</strong>. 
            {{ categories.length > 0 ? `Pengeluaran terbesar ada di kategori ${categories[0]?.name}.` : 'Keuangan keluarga tersinkron rapi.' }}
          </p>
          <div v-if="hasPartner" class="pt-3 border-t border-primary/10 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-[11px] text-muted font-medium">Kontribusi:</span>
              <div class="flex items-center gap-1.5 text-[11px] font-semibold">
                <span class="flex items-center gap-1 text-blue-600">
                  <span class="w-2 h-2 rounded-full bg-blue-500"></span> Suami {{ analyticsData?.contribution.suamiPct }}%
                </span>
                <span class="text-muted">•</span>
                <span class="flex items-center gap-1 text-pink-600">
                  <span class="w-2 h-2 rounded-full bg-pink-500"></span> Istri {{ analyticsData?.contribution.istriPct }}%
                </span>
              </div>
            </div>
            <span class="text-[11px] font-semibold text-primary">{{ analyticsData?.expenseTotalText }} Total</span>
          </div>
        </div>
      </div>

      <!-- Interactive Summary Tabs (Expense vs Income) -->
      <section class="summary-scroll hide-scrollbar px-4 flex gap-3 overflow-x-auto">
        <!-- Card Total Pengeluaran -->
        <div
          class="summary-card flex-1 min-w-[150px] p-4 rounded-2xl flex flex-col justify-between cursor-pointer transition-all duration-200 border-2"
          :class="activeType === 'expense' ? 'bg-primary text-white border-primary shadow-md' : 'bg-white text-on-surface border-surface-variant/50'"
          @click="activeType = 'expense'"
        >
          <div class="flex items-center justify-between mb-1">
            <span class="text-[11px] font-bold uppercase tracking-wider opacity-85">Total Pengeluaran</span>
            <span v-if="activeType === 'expense'" class="material-symbols-outlined text-[16px]">check_circle</span>
          </div>
          <div class="text-xl font-bold font-tabular-number tracking-tight">
            {{ analyticsData?.expenseTotalText || 'Rp 0' }}
          </div>
        </div>

        <!-- Card Total Pemasukan -->
        <div
          class="summary-card flex-1 min-w-[150px] p-4 rounded-2xl flex flex-col justify-between cursor-pointer transition-all duration-200 border-2"
          :class="activeType === 'income' ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-white text-on-surface border-surface-variant/50'"
          @click="activeType = 'income'"
        >
          <div class="flex items-center justify-between mb-1">
            <span class="text-[11px] font-bold uppercase tracking-wider opacity-85">Total Pemasukan</span>
            <span v-if="activeType === 'income'" class="material-symbols-outlined text-[16px]">check_circle</span>
          </div>
          <div class="text-xl font-bold font-tabular-number tracking-tight">
            {{ analyticsData?.incomeTotalText || 'Rp 0' }}
          </div>
        </div>
      </section>

      <!-- SVG Trend Chart -->
      <div class="px-4">
        <div class="bg-white rounded-3xl p-4 shadow-sm border border-surface-variant/50">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <span class="material-symbols-outlined text-[16px]">show_chart</span>
              </div>
              <h2 class="text-[15px] font-bold text-on-surface">
                {{ activeType === 'expense' ? 'Tren Pengeluaran' : 'Tren Pemasukan' }}
              </h2>
            </div>
            <span class="text-[11px] text-muted capitalize">
              {{ activeFilter === 'bulanan' ? 'Bulan Ini' : activeFilter === 'mingguan' ? 'Minggu Ini' : 'Tahun Ini' }}
            </span>
          </div>

          <div class="relative w-full pt-2">
            <div class="w-full h-36 relative">
              <!-- Background grid lines -->
              <div class="absolute inset-0 flex flex-col justify-between pointer-events-none">
                <div v-for="n in 4" :key="n" class="w-full h-px bg-surface-container-highest"></div>
              </div>

              <!-- SVG Curve -->
              <svg class="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" :stop-color="activeType === 'expense' ? '#4648d4' : '#10B981'" stop-opacity="0.35"/>
                    <stop offset="100%" :stop-color="activeType === 'expense' ? '#4648d4' : '#10B981'" stop-opacity="0"/>
                  </linearGradient>
                </defs>
                <path :d="trendAreaPath" fill="url(#chartGradient)"/>
                <path :d="trendPath" fill="none" :stroke="activeType === 'expense' ? '#4648d4' : '#10B981'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>

            <!-- X Axis Dates -->
            <div class="flex justify-between text-[10px] font-medium text-muted mt-2 px-1">
              <span v-for="p in trendPoints" :key="p.date">{{ p.date }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Distribusi Kategori -->
      <div class="px-4">
        <div class="bg-white rounded-3xl p-4 shadow-sm border border-surface-variant/50">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <span class="material-symbols-outlined text-[16px]">pie_chart</span>
              </div>
              <h2 class="text-[15px] font-bold text-on-surface">Distribusi Kategori</h2>
            </div>
            <span class="text-[11px] font-medium text-muted">{{ categories.length }} Pos Aktif</span>
          </div>

          <div v-if="categories.length === 0" class="text-center py-6 text-muted text-xs">
            Belum ada transaksi di periode ini.
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="cat in categories"
              :key="cat.name"
              class="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-low/50 border border-surface-variant/30"
            >
              <div class="flex items-center gap-3 flex-1 min-w-0 mr-3">
                <div class="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center text-primary shrink-0">
                  <span class="material-symbols-outlined text-[18px]">{{ cat.icon }}</span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between mb-1">
                    <p class="text-[13px] font-bold text-on-surface truncate">{{ cat.name }}</p>
                    <span class="text-[12px] font-bold text-on-surface font-tabular-number ml-2">{{ cat.amountText }}</span>
                  </div>
                  <!-- Progress bar -->
                  <div class="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                    <div class="h-full bg-primary rounded-full transition-all duration-500" :style="{ width: `${cat.pct}%` }"></div>
                  </div>
                </div>
              </div>
              <span class="text-[11px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-md shrink-0">
                {{ cat.pct }}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Partner Contribution Card (If Couple) -->
      <div v-if="hasPartner" class="px-4">
        <div class="bg-white rounded-3xl p-4 shadow-sm border border-surface-variant/50 space-y-3">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <span class="material-symbols-outlined text-[16px]">group</span>
            </div>
            <h2 class="text-[15px] font-bold text-on-surface">Kontribusi Berdua</h2>
          </div>

          <div class="space-y-2">
            <!-- Suami Row -->
            <div class="flex items-center justify-between text-xs">
              <div class="flex items-center gap-2">
                <div class="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-bold">
                  {{ currentHousehold?.suami?.initial || 'S' }}
                </div>
                <span class="font-medium text-on-surface">{{ currentHousehold?.suami?.firstName || 'Suami' }} (Suami)</span>
              </div>
              <span class="font-bold text-on-surface">
                {{ activeType === 'expense' ? analyticsData?.contribution.suamiText : analyticsData?.incomeContribution.suamiText }}
                <span class="text-muted font-normal">({{ activeType === 'expense' ? analyticsData?.contribution.suamiPct : analyticsData?.incomeContribution.suamiPct }}%)</span>
              </span>
            </div>

            <!-- Dual-tone progress -->
            <div class="h-2.5 w-full bg-surface-container rounded-full overflow-hidden flex">
              <div
                class="h-full bg-blue-500 transition-all duration-500"
                :style="{ width: `${activeType === 'expense' ? analyticsData?.contribution.suamiPct : analyticsData?.incomeContribution.suamiPct}%` }"
              ></div>
              <div
                class="h-full bg-pink-500 transition-all duration-500"
                :style="{ width: `${activeType === 'expense' ? analyticsData?.contribution.istriPct : analyticsData?.incomeContribution.istriPct}%` }"
              ></div>
            </div>

            <!-- Istri Row -->
            <div class="flex items-center justify-between text-xs">
              <div class="flex items-center gap-2">
                <div class="w-6 h-6 rounded-full bg-pink-500 text-white flex items-center justify-center text-[10px] font-bold">
                  {{ currentHousehold?.istri?.initial || 'I' }}
                </div>
                <span class="font-medium text-on-surface">{{ currentHousehold?.istri?.firstName || 'Istri' }} (Istri)</span>
              </div>
              <span class="font-bold text-on-surface">
                {{ activeType === 'expense' ? analyticsData?.contribution.istriText : analyticsData?.incomeContribution.istriText }}
                <span class="text-muted font-normal">({{ activeType === 'expense' ? analyticsData?.contribution.istriPct : analyticsData?.incomeContribution.istriPct }}%)</span>
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- Modal Dialog: Bayar & Catat Tagihan dari Kalender -->
    <div
      v-if="isPayBillModalOpen && activePayBill"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 transition-opacity duration-300 animate-fade-in"
      @click.self="isPayBillModalOpen = false"
    >
      <div class="bg-white w-full max-w-md rounded-3xl p-5 shadow-2xl flex flex-col gap-4 border border-surface-variant/40 max-h-[90vh] overflow-y-auto">
        <!-- Header -->
        <div class="flex items-center justify-between pb-2 border-b border-surface-variant/20">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <span class="material-symbols-outlined text-[20px]">receipt_long</span>
            </div>
            <div>
              <h3 class="text-sm font-bold text-on-background">Bayar &amp; Catat Tagihan</h3>
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
        <div class="p-3.5 bg-surface-container-lowest rounded-2xl border border-surface-variant/30 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs text-muted font-medium">Nama Tagihan</span>
            <span class="text-xs font-bold text-on-background">{{ activePayBill.name }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-xs text-muted font-medium">Jatuh Tempo</span>
            <span class="text-xs font-semibold text-on-background">{{ activePayBill.dueDate }}</span>
          </div>
          <div class="flex items-center justify-between pt-2 border-t border-surface-variant/20">
            <span class="text-xs font-bold text-on-background">Nominal Pembayaran</span>
            <span class="text-base font-extrabold text-primary tabular-nums">{{ activePayBill.amountText }}</span>
          </div>
        </div>

        <!-- Pilihan Pos Akun Sumber -->
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold text-on-background">Pilih Pos Akun Sumber Pembayaran</label>
          <select
            v-model="selectedPayAccountId"
            class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-lowest border border-surface-variant/60 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
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
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
