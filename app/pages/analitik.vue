<script setup lang="ts">
definePageMeta({ layout: 'app' })
useHead({ title: 'Analitik — CoupleCash' })

const { currentHousehold, hasPartner, currentUser, getAuthToken } = useAuth()
const router = useRouter()
const route = useRoute()

// ── Top Segmented View ──
const currentView = ref<'calendar' | 'trends'>(route.query.tab === 'trends' ? 'trends' : 'calendar')

// ── Calendar & Period State ──
const monthNamesId = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]
const dayNamesId = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

const realToday = new Date()
const activeDate = ref<Date>(new Date())
const showExportModal = ref(false)

type PeriodFilter = '1w' | '2w' | '1m' | '1y'
const periodFilter = ref<PeriodFilter>('1m') // 1 Bulan as Default

const periodOptions = computed(() => {
  if (currentView.value === 'calendar') {
    return [
      { key: '1w' as PeriodFilter, label: '1 Minggu' },
      { key: '2w' as PeriodFilter, label: '2 Minggu' },
      { key: '1m' as PeriodFilter, label: '1 Bulan' },
    ]
  }
  return [
    { key: '1w' as PeriodFilter, label: '1 Minggu' },
    { key: '2w' as PeriodFilter, label: '2 Minggu' },
    { key: '1m' as PeriodFilter, label: '1 Bulan' },
    { key: '1y' as PeriodFilter, label: '1 Tahun' },
  ]
})

function formatDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const currentYear = computed(() => activeDate.value.getFullYear())
const currentMonth = computed(() => activeDate.value.getMonth() + 1) // 1-12
const activeMonthName = computed(() => monthNamesId[currentMonth.value - 1] || 'Bulan Ini')

// Adaptive Date Range Math (starts on Sunday)
const periodDateRange = computed(() => {
  const base = new Date(activeDate.value)
  const y = base.getFullYear()
  const m = base.getMonth()

  if (periodFilter.value === '1w') {
    const dayOfWeek = base.getDay() // 0 = Sun
    const start = new Date(base)
    start.setDate(base.getDate() - dayOfWeek)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    const sStr = formatDateKey(start)
    const eStr = formatDateKey(end)
    const title = `${start.getDate()} ${monthNamesId[start.getMonth()].slice(0, 3)} - ${end.getDate()} ${monthNamesId[end.getMonth()].slice(0, 3)} ${end.getFullYear()}`
    return { start, end, startDateStr: sStr, endDateStr: eStr, periodTitle: title }
  } else if (periodFilter.value === '2w') {
    const dayOfWeek = base.getDay()
    const start = new Date(base)
    start.setDate(base.getDate() - dayOfWeek - 7)
    const end = new Date(start)
    end.setDate(start.getDate() + 13)
    const sStr = formatDateKey(start)
    const eStr = formatDateKey(end)
    const title = `${start.getDate()} ${monthNamesId[start.getMonth()].slice(0, 3)} - ${end.getDate()} ${monthNamesId[end.getMonth()].slice(0, 3)} ${end.getFullYear()}`
    return { start, end, startDateStr: sStr, endDateStr: eStr, periodTitle: title }
  } else if (periodFilter.value === '1y') {
    const start = new Date(y, 0, 1)
    const end = new Date(y, 11, 31)
    const sStr = formatDateKey(start)
    const eStr = formatDateKey(end)
    const title = `Tahun ${y}`
    return { start, end, startDateStr: sStr, endDateStr: eStr, periodTitle: title }
  } else {
    // 1 Bulan (Default)
    const start = new Date(y, m, 1)
    const end = new Date(y, m + 1, 0)
    const sStr = formatDateKey(start)
    const eStr = formatDateKey(end)
    const title = `${monthNamesId[m]} ${y}`
    return { start, end, startDateStr: sStr, endDateStr: eStr, periodTitle: title }
  }
})

const todayKey = formatDateKey(realToday)
const selectedDateStr = ref(todayKey)

// Fetch Calendar Data for current period
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

