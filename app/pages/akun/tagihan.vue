<script setup lang="ts">
definePageMeta({ layout: 'app' })
useHead({ title: 'Kelola Tagihan — CoupleCash' })

const router = useRouter()
const { getAuthToken, currentUser, currentHousehold } = useAuth()
const hideBottomNav = useState('hideBottomNav', () => false)

interface Bill {
  id: string
  name: string
  amount: number
  amountText: string
  dueDate: string
  daysRemaining: number
  isOverdue: boolean
  isDueToday: boolean
  isUrgent: boolean
  urgencyLevel: 'overdue' | 'today' | 'urgent' | 'upcoming' | 'paid'
  badgeText: string
  ownerType: 'bersama' | 'suami' | 'istri' | 'sendiri'
  ownerLabel: string
  status: 'pending' | 'lunas' | 'dibatalkan'
  isRecurring: boolean
  recurrenceRule: string | null
  reminderDaysBefore: number
  linkedTransactionId: string | null
  icon?: string | null
}

const bills = ref<Bill[]>([])
const summary = ref({
  totalUnpaid: 0,
  totalUnpaidText: 'Rp 0',
  urgentCount: 0,
  overdueCount: 0,
  pendingCount: 0,
  paidCount: 0
})
const isLoading = ref(true)
const activeTab = ref<'all' | 'pending' | 'paid'>('all')
const searchQuery = ref('')

// Accounts for paying bills
const activeAssetAccounts = ref<any[]>([])

// Modal States
const isCreateModalOpen = ref(false)
const isEditModalOpen = ref(false)
const isPayModalOpen = ref(false)
const isDeleteModalOpen = ref(false)
const activeDropdownBillId = ref<string | null>(null)

const activeBill = ref<Bill | null>(null)
const selectedPayAccountId = ref('')
const isSubmitting = ref(false)
const modalError = ref('')

// Available icons
const availableBillIcons = [
  { id: 'bolt', label: 'Listrik' },
  { id: 'water_drop', label: 'Air' },
  { id: 'wifi', label: 'Internet' },
  { id: 'health_and_safety', label: 'BPJS' },
  { id: 'subscriptions', label: 'Streaming' },
  { id: 'home_work', label: 'Sewa' },
  { id: 'credit_card', label: 'K. Kredit' },
  { id: 'smartphone', label: 'Pulsa' },
  { id: 'receipt_long', label: 'Tagihan' },
  { id: 'directions_car', label: 'Kendaraan' },
]

// Form State for new bill
const newBillForm = ref({
  name: '',
  amount: null as number | null,
  dueDate: '',
  ownerType: 'bersama' as 'bersama' | 'suami' | 'istri' | 'sendiri',
  reminderDaysBefore: 3,
  isRecurring: true,
  icon: 'receipt_long',
})

// Form State for edit bill
const editBillForm = ref({
  id: '',
  name: '',
  amount: null as number | null,
  dueDate: '',
  ownerType: 'bersama' as 'bersama' | 'suami' | 'istri' | 'sendiri',
  reminderDaysBefore: 3,
  isRecurring: true,
  icon: 'receipt_long',
})

// Toast
const toastMessage = ref('')
let toastTimer: any = null
function showToast(msg: string) {
  toastMessage.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastMessage.value = ''
  }, 4000)
}

watch([isCreateModalOpen, isEditModalOpen, isPayModalOpen, isDeleteModalOpen], ([c, e, p, d]) => {
  hideBottomNav.value = c || e || p || d
})

onUnmounted(() => {
  hideBottomNav.value = false
})

const suamiName = computed(() => currentHousehold.value?.suami?.firstName || 'Suami')
const istriName = computed(() => currentHousehold.value?.istri?.firstName || 'Istri')

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