async function fetchCalendarData() {
  calendarLoading.value = true
  try {
    const token = await getAuthToken()
    const { startDateStr, endDateStr } = periodDateRange.value

    const res = await $fetch<{
      success: boolean
      year: number
      month: number
      startDate?: string
      endDate?: string
      dailyData: Record<string, any>
    }>('/api/analytics/calendar', {
      query: {
        year: currentYear.value,
        month: currentMonth.value,
        startDate: startDateStr,
        endDate: endDateStr,
      },
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    calendarDailyData.value = res.dailyData || {}
  } catch (err) {
    console.error('[analitik] Failed to fetch calendar data:', err)
  } finally {
    calendarLoading.value = false
  }
}

// Watch date range or period changes
watch(
  [() => periodDateRange.value.startDateStr, () => periodDateRange.value.endDateStr, periodFilter],
  () => {
    fetchCalendarData()
  }
)

function setPeriod(p: PeriodFilter) {
  periodFilter.value = p
  if (p === '1w' || p === '2w') activeFilter.value = 'mingguan'
  else if (p === '1m') activeFilter.value = 'bulanan'
  else if (p === '1y') activeFilter.value = 'tahunan'
}

// Calendar Grid Calculations (1 Minggu: 7 cells, 2 Minggu: 14 cells, 1 Bulan: full month grid)
interface CalendarCell {
  dayNum: number
  dateKey: string
  isCurrentMonth: boolean
  isSelected: boolean
  isToday: boolean
  hasIncome: boolean
  hasExpense: boolean
  hasDebt: boolean
}

const calendarCells = computed<CalendarCell[]>(() => {
  const cells: CalendarCell[] = []
  const { start } = periodDateRange.value

  // 1 Minggu: 7 hari
  if (periodFilter.value === '1w') {
    for (let i = 0; i < 7; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      const dKey = formatDateKey(d)
      const data = calendarDailyData.value[dKey]
      cells.push({
        dayNum: d.getDate(),
        dateKey: dKey,
        isCurrentMonth: true,
        isSelected: dKey === selectedDateStr.value,
        isToday: dKey === todayKey,
        hasIncome: (data?.income ?? 0) > 0,
        hasExpense: (data?.expense ?? 0) > 0,
        hasDebt: (data?.debt ?? 0) > 0,
      })
    }
    return cells
  }

  // 2 Minggu: 14 hari
  if (periodFilter.value === '2w') {
    for (let i = 0; i < 14; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      const dKey = formatDateKey(d)
      const data = calendarDailyData.value[dKey]
      cells.push({
        dayNum: d.getDate(),
        dateKey: dKey,
        isCurrentMonth: true,
        isSelected: dKey === selectedDateStr.value,
        isToday: dKey === todayKey,
        hasIncome: (data?.income ?? 0) > 0,
        hasExpense: (data?.expense ?? 0) > 0,
        hasDebt: (data?.debt ?? 0) > 0,
      })
    }
    return cells
  }

  // 1 Bulan: Full month calendar grid with leading & trailing slots
  const y = activeDate.value.getFullYear()
  const m = activeDate.value.getMonth()
  const firstDayOfMonth = new Date(y, m, 1)
  const totalDays = new Date(y, m + 1, 0).getDate()
  const startingDayOfWeek = firstDayOfMonth.getDay() // 0 = Minggu

  // Leading days
  const prevMonthTotalDays = new Date(y, m, 0).getDate()
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const dayNum = prevMonthTotalDays - i
    const prevMonthNum = m === 0 ? 12 : m
    const prevYearNum = m === 0 ? y - 1 : y
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
    })
  }

  // Days of current month
  for (let day = 1; day <= totalDays; day++) {
    const dKey = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const data = calendarDailyData.value[dKey]
    cells.push({
      dayNum: day,
      dateKey: dKey,
      isCurrentMonth: true,
      isSelected: dKey === selectedDateStr.value,
      isToday: dKey === todayKey,
      hasIncome: (data?.income ?? 0) > 0,
      hasExpense: (data?.expense ?? 0) > 0,
      hasDebt: (data?.debt ?? 0) > 0,
    })
  }

  // Trailing days
  const totalFilled = startingDayOfWeek + totalDays
  const remainingSlots = totalFilled % 7 === 0 ? 0 : 7 - (totalFilled % 7)
  for (let j = 1; j <= remainingSlots; j++) {
    const nextMonthNum = m === 11 ? 1 : m + 2
    const nextYearNum = m === 11 ? y + 1 : y
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
    })
  }

  return cells
})

function prevPeriod() {
  const d = new Date(activeDate.value)
  if (periodFilter.value === '1w') {
    d.setDate(d.getDate() - 7)
  } else if (periodFilter.value === '2w') {
    d.setDate(d.getDate() - 14)
  } else {
    d.setMonth(d.getMonth() - 1)
  }
  activeDate.value = d
}

function nextPeriod() {
  const d = new Date(activeDate.value)
  if (periodFilter.value === '1w') {
    d.setDate(d.getDate() + 7)
  } else if (periodFilter.value === '2w') {
    d.setDate(d.getDate() + 14)
  } else {
    d.setMonth(d.getMonth() + 1)
  }
  activeDate.value = d
}

function goToToday() {
  activeDate.value = new Date()
  selectedDateStr.value = todayKey
}

function selectDate(key: string) {
  selectedDateStr.value = key
}

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
  return 'Rp ' + Math.abs(num || 0).toLocaleString('id-ID')
}

// ── Trends & Category State ──
type Period = 'mingguan' | 'bulanan' | 'tahunan'
type CategoryType = 'expense' | 'income'

const activeFilter = ref<Period>('bulanan')
const activeType = ref<CategoryType>('expense')

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
  fetchCalendarData()
  fetchAccounts()
  fetchAnalyticsData()
})

// Counts of transactions per category in the current period
const categoryUsageCounts = computed(() => {
  const counts: Record<string, number> = {}
  for (const day of Object.values(calendarDailyData.value)) {
    if (day.transactions) {
      for (const tx of day.transactions) {
        if (tx.category) {
          counts[tx.category] = (counts[tx.category] || 0) + 1
        }
      }
    }
  }
  return counts
})

const categories = computed(() => {
  if (activeType.value === 'income') {
    return analyticsData.value?.incomeCategories ?? []
  }
  return analyticsData.value?.expenseCategories ?? []
})

// Clean Color Palette for Categories
const categoryDotColors = [
  '#3B82F6', '#F59E0B', '#06B6D4', '#64748B', '#EC4899', '#10B981', '#8B5CF6', '#F43F5E'
]

// Porsi Belanja Keluarga Computations
const totalExpense = computed(() => analyticsData.value?.expenseTotal ?? 0)
const totalIncome = computed(() => analyticsData.value?.incomeTotal ?? 0)
const netCashflow = computed(() => totalIncome.value - totalExpense.value)

const suamiExpense = computed(() => analyticsData.value?.contribution?.suami ?? 0)
const suamiPct = computed(() => analyticsData.value?.contribution?.suamiPct ?? 0)

const istriExpense = computed(() => analyticsData.value?.contribution?.istri ?? 0)
const istriPct = computed(() => analyticsData.value?.contribution?.istriPct ?? 0)

const bersamaExpense = computed(() => {
  const diff = totalExpense.value - (suamiExpense.value + istriExpense.value)
  return Math.max(0, diff)
})
const bersamaPct = computed(() => {
  if (totalExpense.value <= 0) return 0
  const pct = Math.round((bersamaExpense.value / totalExpense.value) * 100)
  return Math.min(100, Math.max(0, pct))
})

// User & Partner Initials for Header Avatar
const userInitial = computed(() => {
  return currentUser.value?.fullName?.charAt(0)?.toUpperCase() || (currentUser.value?.role === 'istri' ? 'I' : 'S')
})

const partnerInitial = computed(() => {
  if (currentUser.value?.role === 'suami') {
    return currentHousehold.value?.istri?.initial || 'I'
  }
  return currentHousehold.value?.suami?.initial || 'S'
})

const { startTour, shouldTriggerTour } = useWalkthrough()

onMounted(() => {
  setTimeout(() => {
    if (shouldTriggerTour('analitik')) {
      startTour('analitik')
    }
  }, 500)
})
</script>