async function fetchBills() {
  isLoading.value = true
  try {
    const token = await getAuthToken()
    const res: any = await $fetch('/api/bills', {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    if (res?.success) {
      bills.value = res.data || []
      summary.value = res.summary || {
        totalUnpaid: 0,
        totalUnpaidText: 'Rp 0',
        urgentCount: 0,
        overdueCount: 0,
        pendingCount: 0,
        paidCount: 0
      }
    }
  } catch (err) {
    console.error('Failed to fetch bills:', err)
  } finally {
    isLoading.value = false
  }
}

async function fetchAccounts() {
  try {
    const token = await getAuthToken()
    const res: any = await $fetch('/api/dashboard', {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    activeAssetAccounts.value = res.activeAssetAccounts || []
  } catch (err) {
    console.warn('Failed to load asset accounts:', err)
  }
}

onMounted(() => {
  fetchBills()
  fetchAccounts()
})

const filteredBills = computed(() => {
  return bills.value.filter(b => {
    const matchesTab = activeTab.value === 'all'
      ? true
      : activeTab.value === 'pending'
        ? b.status === 'pending'
        : b.status === 'lunas'
    const q = searchQuery.value.trim().toLowerCase()
    const matchesSearch = !q || b.name.toLowerCase().includes(q)
    return matchesTab && matchesSearch
  })
})

const selectableAccounts = computed(() => {
  const role = currentUser.value?.role
  return activeAssetAccounts.value.filter(a => {
    if (!role) return true
    if (role === 'suami') return a.ownerType === 'suami' || a.ownerType === 'bersama'
    if (role === 'istri') return a.ownerType === 'istri' || a.ownerType === 'bersama'
    if (role === 'single') return a.ownerType === 'sendiri' || a.ownerType === 'bersama'
    return true
  })
})

const selectedPayAccount = computed(() => {
  return activeAssetAccounts.value.find(a => a.id === selectedPayAccountId.value)
})

// Auto suggest icon on name input
watch(() => newBillForm.value.name, (newVal) => {
  if (newVal) {
    const suggested = getBillIcon(newVal)
    if (suggested !== 'receipt_long') {
      newBillForm.value.icon = suggested
    }
  }
})

function toggleDropdown(billId: string) {
  activeDropdownBillId.value = activeDropdownBillId.value === billId ? null : billId
}

function openCreateModal() {
  const targetDate = new Date()
  targetDate.setDate(targetDate.getDate() + 3)
  const y = targetDate.getFullYear()
  const m = String(targetDate.getMonth() + 1).padStart(2, '0')
  const d = String(targetDate.getDate()).padStart(2, '0')
  const isSingle = currentUser.value?.role === 'single'
  newBillForm.value = {
    name: '',
    amount: null,
    dueDate: `${y}-${m}-${d}`,
    ownerType: isSingle ? 'sendiri' : 'bersama',
    reminderDaysBefore: 3,
    isRecurring: true,
    icon: 'receipt_long'
  }
  modalError.value = ''
  isCreateModalOpen.value = true
}

async function handleCreateBill() {
  if (!newBillForm.value.name || !newBillForm.value.amount || !newBillForm.value.dueDate) {
    modalError.value = 'Nama, nominal, dan tanggal jatuh tempo wajib diisi'
    return
  }
  isSubmitting.value = true
  modalError.value = ''
  try {
    const token = await getAuthToken()
    const res: any = await $fetch('/api/bills', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: {
        name: newBillForm.value.name,
        amount: newBillForm.value.amount,
        dueDate: newBillForm.value.dueDate,
        ownerType: newBillForm.value.ownerType,
        reminderDaysBefore: newBillForm.value.reminderDaysBefore,
        isRecurring: newBillForm.value.isRecurring,
        icon: newBillForm.value.icon || getBillIcon(newBillForm.value.name)
      }
    })
    if (res?.success) {
      isCreateModalOpen.value = false
      showToast(`Tagihan "${newBillForm.value.name}" berhasil ditambahkan!`)
      await fetchBills()
    }
  } catch (err: any) {
    modalError.value = err?.data?.statusMessage || err?.message || 'Gagal menambahkan tagihan'
  } finally {
    isSubmitting.value = false
  }
}

function openEditModal(bill: Bill) {
  activeDropdownBillId.value = null
  activeBill.value = bill
  editBillForm.value = {
    id: bill.id,
    name: bill.name,
    amount: bill.amount,
    dueDate: bill.dueDate,
    ownerType: bill.ownerType,
    reminderDaysBefore: bill.reminderDaysBefore || 3,
    isRecurring: bill.isRecurring,
    icon: bill.icon || getBillIcon(bill.name)
  }
  modalError.value = ''
  isEditModalOpen.value = true
}

async function handleEditBill() {
  if (!editBillForm.value.name || !editBillForm.value.amount || !editBillForm.value.dueDate) {
    modalError.value = 'Nama, nominal, dan tanggal jatuh tempo wajib diisi'
    return
  }
  isSubmitting.value = true
  modalError.value = ''
  try {
    const token = await getAuthToken()
    const res: any = await $fetch(`/api/bills/${editBillForm.value.id}`, {
      method: 'PUT',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: {
        name: editBillForm.value.name,
        amount: editBillForm.value.amount,
        dueDate: editBillForm.value.dueDate,
        ownerType: editBillForm.value.ownerType,
        reminderDaysBefore: editBillForm.value.reminderDaysBefore,
        isRecurring: editBillForm.value.isRecurring,
        icon: editBillForm.value.icon
      }
    })
    if (res?.success) {
      isEditModalOpen.value = false
      showToast(`Tagihan "${editBillForm.value.name}" berhasil diperbarui!`)
      await fetchBills()
    }
  } catch (err: any) {
    modalError.value = err?.data?.statusMessage || err?.message || 'Gagal memperbarui tagihan'
  } finally {
    isSubmitting.value = false
  }
}

async function quickMarkAsPaid(bill: Bill) {
  activeDropdownBillId.value = null
  try {
    const token = await getAuthToken()
    const res: any = await $fetch(`/api/bills/${bill.id}`, {
      method: 'PUT',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: { status: 'lunas' }
    })
    if (res?.success) {
      showToast(`Tagihan "${bill.name}" ditandai lunas`)
      await fetchBills()
    }
  } catch (err: any) {
    showToast(err?.data?.statusMessage || err?.message || 'Gagal mengubah status tagihan')
  }
}

async function quickMarkAsPending(bill: Bill) {
  activeDropdownBillId.value = null
  try {
    const token = await getAuthToken()
    const res: any = await $fetch(`/api/bills/${bill.id}`, {
      method: 'PUT',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: { status: 'pending' }
    })
    if (res?.success) {
      showToast(`Status tagihan "${bill.name}" dikembalikan ke belum bayar`)
      await fetchBills()
    }
  } catch (err: any) {
    showToast(err?.data?.statusMessage || err?.message || 'Gagal mengubah status tagihan')
  }
}

function openPayModal(bill: Bill) {
  activeBill.value = bill
  modalError.value = ''
  const matchingAcc = selectableAccounts.value.find(a => a.balance >= bill.amount)
  selectedPayAccountId.value = matchingAcc?.id || selectableAccounts.value[0]?.id || ''
  isPayModalOpen.value = true
}

async function handlePayBill() {
  if (!activeBill.value || !selectedPayAccountId.value) return
  isSubmitting.value = true
  modalError.value = ''
  try {
    const token = await getAuthToken()
    const res: any = await $fetch('/api/bills/pay', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: {
        billId: activeBill.value.id,
        sourceAccountId: selectedPayAccountId.value
      }
    })
    if (res?.success) {
      isPayModalOpen.value = false
      showToast(`Tagihan "${activeBill.value.name}" berhasil dibayar & dicatat! 🎉`)
      await Promise.all([fetchBills(), fetchAccounts()])
    }
  } catch (err: any) {
    modalError.value = err?.data?.statusMessage || err?.message || 'Gagal memproses pembayaran tagihan'
  } finally {
    isSubmitting.value = false
  }
}

function openDeleteModal(bill: Bill) {
  activeBill.value = bill
  modalError.value = ''
  isDeleteModalOpen.value = true
}

async function handleDeleteBill() {
  if (!activeBill.value) return
  isSubmitting.value = true
  modalError.value = ''
  try {
    const token = await getAuthToken()
    await $fetch(`/api/bills/${activeBill.value.id}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    isDeleteModalOpen.value = false
    showToast(`Tagihan "${activeBill.value.name}" berhasil dihapus`)
    await fetchBills()
  } catch (err: any) {
    modalError.value = err?.data?.statusMessage || err?.message || 'Gagal menghapus tagihan'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="tagihan-page animate-fade-in px-page">
    <!-- Top Header Navigation -->
    <div class="header-row">
      <NuxtLink to="/akun" class="back-btn" aria-label="Kembali ke Akun">
        <span class="material-symbols-outlined">arrow_back</span>
      </NuxtLink>
      <div class="header-info">
        <h1 class="page-title">Kelola Tagihan &amp; Langganan</h1>
        <p class="page-subtitle">Jadwal pengingat &amp; pencatatan bayar tagihan rutin</p>
      </div>
      <button
        type="button"
        class="add-header-btn"
        @click="openCreateModal"
        aria-label="Tambah Tagihan Baru"
      >
        <span class="material-symbols-outlined text-[18px]">add</span>
        <span>Tambah</span>
      </button>
    </div>

    <!-- Toast Notification -->
    <div v-if="toastMessage" class="toast-card animate-fade-in">
      <span class="material-symbols-outlined text-[18px] text-primary">check_circle</span>
      <span>{{ toastMessage }}</span>
    </div>

    <!-- Metric Cards -->
    <div class="metric-cards-grid">
      <!-- 1. Total Unpaid -->
      <div class="metric-card bg-surface-container-lowest border border-outline-variant/30">
        <div class="flex items-center gap-1.5 text-muted text-[11px] font-semibold mb-1">
          <span class="material-symbols-outlined text-primary text-[16px]">receipt_long</span>
          <span>Total Belum Bayar</span>
        </div>
        <div class="font-extrabold text-base text-on-surface tabular-nums">
          {{ summary.totalUnpaidText }}
        </div>
        <span class="text-[10px] text-muted">{{ summary.pendingCount }} tagihan aktif</span>
      </div>

      <!-- 2. Urgent / Overdue -->
      <div
        class="metric-card border"
        :class="summary.overdueCount > 0 ? 'bg-rose-50/50 border-rose-200' : summary.urgentCount > 0 ? 'bg-amber-50/50 border-amber-200' : 'bg-surface-container-lowest border-outline-variant/30'"
      >
        <div class="flex items-center gap-1.5 text-[11px] font-semibold mb-1" :class="summary.overdueCount > 0 ? 'text-rose-700' : 'text-amber-700'">
          <span class="material-symbols-outlined text-[16px]">notification_important</span>
          <span>Perlu Bayar (H-3)</span>
        </div>
        <div class="font-extrabold text-base tabular-nums" :class="summary.overdueCount > 0 ? 'text-rose-700' : 'text-amber-800'">
          {{ summary.urgentCount + summary.overdueCount }} Tagihan
        </div>
        <span class="text-[10px] text-muted">Mendekati jatuh tempo</span>
      </div>

      <!-- 3. Lunas -->
      <div class="metric-card bg-surface-container-lowest border border-outline-variant/30">
        <div class="flex items-center gap-1.5 text-emerald-700 text-[11px] font-semibold mb-1">
          <span class="material-symbols-outlined text-[16px]">verified</span>
          <span>Sudah Lunas</span>
        </div>
        <div class="font-extrabold text-base text-emerald-700 tabular-nums">
          {{ summary.paidCount }} Tagihan
        </div>
        <span class="text-[10px] text-muted">Tercatat di pengeluaran</span>
      </div>
    </div>

    <!-- Filter Tabs & Search -->
    <div class="filter-search-row">
      <!-- Segmented Tabs -->
      <div class="segmented-pill">
        <button
          type="button"
          class="pill-item"
          :class="{ 'pill-item--active': activeTab === 'all' }"
          @click="activeTab = 'all'"
        >
          Semua ({{ bills.length }})
        </button>
        <button
          type="button"
          class="pill-item"
          :class="{ 'pill-item--active': activeTab === 'pending' }"
          @click="activeTab = 'pending'"
        >
          Belum Bayar ({{ summary.pendingCount }})
        </button>
        <button
          type="button"
          class="pill-item"
          :class="{ 'pill-item--active': activeTab === 'paid' }"
          @click="activeTab = 'paid'"
        >
          Lunas ({{ summary.paidCount }})
        </button>
      </div>

      <!-- Search Input -->
      <div class="search-input-wrap">
        <span class="material-symbols-outlined search-icon">search</span>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari nama tagihan..."
          class="search-input"
        />
        <button
          v-if="searchQuery"
          type="button"
          class="clear-search"
          @click="searchQuery = ''"
        >
          <span class="material-symbols-outlined text-[16px]">close</span>
        </button>
      </div>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="isLoading" class="loading-state">
      <div class="skeleton-card animate-pulse"></div>
      <div class="skeleton-card animate-pulse"></div>
      <div class="skeleton-card animate-pulse"></div>
    </div>

    <!-- Bill Items List -->
    <div v-else-if="filteredBills.length > 0" class="bills-list relative">
      <!-- Backdrop to close dropdown -->
      <div
        v-if="activeDropdownBillId"
        class="fixed inset-0 z-20 bg-transparent"
        @click="activeDropdownBillId = null"
      ></div>

      <div
        v-for="bill in filteredBills"
        :key="bill.id"
        class="bill-card"
        :class="[
          bill.status === 'lunas'
            ? 'bill-card--paid'
            : bill.isOverdue
              ? 'bill-card--overdue'
              : bill.isUrgent
                ? 'bill-card--urgent'
                : 'bill-card--default'
        ]"
      >
        <!-- Card Left: Icon + Info -->
        <div class="bill-info-wrap">
          <div class="bill-icon-box" :class="`bill-icon-box--${bill.status}`">
            <span class="material-symbols-outlined text-[22px]">{{ bill.icon || getBillIcon(bill.name) }}</span>
            <div
              class="owner-tag"
              :class="bill.ownerType === 'suami' ? 'owner-tag--suami' : bill.ownerType === 'istri' ? 'owner-tag--istri' : bill.ownerType === 'sendiri' ? 'owner-tag--sendiri' : 'owner-tag--bersama'"
            >
              {{ bill.ownerType === 'suami' ? 'S' : bill.ownerType === 'istri' ? 'I' : bill.ownerType === 'sendiri' ? 'S' : 'B' }}
            </div>
          </div>

          <div class="bill-texts">
            <div class="flex items-center gap-1.5 flex-wrap">
              <h3 class="bill-name">{{ bill.name }}</h3>
              <span
                class="badge-urgency"
                :class="`badge-urgency--${bill.urgencyLevel}`"
              >
                {{ bill.badgeText }}
              </span>
            </div>
            <div class="bill-meta-row">
              <span class="meta-due">Jatuh tempo: {{ bill.dueDate }}</span>
              <span class="meta-dot">•</span>
              <span class="meta-owner">{{ bill.ownerLabel }}</span>
              <span v-if="bill.isRecurring" class="meta-recurring">Bulanan</span>
            </div>
          </div>
        </div>

        <!-- Card Right: Top-right Actions (Bayar & Catat + 3-Dot) & Amount -->
        <div class="bill-action-wrap">
          <div class="flex items-center gap-1.5 relative">
            <!-- Bayar & Catat Button (Pojok kanan atas sejajar titik tiga) -->
            <button
              v-if="bill.status === 'pending'"
              type="button"
              class="btn-pay-action"
              @click="openPayModal(bill)"
            >
              <span class="material-symbols-outlined text-[14px]">payments</span>
              <span>Bayar &amp; Catat</span>
            </button>

            <!-- Status Lunas Indicator -->
            <div v-else class="paid-indicator">
              <span class="material-symbols-outlined text-[15px]">check_circle</span>
              <span>Terbayar</span>
            </div>

            <!-- Tombol Titik Tiga (Menu Opsi) -->
            <div class="relative">
              <button
                type="button"
                class="btn-more-dots"
                :class="{ 'btn-more-dots--active': activeDropdownBillId === bill.id }"
                @click.stop="toggleDropdown(bill.id)"
                aria-label="Menu Opsi Tagihan"
              >
                <span class="material-symbols-outlined text-[20px]">more_vert</span>
              </button>

              <!-- Dropdown Menu -->
              <div
                v-if="activeDropdownBillId === bill.id"
                class="bill-dropdown-menu animate-fade-in"
                @click.stop
              >
                <button
                  type="button"
                  class="dropdown-item"
                  @click="openEditModal(bill)"
                >
                  <span class="material-symbols-outlined text-[16px] text-primary">edit</span>
                  <span>Edit Tagihan</span>
                </button>

                <button
                  v-if="bill.status === 'pending'"
                  type="button"
                  class="dropdown-item"
                  @click="quickMarkAsPaid(bill)"
                >
                  <span class="material-symbols-outlined text-[16px] text-emerald-600">task_alt</span>
                  <span>Tandai Sudah Dibayar</span>
                </button>

                <button
                  v-else
                  type="button"
                  class="dropdown-item"
                  @click="quickMarkAsPending(bill)"
                >
                  <span class="material-symbols-outlined text-[16px] text-amber-600">undo</span>
                  <span>Tandai Belum Dibayar</span>
                </button>

                <div class="dropdown-divider"></div>

                <button
                  type="button"
                  class="dropdown-item dropdown-item--danger"
                  @click="activeDropdownBillId = null; openDeleteModal(bill)"
                >
                  <span class="material-symbols-outlined text-[16px] text-rose-600">delete</span>
                  <span>Hapus Tagihan</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Nominal Tagihan -->
          <div class="bill-amount tabular-nums">
            {{ bill.amountText }}
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <div class="empty-icon-wrap">
        <span class="material-symbols-outlined text-[32px]">receipt_long</span>
      </div>
      <h3 class="text-sm font-bold text-on-surface">Tidak ada tagihan ditemukan</h3>
      <p class="text-xs text-muted max-w-[280px] mt-1">
        {{ searchQuery ? 'Tidak ada tagihan yang cocok dengan kata kunci pencarian.' : 'Daftarkan tagihan rutin Anda agar tidak terlewat jatuh tempo.' }}
      </p>
      <button
        type="button"
        class="mt-3 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
        @click="openCreateModal"
      >
        <span class="material-symbols-outlined text-[16px]">add</span> Tambah Tagihan Baru
      </button>
    </div>

    <!-- MODAL: Tambah Tagihan Baru -->
    <div
      v-if="isCreateModalOpen"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 transition-opacity duration-300 animate-fade-in"
      @click.self="isCreateModalOpen = false"
    >
      <div class="modal-card">
        <div class="modal-header">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <span class="material-symbols-outlined text-[20px]">add_circle</span>
            </div>
            <div>
              <h3 class="text-sm font-bold text-on-surface">Tambah Tagihan Baru</h3>
              <p class="text-[11px] text-muted">Jadwalkan tagihan &amp; langganan rutin</p>
            </div>
          </div>
          <button
            type="button"
            class="modal-close-btn"
            @click="isCreateModalOpen = false"
          >
            <span class="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>

        <form @submit.prevent="handleCreateBill" class="flex flex-col gap-3">
          <!-- Nama Tagihan -->
          <div class="flex flex-col gap-1">
            <label class="text-xs font-bold text-on-surface">Nama Tagihan / Langganan</label>
            <input
              v-model="newBillForm.name"
              type="text"
              placeholder="Contoh: Listrik PLN, BPJS, Indihome, Netflix"
              required
              class="form-input"
            />
          </div>

          <!-- Nominal -->
          <div class="flex flex-col gap-1">
            <label class="text-xs font-bold text-on-surface">Nominal Tagihan (Rp)</label>
            <input
              v-model.number="newBillForm.amount"
              type="number"
              placeholder="Contoh: 450000"
              required
              min="1"
              class="form-input tabular-nums"
            />
          </div>

          <!-- Tanggal Jatuh Tempo -->
          <div class="flex flex-col gap-1">
            <label class="text-xs font-bold text-on-surface">Tanggal Jatuh Tempo</label>
            <input
              v-model="newBillForm.dueDate"
              type="date"
              required
              class="form-input cursor-pointer"
            />
          </div>

          <!-- Pilihan Ikon Tagihan -->
          <div class="flex flex-col gap-1">
            <label class="text-xs font-bold text-on-surface">Pilih Ikon Tagihan</label>
            <div class="grid grid-cols-5 gap-1.5">
              <button
                v-for="ic in availableBillIcons"
                :key="ic.id"
                type="button"
                class="icon-picker-btn"
                :class="{ 'icon-picker-btn--active': newBillForm.icon === ic.id }"
                @click="newBillForm.icon = ic.id"
                :title="ic.label"
              >
                <span class="material-symbols-outlined text-[18px]">{{ ic.id }}</span>
                <span class="text-[9px] font-semibold truncate">{{ ic.label }}</span>
              </button>
            </div>
          </div>

          <!-- Kepemilikan Tagihan -->
          <div class="flex flex-col gap-1">
            <label class="text-xs font-bold text-on-surface">Kepemilikan</label>
            <div v-if="currentUser?.role === 'single'" class="grid grid-cols-1">
              <button
                type="button"
                class="owner-toggle-btn owner-toggle-btn--active-sendiri"
                @click="newBillForm.ownerType = 'sendiri'"
              >
                <span>Sendiri</span>
              </button>
            </div>
            <div v-else class="grid grid-cols-3 gap-2">
              <button
                type="button"
                class="owner-toggle-btn"
                :class="{ 'owner-toggle-btn--active': newBillForm.ownerType === 'bersama' }"
                @click="newBillForm.ownerType = 'bersama'"
              >
                <span>Bersama</span>
              </button>
              <button
                type="button"
                class="owner-toggle-btn"
                :class="{ 'owner-toggle-btn--active-suami': newBillForm.ownerType === 'suami' }"
                @click="newBillForm.ownerType = 'suami'"
              >
                <span>{{ suamiName }}</span>
              </button>
              <button
                type="button"
                class="owner-toggle-btn"
                :class="{ 'owner-toggle-btn--active-istri': newBillForm.ownerType === 'istri' }"
                @click="newBillForm.ownerType = 'istri'"
              >
                <span>{{ istriName }}</span>
              </button>
            </div>
          </div>

          <!-- Pengingat H- & Berulang -->
          <div class="grid grid-cols-2 gap-3 pt-1">
            <div class="flex flex-col gap-1">
              <label class="text-xs font-bold text-on-surface">Ingatkan (H-hari)</label>
              <select
                v-model.number="newBillForm.reminderDaysBefore"
                class="form-input cursor-pointer"
              >
                <option :value="1">H-1 Hari</option>
                <option :value="2">H-2 Hari</option>
                <option :value="3">H-3 Hari (Standar)</option>
                <option :value="5">H-5 Hari</option>
                <option :value="7">H-7 Hari (1 Minggu)</option>
              </select>
            </div>

            <div class="flex flex-col justify-end">
              <label class="flex items-center gap-2 p-2.5 bg-surface rounded-xl border border-outline-variant/30 cursor-pointer">
                <input type="checkbox" v-model="newBillForm.isRecurring" class="rounded text-primary focus:ring-primary cursor-pointer" />
                <span class="text-xs font-medium text-on-surface">Tagihan Bulanan</span>
              </label>
            </div>
          </div>

          <!-- Error Alert -->
          <div v-if="modalError" class="modal-error-box">
            <span class="material-symbols-outlined text-[16px] shrink-0">error</span>
            <span>{{ modalError }}</span>
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              class="btn-cancel"
              @click="isCreateModalOpen = false"
              :disabled="isSubmitting"
            >
              Batal
            </button>
            <button
              type="submit"
              class="btn-primary"
              :disabled="isSubmitting"
            >
              <span v-if="isSubmitting" class="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
              <span v-else class="material-symbols-outlined text-[16px]">save</span>
              <span>{{ isSubmitting ? 'Menyimpan...' : 'Simpan Tagihan' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL: Edit Tagihan -->
    <div
      v-if="isEditModalOpen"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 transition-opacity duration-300 animate-fade-in"
      @click.self="isEditModalOpen = false"
    >
      <div class="modal-card">
        <div class="modal-header">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <span class="material-symbols-outlined text-[20px]">edit</span>
            </div>
            <div>
              <h3 class="text-sm font-bold text-on-surface">Edit Tagihan</h3>
              <p class="text-[11px] text-muted">Perbarui data atau jadwal tagihan</p>
            </div>
          </div>
          <button
            type="button"
            class="modal-close-btn"
            @click="isEditModalOpen = false"
          >
            <span class="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>

        <form @submit.prevent="handleEditBill" class="flex flex-col gap-3">
          <!-- Nama Tagihan -->
          <div class="flex flex-col gap-1">
            <label class="text-xs font-bold text-on-surface">Nama Tagihan / Langganan</label>
            <input
              v-model="editBillForm.name"
              type="text"
              placeholder="Contoh: Listrik PLN, BPJS, Indihome, Netflix"
              required
              class="form-input"
            />
          </div>

          <!-- Nominal -->
          <div class="flex flex-col gap-1">
            <label class="text-xs font-bold text-on-surface">Nominal Tagihan (Rp)</label>
            <input
              v-model.number="editBillForm.amount"
              type="number"
              placeholder="Contoh: 450000"
              required
              min="1"
              class="form-input tabular-nums"
            />
          </div>

          <!-- Tanggal Jatuh Tempo -->
          <div class="flex flex-col gap-1">
            <label class="text-xs font-bold text-on-surface">Tanggal Jatuh Tempo</label>
            <input
              v-model="editBillForm.dueDate"
              type="date"
              required
              class="form-input cursor-pointer"
            />
          </div>

          <!-- Pilihan Ikon Tagihan -->
          <div class="flex flex-col gap-1">
            <label class="text-xs font-bold text-on-surface">Pilih Ikon Tagihan</label>
            <div class="grid grid-cols-5 gap-1.5">
              <button
                v-for="ic in availableBillIcons"
                :key="ic.id"
                type="button"
                class="icon-picker-btn"
                :class="{ 'icon-picker-btn--active': editBillForm.icon === ic.id }"
                @click="editBillForm.icon = ic.id"
                :title="ic.label"
              >
                <span class="material-symbols-outlined text-[18px]">{{ ic.id }}</span>
                <span class="text-[9px] font-semibold truncate">{{ ic.label }}</span>
              </button>
            </div>
          </div>

          <!-- Kepemilikan Tagihan -->
          <div class="flex flex-col gap-1">
            <label class="text-xs font-bold text-on-surface">Kepemilikan</label>
            <div v-if="currentUser?.role === 'single'" class="grid grid-cols-1">
              <button
                type="button"
                class="owner-toggle-btn owner-toggle-btn--active-sendiri"
                @click="editBillForm.ownerType = 'sendiri'"
              >
                <span>Sendiri</span>
              </button>
            </div>
            <div v-else class="grid grid-cols-3 gap-2">
              <button
                type="button"
                class="owner-toggle-btn"
                :class="{ 'owner-toggle-btn--active': editBillForm.ownerType === 'bersama' }"
                @click="editBillForm.ownerType = 'bersama'"
              >
                <span>Bersama</span>
              </button>
              <button
                type="button"
                class="owner-toggle-btn"
                :class="{ 'owner-toggle-btn--active-suami': editBillForm.ownerType === 'suami' }"
                @click="editBillForm.ownerType = 'suami'"
              >
                <span>{{ suamiName }}</span>
              </button>
              <button
                type="button"
                class="owner-toggle-btn"
                :class="{ 'owner-toggle-btn--active-istri': editBillForm.ownerType === 'istri' }"
                @click="editBillForm.ownerType = 'istri'"
              >
                <span>{{ istriName }}</span>
              </button>
            </div>
          </div>

          <!-- Pengingat H- & Berulang -->
          <div class="grid grid-cols-2 gap-3 pt-1">
            <div class="flex flex-col gap-1">
              <label class="text-xs font-bold text-on-surface">Ingatkan (H-hari)</label>
              <select
                v-model.number="editBillForm.reminderDaysBefore"
                class="form-input cursor-pointer"
              >
                <option :value="1">H-1 Hari</option>
                <option :value="2">H-2 Hari</option>
                <option :value="3">H-3 Hari (Standar)</option>
                <option :value="5">H-5 Hari</option>
                <option :value="7">H-7 Hari (1 Minggu)</option>
              </select>
            </div>

            <div class="flex flex-col justify-end">
              <label class="flex items-center gap-2 p-2.5 bg-surface rounded-xl border border-outline-variant/30 cursor-pointer">
                <input type="checkbox" v-model="editBillForm.isRecurring" class="rounded text-primary focus:ring-primary cursor-pointer" />
                <span class="text-xs font-medium text-on-surface">Tagihan Bulanan</span>
              </label>
            </div>
          </div>

          <!-- Error Alert -->
          <div v-if="modalError" class="modal-error-box">
            <span class="material-symbols-outlined text-[16px] shrink-0">error</span>
            <span>{{ modalError }}</span>
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              class="btn-cancel"
              @click="isEditModalOpen = false"
              :disabled="isSubmitting"
            >
              Batal
            </button>
            <button
              type="submit"
              class="btn-primary"
              :disabled="isSubmitting"
            >
              <span v-if="isSubmitting" class="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
              <span v-else class="material-symbols-outlined text-[16px]">save</span>
              <span>{{ isSubmitting ? 'Menyimpan...' : 'Perbarui Tagihan' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL: Bayar & Catat Tagihan -->
    <div
      v-if="isPayModalOpen && activeBill"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 transition-opacity duration-300 animate-fade-in"
      @click.self="isPayModalOpen = false"
    >
      <div class="modal-card">
        <div class="modal-header">
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
            class="modal-close-btn"
            @click="isPayModalOpen = false"
          >
            <span class="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>

        <!-- Detail Tagihan Box -->
        <div class="p-3.5 bg-surface rounded-2xl border border-outline-variant/20 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs text-muted font-medium">Nama Tagihan</span>
            <span class="text-xs font-bold text-on-surface">{{ activeBill.name }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-xs text-muted font-medium">Jatuh Tempo</span>
            <div class="flex items-center gap-1.5">
              <span class="text-xs font-semibold text-on-surface">{{ activeBill.dueDate }}</span>
              <span class="badge-urgency" :class="`badge-urgency--${activeBill.urgencyLevel}`">
                {{ activeBill.badgeText }}
              </span>
            </div>
          </div>
          <div class="flex items-center justify-between pt-2 border-t border-outline-variant/10">
            <span class="text-xs font-bold text-on-surface">Nominal Pembayaran</span>
            <span class="text-base font-extrabold text-primary tabular-nums">{{ activeBill.amountText }}</span>
          </div>
        </div>

        <!-- Pilihan Pos Akun Sumber -->
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold text-on-surface">Pilih Pos Akun Sumber Pembayaran</label>
          <select
            v-model="selectedPayAccountId"
            class="form-input font-medium cursor-pointer"
          >
            <option
              v-for="acc in selectableAccounts"
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
          v-if="selectedPayAccount && selectedPayAccount.balance < activeBill.amount"
          class="flex items-start gap-2 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs"
        >
          <span class="material-symbols-outlined text-[16px] shrink-0 mt-0.5">warning</span>
          <span>
            Saldo akun <strong class="font-bold">{{ selectedPayAccount.name }}</strong> ({{ selectedPayAccount.balanceText }}) tidak mencukupi untuk tagihan {{ activeBill.amountText }}. Saldo akan menjadi minus jika dilanjutkan.
          </span>
        </div>

        <!-- Error Alert -->
        <div v-if="modalError" class="modal-error-box">
          <span class="material-symbols-outlined text-[16px] shrink-0">error</span>
          <span>{{ modalError }}</span>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            class="btn-cancel"
            @click="isPayModalOpen = false"
            :disabled="isSubmitting"
          >
            Batal
          </button>
          <button
            type="button"
            class="btn-primary"
            @click="handlePayBill"
            :disabled="isSubmitting || !selectedPayAccountId"
          >
            <span v-if="isSubmitting" class="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
            <span v-else class="material-symbols-outlined text-[16px]">payments</span>
            <span>{{ isSubmitting ? 'Memproses...' : 'Konfirmasi & Catat Pengeluaran' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL: Hapus Tagihan -->
    <div
      v-if="isDeleteModalOpen && activeBill"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 transition-opacity duration-300 animate-fade-in"
      @click.self="isDeleteModalOpen = false"
    >
      <div class="modal-card max-w-sm">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-[22px]">delete_forever</span>
          </div>
          <div>
            <h3 class="text-sm font-bold text-on-surface">Hapus Tagihan?</h3>
            <p class="text-xs text-muted">Apakah Anda yakin ingin menghapus jadwal tagihan <strong>{{ activeBill.name }}</strong>?</p>
          </div>
        </div>

        <div v-if="modalError" class="modal-error-box mt-2">
          <span class="material-symbols-outlined text-[16px] shrink-0">error</span>
          <span>{{ modalError }}</span>
        </div>

        <div class="flex items-center justify-end gap-2 pt-3">
          <button
            type="button"
            class="btn-cancel"
            @click="isDeleteModalOpen = false"
            :disabled="isSubmitting"
          >
            Batal
          </button>
          <button
            type="button"
            class="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer"
            @click="handleDeleteBill"
            :disabled="isSubmitting"
          >
            <span v-if="isSubmitting" class="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
            <span v-else class="material-symbols-outlined text-[16px]">delete</span>
            <span>{{ isSubmitting ? 'Menghapus...' : 'Hapus' }}</span>
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.tagihan-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 8px;
  padding-bottom: 24px;
}

.px-page {
  padding-left: 16px;
  padding-right: 16px;
}

/* Header */
.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.back-btn {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: var(--surface-container-low);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--on-surface);
  text-decoration: none;
  transition: background 0.15s ease;
  flex-shrink: 0;
}
.back-btn:hover { background: var(--surface-variant); }

.header-info { flex: 1; min-width: 0; }
.page-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--on-surface);
  margin: 0;
  line-height: 1.25;
}
.page-subtitle {
  font-size: 11px;
  color: var(--muted);
  margin: 2px 0 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.add-header-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 12px;
  background: var(--primary);
  color: white;
  font-size: 12px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.25);
  flex-shrink: 0;
}
.add-header-btn:hover { opacity: 0.92; }
.add-header-btn:active { transform: scale(0.95); }

/* Toast */
.toast-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: #EEF2FF;
  border: 1px solid #C7D2FE;
  color: #3730A3;
  font-size: 12px;
  font-weight: 600;
  border-radius: 14px;
}

/* Metric Cards */
.metric-cards-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.metric-card {
  padding: 10px 12px;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
}

/* Filter & Search */
.filter-search-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.segmented-pill {
  display: flex;
  background: var(--surface-container-low);
  padding: 3px;
  border-radius: 12px;
  gap: 2px;
}

.pill-item {
  flex: 1;
  padding: 6px 0;
  text-align: center;
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
  border-radius: 10px;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
}

.pill-item--active {
  background: var(--surface-container-lowest);
  color: var(--primary);
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}

.search-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 12px;
  font-size: 18px;
  color: var(--muted);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 8px 36px;
  border-radius: 12px;
  background: var(--surface-container-lowest);
  border: 1px solid var(--outline-variant);
  font-size: 12px;
  color: var(--on-surface);
  outline: none;
  transition: border-color 0.15s ease;
}
.search-input:focus {
  border-color: var(--primary);
}

.clear-search {
  position: absolute;
  right: 10px;
  background: none;
  border: none;
  color: var(--muted);
  cursor: pointer;
}

/* Bill List */
.bills-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.bill-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-radius: 16px;
  background: var(--surface-container-lowest);
  border: 1px solid var(--outline-variant);
  transition: all 0.15s ease;
  gap: 10px;
}

.bill-card--paid {
  border-color: #A7F3D0;
  background: #F0FDF4;
}

.bill-card--overdue {
  border-color: #FECDD3;
  background: #FFF1F2;
}

.bill-card--urgent {
  border-color: #FDE68A;
  background: #FFFBEB;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.08);
}

.bill-info-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.bill-icon-box {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  flex-shrink: 0;
  background: #EEF2FF;
  color: #4F46E5;
}

.bill-icon-box--lunas {
  background: #ECFDF5;
  color: #059669;
}

.owner-tag {
  position: absolute;
  bottom: -4px;
  right: -4px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  font-weight: 800;
  color: white;
}
.owner-tag--suami { background: #3B82F6; }
.owner-tag--istri { background: #EC4899; }
.owner-tag--bersama { background: #6366F1; }
.owner-tag--sendiri { background: #6366F1; }

.bill-texts {
  min-width: 0;
}

.bill-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--on-surface);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.badge-urgency {
  font-size: 9px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 9999px;
  white-space: nowrap;
}
.badge-urgency--paid { background: #D1FAE5; color: #065F46; }
.badge-urgency--overdue { background: #FFE4E6; color: #9F1239; border: 1px solid #FDA4AF; }
.badge-urgency--today { background: #EF4444; color: white; animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
.badge-urgency--urgent { background: #FEF3C7; color: #92400E; border: 1px solid #FCD34D; }
.badge-urgency--upcoming { background: #F1F5F9; color: #475569; }

.bill-meta-row {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--muted);
  margin-top: 2px;
}

.meta-recurring {
  font-size: 9px;
  background: var(--surface-container);
  padding: 1px 5px;
  border-radius: 4px;
  font-weight: 600;
}

.bill-action-wrap {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  flex-shrink: 0;
}

.bill-amount {
  font-size: 13px;
  font-weight: 700;
  color: var(--on-surface);
}

.btn-pay-action {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border-radius: 10px;
  background: linear-gradient(135deg, #4F46E5, #6366F1);
  color: white;
  font-size: 11px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(79, 70, 229, 0.25);
  transition: all 0.15s ease;
}
.btn-pay-action:hover { opacity: 0.95; }
.btn-pay-action:active { transform: scale(0.95); }

.paid-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  color: #059669;
}

.btn-more-dots {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface-container-low);
  border: 1px solid var(--outline-variant);
  color: var(--on-surface-variant);
  cursor: pointer;
  transition: all 0.15s ease;
}
.btn-more-dots:hover, .btn-more-dots--active {
  background: var(--surface-container-high);
  color: var(--primary);
  border-color: var(--primary);
}

/* Bill Dropdown Menu */
.bill-dropdown-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  width: 190px;
  background: var(--surface-container-lowest);
  border: 1px solid var(--outline-variant);
  border-radius: 14px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  padding: 6px;
  z-index: 50;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  color: var(--on-surface);
  background: transparent;
  border: none;
  width: 100%;
  text-align: left;
  cursor: pointer;
  transition: background 0.12s ease;
}
.dropdown-item:hover {
  background: var(--surface-container-low);
}

.dropdown-item--danger {
  color: #DC2626;
}
.dropdown-item--danger:hover {
  background: #FEF2F2;
}

.dropdown-divider {
  height: 1px;
  background: var(--outline-variant);
  margin: 4px 0;
  opacity: 0.5;
}

/* Icon Picker */
.icon-picker-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 6px 2px;
  border-radius: 10px;
  background: var(--surface-container-low);
  border: 1.5px solid var(--outline-variant);
  color: var(--on-surface-variant);
  cursor: pointer;
  transition: all 0.15s ease;
}
.icon-picker-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
}
.icon-picker-btn--active {
  background: color-mix(in srgb, var(--primary) 12%, transparent);
  border-color: var(--primary);
  color: var(--primary);
  font-weight: 700;
}

.btn-delete {
  background: none;
  border: none;
  color: var(--muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s ease;
}
.btn-delete:hover { color: #DC2626; background: #FEE2E2; }

/* Empty state */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 16px;
  text-align: center;
  background: var(--surface-container-lowest);
  border-radius: 20px;
  border: 1px dashed var(--outline-variant);
}

.empty-icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: 18px;
  background: #EEF2FF;
  color: #4F46E5;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}

/* Modals */
.modal-card {
  width: 100%;
  max-width: 440px;
  background: var(--surface-container-lowest);
  border-radius: 24px;
  padding: 20px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.15);
  border: 1px solid var(--outline-variant);
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 12px;
  margin-bottom: 12px;
  border-bottom: 1px solid var(--outline-variant);
}

.modal-close-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--surface-container);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.15s ease;
}
.modal-close-btn:hover { color: var(--on-surface); background: var(--surface-variant); }

.form-input {
  width: 100%;
  padding: 10px 14px;
  border-radius: 12px;
  background: var(--surface);
  border: 1px solid var(--outline-variant);
  font-size: 12px;
  color: var(--on-surface);
  outline: none;
  transition: all 0.15s ease;
}
.form-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.15);
}

.owner-toggle-btn {
  padding: 8px 4px;
  border-radius: 12px;
  border: 1px solid var(--outline-variant);
  background: var(--surface);
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.15s ease;
}
.owner-toggle-btn--active {
  border-color: var(--primary);
  background: #EEF2FF;
  color: var(--primary);
  font-weight: 700;
}
.owner-toggle-btn--active-suami {
  border-color: #3B82F6;
  background: #EFF6FF;
  color: #2563EB;
  font-weight: 700;
}
.owner-toggle-btn--active-istri {
  border-color: #EC4899;
  background: #FDF2F8;
  color: #DB2777;
  font-weight: 700;
}
.owner-toggle-btn--active-sendiri {
  border-color: #6366F1;
  background: #EEF2FF;
  color: #4F46E5;
  font-weight: 700;
}

.modal-error-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 12px;
  background: #FFF1F2;
  border: 1px solid #FECDD3;
  color: #BE123C;
  font-size: 12px;
  font-weight: 600;
}

.btn-cancel {
  padding: 8px 16px;
  border-radius: 12px;
  background: var(--surface-container);
  color: var(--muted);
  font-size: 12px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
}
.btn-cancel:hover { color: var(--on-surface); background: var(--surface-variant); }

.btn-primary {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 12px;
  background: var(--primary);
  color: white;
  font-size: 12px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.25);
  transition: all 0.15s ease;
}
.btn-primary:hover { opacity: 0.92; }
.btn-primary:active { transform: scale(0.95); }

/* Skeleton */
.skeleton-card {
  height: 64px;
  border-radius: 16px;
  background: var(--surface-container);
  margin-bottom: 8px;
}
</style>