<template>
  <div class="analitik-page animate-fade-in pb-28 px-4 pt-4 space-y-3.5">

    <!-- Top Navigation Header (Analitik + Profile Avatars) -->
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-extrabold text-on-background tracking-tight">Analitik</h1>
      
      <!-- Right Dual Avatar Circles (Like React Native) -->
      <div class="flex items-center gap-2">
        <!-- Quick Export Button -->
        <button
          type="button"
          class="w-8 h-8 rounded-full bg-surface-container dark:bg-[#1c202a] border border-surface-variant/40 dark:border-[#282b37] flex items-center justify-center text-on-surface-variant hover:text-primary transition-all cursor-pointer"
          @click="showExportModal = true"
          title="Ekspor Data ke Excel"
        >
          <span class="material-symbols-outlined text-[17px]">table_view</span>
        </button>

        <!-- <NuxtLink
          to="/akun"
          class="flex items-center -space-x-2 cursor-pointer hover:scale-105 active:scale-95 transition-transform"
          title="Profil & Pasangan"
        >
          <div class="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center border-2 border-background shadow-xs">
            {{ userInitial }}
          </div>
          <div
            v-if="hasPartner"
            class="w-8 h-8 rounded-full bg-pink-500 text-white font-bold text-xs flex items-center justify-center border-2 border-background shadow-xs"
          >
            {{ partnerInitial }}
          </div>
          <div
            v-else
            class="w-8 h-8 rounded-full bg-surface-container dark:bg-[#1c202a] border-2 border-dashed border-primary/50 text-primary flex items-center justify-center text-xs shadow-xs"
          >
            <span class="material-symbols-outlined text-[15px]">add</span>
          </div>
        </NuxtLink> -->
      </div>
    </div>

    <!-- Top Segmented Switcher (Kalender Finansial vs Tren & Kategori) -->
    <div class="bg-surface-container dark:bg-[#15171e] p-1 rounded-2xl flex items-center border border-surface-variant/40 dark:border-[#282b37]">
      <button
        type="button"
        class="flex-1 py-2 px-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer text-xs"
        :class="currentView === 'calendar' ? 'bg-white dark:bg-[#1e2029] text-primary dark:text-[#a5b4fc] shadow-sm font-bold' : 'text-muted hover:text-on-background'"
        @click="currentView = 'calendar'"
      >
        <span class="material-symbols-outlined text-[17px]">calendar_month</span>
        <span>Kalender Finansial</span>
      </button>
      <button
        type="button"
        class="flex-1 py-2 px-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer text-xs"
        :class="currentView === 'trends' ? 'bg-white dark:bg-[#1e2029] text-primary dark:text-[#a5b4fc] shadow-sm font-bold' : 'text-muted hover:text-on-background'"
        @click="currentView = 'trends'"
      >
        <span class="material-symbols-outlined text-[17px]">insights</span>
        <span>Tren &amp; Kategori</span>
      </button>
    </div>

    <!-- Period Filter Pills (1 Minggu, 2 Minggu, 1 Bulan, 1 Tahun) -->
    <div class="flex items-center gap-2 overflow-x-auto hide-scrollbar py-0.5">
      <button
        v-for="p in periodOptions"
        :key="p.key"
        type="button"
        class="px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap"
        :class="periodFilter === p.key ? 'bg-blue-600 text-white font-bold shadow-xs' : 'bg-surface-container dark:bg-[#1c202a] text-muted hover:text-on-background'"
        @click="setPeriod(p.key)"
      >
        {{ p.label }}
      </button>
    </div>

    <!-- ============================================== -->
    <!-- VIEW 1: KALENDER FINANSIAL (REACT NATIVE UI)   -->
    <!-- ============================================== -->
    <div v-if="currentView === 'calendar'" class="space-y-3.5">
      
      <!-- 0. Calendar Card (React Native Design with Dynamic Weeks / Month Grid) -->
      <div class="bg-white dark:bg-[#15171e] rounded-3xl p-4 shadow-sm border border-surface-variant/40 dark:border-[#282b37] space-y-3">
        <!-- Header: < PeriodTitle > Hari Ini -->
        <div class="flex items-center justify-between px-1">
          <button
            type="button"
            class="w-8 h-8 rounded-full bg-surface-container dark:bg-[#1e2029] border border-surface-variant/40 dark:border-[#282b37] flex items-center justify-center text-on-surface-variant hover:text-primary active:scale-90 transition-all cursor-pointer"
            @click="prevPeriod"
            aria-label="Periode Sebelumnya"
          >
            <span class="material-symbols-outlined text-[18px]">chevron_left</span>
          </button>

          <span class="text-xs sm:text-sm font-bold text-on-background capitalize text-center">
            {{ periodDateRange.periodTitle }}
          </span>

          <div class="flex items-center gap-2">
            <button
              type="button"
              class="w-8 h-8 rounded-full bg-surface-container dark:bg-[#1e2029] border border-surface-variant/40 dark:border-[#282b37] flex items-center justify-center text-on-surface-variant hover:text-primary active:scale-90 transition-all cursor-pointer"
              @click="nextPeriod"
              aria-label="Periode Berikutnya"
            >
              <span class="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
            <button
              type="button"
              class="text-xs font-bold text-blue-500 hover:text-blue-400 transition-colors cursor-pointer ml-1"
              @click="goToToday"
            >
              Hari Ini
            </button>
          </div>
        </div>

        <!-- Days of Week: Min (red), Sen, Sel, Rab, Kam, Jum, Sab -->
        <div class="grid grid-cols-7 text-center text-[11px] font-semibold text-muted py-1">
          <div class="text-rose-500">Min</div>
          <div>Sen</div>
          <div>Sel</div>
          <div>Rab</div>
          <div>Kam</div>
          <div>Jum</div>
          <div>Sab</div>
        </div>

        <!-- Dates Grid -->
        <div class="grid grid-cols-7 gap-1">
          <template v-for="cell in calendarCells" :key="cell.dateKey">
            <!-- Empty slot for leading/trailing days when in 1 Bulan mode -->
            <div v-if="periodFilter === '1m' && !cell.isCurrentMonth" class="h-10"></div>

            <button
              v-else
              type="button"
              class="h-10 rounded-2xl flex flex-col items-center justify-center relative transition-all cursor-pointer"
              :class="[
                cell.isSelected
                  ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20 scale-105 z-10'
                  : cell.isToday
                    ? 'border-2 border-blue-500 text-blue-500 font-bold'
                    : 'text-on-background hover:bg-surface-container-low dark:hover:bg-[#1e2029]'
              ]"
              @click="selectDate(cell.dateKey)"
            >
              <span class="text-xs leading-none">{{ cell.dayNum }}</span>
              <!-- Indicator dots -->
              <div class="flex items-center justify-center gap-0.5 mt-1 h-1">
                <span v-if="cell.hasIncome" class="w-1 h-1 rounded-full bg-emerald-500"></span>
                <span v-if="cell.hasExpense" class="w-1 h-1 rounded-full bg-rose-500"></span>
                <span v-if="cell.hasDebt" class="w-1 h-1 rounded-full bg-amber-500"></span>
              </div>
            </button>
          </template>
        </div>

        <!-- Legend (Pemasukan, Pengeluaran, Hari Ini) -->
        <div class="pt-2 border-t border-surface-variant/30 dark:border-[#282b37]/60 flex items-center justify-center gap-4 text-[11px] text-muted font-medium">
          <div class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Pemasukan</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-rose-500"></span>
            <span>Pengeluaran</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full border-2 border-blue-500"></span>
            <span>Hari Ini</span>
          </div>
        </div>
      </div>

      <!-- 1. Daily Selected Date Card -->
      <div class="bg-white dark:bg-[#15171e] rounded-3xl p-4 shadow-sm border border-surface-variant/40 dark:border-[#282b37] space-y-3">
        <!-- Date Header & Transaction Count -->
        <div>
          <h2 class="text-sm font-bold text-on-background">{{ selectedDateInfo.title }}</h2>
          <p class="text-[11px] text-muted">{{ selectedDateInfo.transactions.length }} transaksi tercatat</p>
        </div>

        <!-- 2 Side-by-Side Badges (Pemasukan & Pengeluaran) -->
        <div class="grid grid-cols-2 gap-2.5">
          <!-- Pemasukan -->
          <div class="bg-[#edfbf4] dark:bg-emerald-950/25 rounded-2xl p-3 border border-emerald-200/80 dark:border-emerald-800/40">
            <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block mb-0.5">PEMASUKAN</span>
            <span class="font-bold text-sm text-emerald-600 dark:text-emerald-400 font-tabular-number">
              {{ formatRupiah(selectedDateInfo.income) }}
            </span>
          </div>

          <!-- Pengeluaran -->
          <div class="bg-[#fff5f5] dark:bg-rose-950/25 rounded-2xl p-3 border border-rose-200/80 dark:border-rose-800/40">
            <span class="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 block mb-0.5">PENGELUARAN</span>
            <span class="font-bold text-sm text-rose-600 dark:text-rose-400 font-tabular-number">
              {{ formatRupiah(selectedDateInfo.expense) }}
            </span>
          </div>
        </div>

        <!-- Transactions on Selected Date -->
        <div v-if="selectedDateInfo.transactions.length === 0" class="text-center py-2 text-xs text-muted">
          Tidak ada transaksi pada tanggal ini.
        </div>

        <div v-else class="space-y-2 pt-1 border-t border-surface-variant/30 dark:border-[#282b37]/60">
          <div
            v-for="tx in selectedDateInfo.transactions"
            :key="tx.id"
            class="flex items-center justify-between p-2.5 rounded-2xl bg-surface-container-low/50 dark:bg-[#1e2029] border border-surface-variant/30 dark:border-[#282b37]"
          >
            <div class="flex items-center gap-2.5 min-w-0">
              <div
                class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                :class="tx.type === 'income' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300'"
              >
                <span class="material-symbols-outlined text-[18px]">{{ tx.icon || (tx.type === 'income' ? 'south_east' : 'receipt_long') }}</span>
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-1.5">
                  <h4 class="text-xs font-bold text-on-background truncate">{{ tx.title }}</h4>
                  <span
                    v-if="tx.owner"
                    class="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
                    :class="tx.owner === 'Suami' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300'"
                  >
                    {{ tx.owner }}
                  </span>
                </div>
                <p class="text-[10px] text-muted truncate mt-0.5">
                  {{ tx.account }} <span v-if="tx.category">• {{ tx.category }}</span>
                </p>
              </div>
            </div>
            <span
              class="text-xs font-bold font-tabular-number shrink-0 ml-2"
              :class="tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'"
            >
              {{ tx.type === 'income' ? '+' : '-' }}{{ formatRupiah(tx.amount) }}
            </span>
          </div>
        </div>
      </div>

      <!-- 2. Porsi Belanja Keluarga Card -->
      <div class="bg-white dark:bg-[#15171e] rounded-3xl p-4 shadow-sm border border-surface-variant/40 dark:border-[#282b37] space-y-3">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-primary text-[18px]">group</span>
          <h3 class="text-xs font-bold text-on-background">
            Porsi Belanja Keluarga ({{ periodDateRange.periodTitle }})
          </h3>
        </div>

        <div class="grid grid-cols-3 gap-2">
          <!-- Suami -->
          <div class="bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 rounded-2xl p-2.5 text-center space-y-1">
            <span class="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
              Suami
            </span>
            <div class="text-xs font-extrabold text-on-background font-tabular-number truncate">
              {{ formatRupiah(suamiExpense) }}
            </div>
            <div class="text-[10px] text-muted">{{ suamiPct }}% dari total</div>
          </div>

          <!-- Istri -->
          <div class="bg-pink-50/40 dark:bg-pink-950/20 border border-pink-200/80 dark:border-pink-900/40 rounded-2xl p-2.5 text-center space-y-1">
            <span class="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300">
              Istri
            </span>
            <div class="text-xs font-extrabold text-on-background font-tabular-number truncate">
              {{ formatRupiah(istriExpense) }}
            </div>
            <div class="text-[10px] text-muted">{{ istriPct }}% dari total</div>
          </div>

          <!-- Bersama -->
          <div class="bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-900/40 rounded-2xl p-2.5 text-center space-y-1">
            <span class="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
              Bersama
            </span>
            <div class="text-xs font-extrabold text-on-background font-tabular-number truncate">
              {{ formatRupiah(bersamaExpense) }}
            </div>
            <div class="text-[10px] text-muted">{{ bersamaPct }}% dari total</div>
          </div>
        </div>
      </div>

      <!-- 3. Kategori Pengeluaran Card with Progress Bars -->
      <div class="bg-white dark:bg-[#15171e] rounded-3xl p-4 shadow-sm border border-surface-variant/40 dark:border-[#282b37] space-y-3.5">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-primary text-[18px]">bar_chart</span>
            <h3 class="text-xs font-bold text-on-background">
              Kategori Pengeluaran ({{ periodDateRange.periodTitle }})
            </h3>
          </div>
          <span class="text-[10px] font-medium text-muted">{{ categories.length }} Kategori</span>
        </div>

        <div v-if="categories.length === 0" class="text-center py-6 text-muted text-xs">
          Belum ada catatan pengeluaran di periode ini.
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="(cat, idx) in categories"
            :key="cat.name"
            class="space-y-1.5"
          >
            <div class="flex items-center justify-between text-xs">
              <div class="flex items-center gap-2 min-w-0 mr-2">
                <span
                  class="w-2 h-2 rounded-full shrink-0"
                  :style="{ backgroundColor: categoryDotColors[idx % categoryDotColors.length] }"
                ></span>
                <span class="font-bold text-on-background truncate">{{ cat.name }}</span>
                <span class="text-[10px] text-muted shrink-0">({{ categoryUsageCounts[cat.name] || 1 }}x)</span>
              </div>
              <div class="text-right shrink-0">
                <span class="font-bold text-on-background font-tabular-number mr-1.5">{{ cat.amountText }}</span>
                <span class="text-[10px] text-muted font-medium">{{ cat.pct }}%</span>
              </div>
            </div>

            <!-- Progress Bar -->
            <div class="w-full h-1.5 rounded-full bg-surface-container dark:bg-slate-800 overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-500"
                :style="{
                  width: `${Math.max(cat.pct, 2)}%`,
                  backgroundColor: categoryDotColors[idx % categoryDotColors.length]
                }"
              ></div>
            </div>
          </div>
        </div>

        <!-- Bottom Link to Trends -->
        <button
          type="button"
          class="w-full pt-2 flex items-center justify-center gap-1.5 text-xs font-bold text-blue-500 hover:text-blue-600 transition cursor-pointer"
          @click="currentView = 'trends'"
        >
          <span>Lihat Analisis Tren &amp; Grafik Lengkap</span>
          <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
        </button>
      </div>

    </div>

    <!-- ============================================== -->
    <!-- VIEW 2: TREN & KATEGORI (REACT NATIVE UI)      -->
    <!-- ============================================== -->
    <div v-else class="space-y-3.5">
      
      <!-- 1. Hero Card "ARUS KAS" -->
      <div class="bg-gradient-to-br from-[#1b1e2a] to-[#12141c] rounded-3xl p-5 border border-slate-800 shadow-sm space-y-2.5 relative overflow-hidden text-white">
        <!-- Top row: Period & Local Verified Badge -->
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            ARUS KAS • {{ activeMonthName.toUpperCase() }} {{ currentYear }}
          </span>
        </div>

        <!-- Surplus / Defisit Bersih -->
        <div>
          <span class="text-xs text-slate-400 block mb-0.5">Surplus / Defisit Bersih</span>
          <div
            class="text-2xl sm:text-3xl font-extrabold tracking-tight font-tabular-number"
            :class="netCashflow >= 0 ? 'text-emerald-400' : 'text-[#f43f5e]'"
          >
            {{ netCashflow >= 0 ? '+' : '-' }}{{ formatRupiah(Math.abs(netCashflow)) }}
          </div>
        </div>

        <!-- Bottom 2 Stats: Total Pemasukan & Total Pengeluaran -->
        <div class="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0">
              <span class="material-symbols-outlined text-[17px]">trending_up</span>
            </div>
            <div>
              <span class="text-[10px] text-slate-400 block leading-tight">Total Pemasukan</span>
              <span class="text-xs font-bold text-white font-tabular-number">{{ formatRupiah(totalIncome) }}</span>
            </div>
          </div>

          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0">
              <span class="material-symbols-outlined text-[17px]">trending_down</span>
            </div>
            <div>
              <span class="text-[10px] text-slate-400 block leading-tight">Total Pengeluaran</span>
              <span class="text-xs font-bold text-white font-tabular-number">{{ formatRupiah(totalExpense) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. Porsi Belanja Keluarga Card -->
      <div class="bg-white dark:bg-[#15171e] rounded-3xl p-4 shadow-sm border border-surface-variant/40 dark:border-[#282b37] space-y-3">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-primary text-[18px]">group</span>
          <h3 class="text-xs font-bold text-on-background">Porsi Belanja Keluarga</h3>
        </div>

        <div class="grid grid-cols-3 gap-2">
          <!-- Suami -->
          <div class="bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 rounded-2xl p-2.5 text-center space-y-1">
            <span class="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
              Suami
            </span>
            <div class="text-xs font-extrabold text-on-background font-tabular-number truncate">
              {{ formatRupiah(suamiExpense) }}
            </div>
            <div class="text-[10px] text-muted">{{ suamiPct }}% dari total</div>
          </div>

          <!-- Istri -->
          <div class="bg-pink-50/40 dark:bg-pink-950/20 border border-pink-200/80 dark:border-pink-900/40 rounded-2xl p-2.5 text-center space-y-1">
            <span class="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300">
              Istri
            </span>
            <div class="text-xs font-extrabold text-on-background font-tabular-number truncate">
              {{ formatRupiah(istriExpense) }}
            </div>
            <div class="text-[10px] text-muted">{{ istriPct }}% dari total</div>
          </div>

          <!-- Bersama -->
          <div class="bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-900/40 rounded-2xl p-2.5 text-center space-y-1">
            <span class="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
              Bersama
            </span>
            <div class="text-xs font-extrabold text-on-background font-tabular-number truncate">
              {{ formatRupiah(bersamaExpense) }}
            </div>
            <div class="text-[10px] text-muted">{{ bersamaPct }}% dari total</div>
          </div>
        </div>
      </div>

      <!-- 3. Breakdown Pengeluaran per Kategori Card -->
      <div class="bg-white dark:bg-[#15171e] rounded-3xl p-4 shadow-sm border border-surface-variant/40 dark:border-[#282b37] space-y-3.5">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-primary text-[18px]">insights</span>
            <h3 class="text-xs font-bold text-on-background">Breakdown Pengeluaran per Kategori</h3>
          </div>
          <span class="text-[10px] font-medium text-muted">{{ categories.length }} Kategori</span>
        </div>

        <div v-if="categories.length === 0" class="text-center py-6 text-muted text-xs">
          Belum ada catatan pengeluaran di periode ini.
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="(cat, idx) in categories"
            :key="cat.name"
            class="space-y-1.5"
          >
            <div class="flex items-center justify-between text-xs">
              <div class="flex items-center gap-2 min-w-0 mr-2">
                <span
                  class="w-2 h-2 rounded-full shrink-0"
                  :style="{ backgroundColor: categoryDotColors[idx % categoryDotColors.length] }"
                ></span>
                <span class="font-bold text-on-background truncate">{{ cat.name }}</span>
                <span class="text-[10px] text-muted shrink-0">({{ categoryUsageCounts[cat.name] || 1 }}x)</span>
              </div>
              <div class="text-right shrink-0">
                <span class="font-bold text-on-background font-tabular-number mr-1.5">{{ cat.amountText }}</span>
                <span class="text-[10px] text-muted font-medium">{{ cat.pct }}%</span>
              </div>
            </div>

            <!-- Progress Bar -->
            <div class="w-full h-1.5 rounded-full bg-surface-container dark:bg-slate-800 overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-500"
                :style="{
                  width: `${Math.max(cat.pct, 2)}%`,
                  backgroundColor: categoryDotColors[idx % categoryDotColors.length]
                }"
              ></div>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- MODAL: Bayar Tagihan (jika ada tagihan dikonfirmasi) -->
    <div
      v-if="isPayBillModalOpen && activePayBill"
      class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <div class="w-full max-w-md bg-white dark:bg-[#15171e] rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4 border border-surface-variant/40 dark:border-[#282b37] animate-slide-up">
        <div class="flex items-center justify-between pb-2 border-b border-surface-variant/30 dark:border-[#282b37]">
          <h3 class="text-sm font-bold text-on-background">Bayar &amp; Catat Tagihan</h3>
          <button
            type="button"
            class="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-muted hover:text-on-surface cursor-pointer"
            @click="isPayBillModalOpen = false"
          >
            <span class="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>

        <div class="p-3.5 bg-surface-container-low dark:bg-[#1e2029] rounded-2xl border border-surface-variant/30 dark:border-[#282b37] space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs text-muted font-medium">Nama Tagihan</span>
            <span class="text-xs font-bold text-on-background">{{ activePayBill.name }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-xs text-muted font-medium">Jatuh Tempo</span>
            <span class="text-xs font-semibold text-on-background">{{ activePayBill.dueDate }}</span>
          </div>
          <div class="flex items-center justify-between pt-2 border-t border-surface-variant/20 dark:border-[#282b37]">
            <span class="text-xs font-bold text-on-background">Nominal Pembayaran</span>
            <span class="text-base font-extrabold text-primary dark:text-primary-fixed tabular-nums">{{ activePayBill.amountText }}</span>
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold text-on-background">Pilih Pos Akun Sumber Pembayaran</label>
          <select
            v-model="selectedPayAccountId"
            class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low dark:bg-[#1e2029] border border-surface-variant/60 dark:border-[#282b37] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer text-on-background"
          >
            <option
              v-for="acc in selectableAccountsForBill"
              :key="acc.id"
              :value="acc.id"
            >
              {{ acc.name }} ({{ acc.ownerLabel }}) — Saldo: {{ acc.balanceText }}
            </option>
          </select>
        </div>

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
            <span>{{ isSubmittingPayBill ? 'Memproses...' : 'Konfirmasi Pembayaran' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Modal Ekspor Data Finansial -->
    <ExportDataModal
      v-model:open="showExportModal"
      :default-month="`${currentYear}-${String(currentMonth).padStart(2, '0')}`"
    />
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
