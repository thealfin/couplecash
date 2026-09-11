<script setup lang="ts">
definePageMeta({ layout: 'app' })
useHead({ title: 'Kelola Akun Finansial — CoupleCash' })

const router = useRouter()
const { getAuthToken, currentUser, hasPartner } = useAuth()
const hideBottomNav = useState('hideBottomNav', () => false)

interface Account {
  id: string
  name: string
  accountType: 'bank' | 'e_wallet' | 'deposito' | 'cash' | 'crypto' | 'debt'
  ownerType: 'suami' | 'istri' | 'bersama' | 'sendiri'
  icon: string
  balance: number
  balanceText: string
  initialBalance: number
  accountNumber: string | null
  description: string | null
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

const userRole = computed<'suami' | 'istri' | 'single'>(() => (currentUser.value?.role as any) || 'suami')

const accounts = ref<Account[]>([])
const isLoading = ref(true)

// Menu state
const activeMenuId = ref<string | null>(null)

function toggleMenu(id: string) {
  activeMenuId.value = activeMenuId.value === id ? null : id
}

function closeMenu() {
  activeMenuId.value = null
}

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

// Form & Modal State
const isModalOpen = ref(false)
const isEditing = ref(false)
const editingAccountId = ref<string | null>(null)

const bankCategory = ref<'bca' | 'mandiri' | 'bni' | 'bri' | 'gopay' | 'ovo' | 'dana' | 'shopeepay' | 'dompet_suami' | 'dompet_istri' | 'dompet_bersama' | 'crypto' | 'debt' | 'other' | ''>('')
const customTitleInput = ref('')
const customInstitutionType = ref<'bank' | 'e_wallet' | 'crypto' | 'debt' | 'cash'>('bank')
const customName = ref('')
const accountNumberInput = ref('')
const holderNameInput = ref('')
const rawBalanceInput = ref('')
const selectedOwnership = ref<'suami' | 'bersama' | 'istri' | 'sendiri'>('suami')
const isSubmitting = ref(false)
const formError = ref('')

// Detail Modal State
const isDetailModalOpen = ref(false)
const selectedAccount = ref<Account | null>(null)

// Paid Off Debt Conversion Modal State
const isPaidOffModalOpen = ref(false)
const paidOffAccountToEdit = ref<Account | null>(null)

function openPaidOffModal(acc: Account) {
  paidOffAccountToEdit.value = acc
  isPaidOffModalOpen.value = true
}

function handlePaidOffSuccess() {
  showToast('Pos akun hutang berhasil disesuaikan menjadi pos akun biasa!')
  fetchAccounts()
}

watch([isModalOpen, isDetailModalOpen, isPaidOffModalOpen], ([openForm, openDetail, openPaidOff]) => {
  hideBottomNav.value = openForm || openDetail || openPaidOff
})

onUnmounted(() => {
  hideBottomNav.value = false
})

watch(
  userRole,
  (role) => {
    if (role === 'single') {
      selectedOwnership.value = 'sendiri'
    } else if (role) {
      selectedOwnership.value = role
    }
  },
  { immediate: true }
)

watch(bankCategory, (val) => {
  if (val === 'dompet_suami') selectedOwnership.value = 'suami'
  else if (val === 'dompet_istri') selectedOwnership.value = 'istri'
  else if (val === 'dompet_bersama') selectedOwnership.value = 'bersama'
  else if (val === 'crypto') customInstitutionType.value = 'crypto'
  else if (val === 'debt') customInstitutionType.value = 'debt'
})

const displayFormattedBalance = computed(() => {
  if (!rawBalanceInput.value) return ''
  const val = parseInt(rawBalanceInput.value.replace(/\D/g, ''), 10)
  if (isNaN(val)) return ''
  return val.toLocaleString('id-ID')
})

function handleBalanceInput(e: Event) {
  const target = e.target as HTMLInputElement
  const digits = target.value.replace(/\D/g, '')
  rawBalanceInput.value = digits
}

async function fetchAccounts() {
  isLoading.value = true
  try {
    const token = await getAuthToken()
    const res: any = await $fetch('/api/accounts', {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    if (res?.success) {
      accounts.value = res.accounts || []
    }
  } catch (err) {
    console.error('Failed to fetch accounts', err)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchAccounts()
})

async function toggleAccountActive(acc: Account) {
  const newActiveState = !acc.isActive
  acc.isActive = newActiveState

  try {
    const token = await getAuthToken()
    await $fetch(`/api/accounts/${acc.id}`, {
      method: 'PUT',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: { isActive: newActiveState }
    })
    showToast(`Pos Akun "${acc.name}" ${newActiveState ? 'diaktifkan' : 'dinonaktifkan'}`)
  } catch (err: any) {
    acc.isActive = !newActiveState
    showToast('Gagal mengubah status pos akun')
  }
}

function openAddModal() {
  closeMenu()
  isEditing.value = false
  editingAccountId.value = null
  bankCategory.value = ''
  customTitleInput.value = ''
  customInstitutionType.value = 'bank'
  customName.value = ''
  accountNumberInput.value = ''
  holderNameInput.value = ''
  rawBalanceInput.value = ''
  selectedOwnership.value = userRole.value
  formError.value = ''
  isModalOpen.value = true
}

function openEditModal(acc: Account) {
  closeMenu()
  isEditing.value = true
  editingAccountId.value = acc.id
  customTitleInput.value = acc.name
  customName.value = ''
  customInstitutionType.value = (acc.accountType as any) || 'bank'
  bankCategory.value = 'other'
  accountNumberInput.value = acc.accountNumber || ''
  holderNameInput.value = acc.description || ''
  rawBalanceInput.value = String(Math.abs(acc.balance || 0))
  selectedOwnership.value = acc.ownerType
  formError.value = ''
  isModalOpen.value = true
}

function openDetailModal(acc: Account) {
  closeMenu()
  selectedAccount.value = acc
  isDetailModalOpen.value = true
}

function closeModal() {
  isModalOpen.value = false
}

function closeDetailModal() {
  isDetailModalOpen.value = false
  selectedAccount.value = null
}

async function handleSaveAccount() {
  formError.value = ''
  let finalName = ''
  let accountType: 'bank' | 'e_wallet' | 'cash' | 'crypto' | 'debt' = 'bank'
  let customIcon = ''

  if (isEditing.value) {
    finalName = customTitleInput.value.trim() || customName.value.trim()
    accountType = customInstitutionType.value as any
  } else {
    if (['bca', 'mandiri', 'bni', 'bri'].includes(bankCategory.value)) {
      finalName = bankCategory.value.toUpperCase()
      if (customName.value.trim()) finalName += ` ${customName.value.trim()}`
      accountType = 'bank'
    } else if (['gopay', 'ovo', 'dana', 'shopeepay'].includes(bankCategory.value)) {
      const mapName: Record<string, string> = {
        gopay: 'GoPay',
        ovo: 'OVO',
        dana: 'DANA',
        shopeepay: 'ShopeePay'
      }
      finalName = mapName[bankCategory.value] || bankCategory.value
      if (customName.value.trim()) finalName += ` ${customName.value.trim()}`
      accountType = 'e_wallet'
    } else if (['dompet_suami', 'dompet_istri', 'dompet_bersama'].includes(bankCategory.value)) {
      const dompetMap: Record<string, string> = {
        dompet_suami: 'Dompet Suami',
        dompet_istri: 'Dompet Istri',
        dompet_bersama: 'Dompet Bersama'
      }
      finalName = dompetMap[bankCategory.value] || 'Dompet Tunai'
      if (customName.value.trim()) finalName += ` ${customName.value.trim()}`
      accountType = 'cash'
    } else if (bankCategory.value === 'crypto') {
      finalName = customTitleInput.value.trim() || 'Crypto Portfolio'
      accountType = 'crypto'
      customIcon = 'currency_bitcoin'
    } else if (bankCategory.value === 'debt') {
      finalName = customTitleInput.value.trim() || 'Pos Hutang / Kewajiban'
      accountType = 'debt'
      customIcon = 'warning'
    } else if (bankCategory.value === 'other') {
      const title = customTitleInput.value.trim()
      const label = customName.value.trim()
      finalName = title || label
      if (title && label) finalName = `${title} (${label})`
      accountType = customInstitutionType.value as any
      if (accountType === 'crypto') customIcon = 'currency_bitcoin'
      if (accountType === 'debt') customIcon = 'warning'
    } else {
      finalName = customName.value.trim()
      accountType = 'bank'
    }
  }

  if (!finalName) {
    formError.value = 'Silakan pilih institusi atau masukkan nama akun'
    return
  }

  const numericBalance = parseInt(rawBalanceInput.value || '0', 10)

  isSubmitting.value = true
  try {
    const token = await getAuthToken()
    if (isEditing.value && editingAccountId.value) {
      // EDIT existing account
      const res: any = await $fetch(`/api/accounts/${editingAccountId.value}`, {
        method: 'PUT',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: {
          name: finalName,
          accountType,
          ownerType: selectedOwnership.value,
          balance: numericBalance,
          accountNumber: accountNumberInput.value,
          holderName: holderNameInput.value,
          icon: customIcon || undefined,
        }
      })
      if (res?.success) {
        showToast('Pos Akun berhasil diperbarui')
        closeModal()
        await fetchAccounts()
      }
    } else {
      // CREATE new account
      const res: any = await $fetch('/api/accounts', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: {
          name: finalName,
          accountType,
          ownerType: selectedOwnership.value,
          initialBalance: numericBalance,
          accountNumber: accountNumberInput.value,
          holderName: holderNameInput.value,
          icon: customIcon || undefined,
        }
      })
      if (res?.success) {
        showToast('Pos Akun baru berhasil ditambahkan')
        closeModal()
        await fetchAccounts()
      }
    }
  } catch (err: any) {
    formError.value = err?.data?.statusMessage || err?.message || 'Terjadi kesalahan'
  } finally {
    isSubmitting.value = false
  }
}

async function handleDeleteAccount(acc: Account) {
  closeMenu()
  if (!confirm(`Hapus atau nonaktifkan pos akun "${acc.name}"?`)) {
    return
  }

  try {
    const token = await getAuthToken()
    const res: any = await $fetch(`/api/accounts/${acc.id}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })

    if (res?.success) {
      showToast(res.message || 'Pos Akun berhasil diproses')
      await fetchAccounts()
    }
  } catch (err: any) {
    showToast(err?.data?.statusMessage || 'Gagal menghapus pos akun')
  }
}

function getIconForAccount(acc: Account) {
  if (acc.icon) return acc.icon
  if (acc.accountType === 'e_wallet') return 'account_balance_wallet'
  if (acc.accountType === 'cash') return 'payments'
  if (acc.accountType === 'crypto') return 'currency_bitcoin'
  if (acc.accountType === 'debt') return 'warning'
  return 'account_balance'
}

function getOwnerLabel(owner: string) {
  if (owner === 'suami') return 'Akun Suami'
  if (owner === 'istri') return 'Akun Istri'
  if (owner === 'sendiri') return 'Akun Pribadi'
  return 'Akun Bersama'
}

function getAccountTypeLabel(type: string) {
  switch (type) {
    case 'bank': return 'Rekening Bank'
    case 'e_wallet': return 'E-Wallet'
    case 'cash': return 'Dompet Tunai'
    case 'crypto': return 'Crypto Portfolio'
    case 'debt': return 'Hutang / Kewajiban'
    default: return 'Akun Finansial'
  }
}
</script>

<template>
  <div class="kelola-akun-page animate-fade-in pb-36" @click="closeMenu">
    <!-- Header Section -->
    <div class="header-bar px-4 pt-4 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-surface-variant active:scale-95 transition-all cursor-pointer"
          @click="router.back()"
          aria-label="Kembali"
        >
          <span class="material-symbols-outlined text-[20px]">arrow_back</span>
        </button>
        <div>
          <h1 class="text-lg font-bold text-on-background">Kelola Akun Finansial</h1>
          <p class="text-xs text-muted">Daftar pos akun rekening, e-wallet, crypto, dan hutang</p>
        </div>
      </div>
      <span class="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
        Pos Akun
      </span>
    </div>

    <!-- Toast Notification -->
    <div
      v-if="toastMessage"
      class="mx-4 mt-3 p-3 rounded-2xl bg-on-background text-white text-xs font-medium shadow-lg flex items-center gap-2 animate-slide-up z-30"
    >
      <span class="material-symbols-outlined text-[18px] text-emerald-400">info</span>
      <span>{{ toastMessage }}</span>
    </div>

    <!-- Content List Section -->
    <div class="accounts-container px-4 pt-4 space-y-3">
      <div v-if="isLoading" class="text-center py-10 text-muted text-xs flex flex-col items-center gap-2">
        <span class="material-symbols-outlined animate-spin text-[28px] text-primary">refresh</span>
        <span>Memuat daftar pos akun...</span>
      </div>

      <div v-else-if="accounts.length === 0" class="bg-white dark:bg-[#15171e] rounded-3xl p-8 text-center shadow-xs border border-surface-variant/40 dark:border-[#282b37] flex flex-col items-center">
        <div class="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center text-muted mb-2">
          <span class="material-symbols-outlined text-[24px]">account_balance</span>
        </div>
        <h3 class="text-sm font-bold text-on-background">Belum ada pos akun finansial</h3>
        <p class="text-xs text-muted mt-0.5 max-w-xs">Tambahkan rekening bank, dompet digital, atau pos hutang untuk mulai mencatat keuangan.</p>
      </div>

      <!-- Account Cards -->
      <div
        v-for="acc in accounts"
        :key="acc.id"
        class="relative bg-white dark:bg-[#15171e] rounded-2xl p-4 shadow-xs border border-surface-variant/40 dark:border-[#282b37] transition-all duration-200 overflow-hidden"
        :class="{ 'opacity-60 bg-slate-50 dark:bg-slate-900 border-dashed': !acc.isActive }"
      >
        <!-- Top Colored Strip by Owner -->
        <div
          class="absolute top-0 left-0 right-0 h-1"
          :class="[
            acc.ownerType === 'suami' ? 'bg-blue-500' : acc.ownerType === 'istri' ? 'bg-pink-500' : 'bg-primary'
          ]"
        ></div>

        <div class="flex items-start justify-between mb-3 pt-0.5">
          <div class="flex items-center gap-3">
            <div
              class="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs"
              :class="[
                acc.accountType === 'debt'
                  ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                  : acc.ownerType === 'suami'
                    ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
                    : acc.ownerType === 'istri'
                      ? 'bg-pink-100 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400'
                      : acc.ownerType === 'sendiri'
                        ? 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                        : 'bg-primary/10 dark:bg-primary/20 text-primary dark:text-[#a5b4fc]'
              ]"
            >
              <span class="material-symbols-outlined text-[22px]">{{ getIconForAccount(acc) }}</span>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-sm font-bold text-on-background leading-snug">{{ acc.name }}</h3>
                <span
                  v-if="!acc.isActive"
                  class="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                >
                  Nonaktif
                </span>
              </div>
              <div class="flex items-center gap-1.5 mt-0.5">
                <span
                  class="w-2 h-2 rounded-full"
                  :class="acc.ownerType === 'suami' ? 'bg-blue-500' : acc.ownerType === 'istri' ? 'bg-pink-500' : acc.ownerType === 'sendiri' ? 'bg-indigo-500' : 'bg-primary'"
                ></span>
                <span class="text-[11px] text-muted">{{ getOwnerLabel(acc.ownerType) }}</span>
                <span class="text-[11px] text-muted">•</span>
                <span class="text-[11px] text-muted">{{ getAccountTypeLabel(acc.accountType) }}</span>
              </div>
            </div>
          </div>

          <!-- Controls: Active Toggle & 3-Dot Menu -->
          <div class="flex items-center gap-1.5">
            <!-- Active Toggle -->
            <button
              type="button"
              class="w-10 h-5 rounded-full transition-colors relative cursor-pointer focus:outline-none"
              :class="acc.isActive ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'"
              @click.stop="toggleAccountActive(acc)"
              :title="acc.isActive ? 'Nonaktifkan pos akun' : 'Aktifkan pos akun'"
            >
              <div
                class="w-3.5 h-3.5 rounded-full bg-white transition-transform shadow-xs absolute top-0.5"
                :class="acc.isActive ? 'translate-x-5 left-0' : 'translate-x-1 left-0'"
              ></div>
            </button>

            <!-- 3-Dot Menu Button -->
            <div class="relative">
              <button
                type="button"
                class="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:text-on-background hover:bg-surface-container dark:hover:bg-[#1e2029] transition-all cursor-pointer"
                @click.stop="toggleMenu(acc.id)"
                aria-label="Opsi Pos Akun"
              >
                <span class="material-symbols-outlined text-[20px]">more_vert</span>
              </button>

              <!-- Dropdown Menu -->
              <div
                v-if="activeMenuId === acc.id"
                class="absolute right-0 top-9 w-36 bg-white dark:bg-[#1e2029] rounded-2xl shadow-xl border border-surface-variant/60 dark:border-[#2e313d] py-1.5 z-40 animate-slide-up"
                @click.stop
              >
                <button
                  type="button"
                  class="w-full px-3 py-2 text-left text-xs font-semibold text-on-surface hover:bg-surface-container-low dark:hover:bg-[#282b37] flex items-center gap-2 cursor-pointer"
                  @click="openDetailModal(acc)"
                >
                  <span class="material-symbols-outlined text-[16px] text-primary">visibility</span>
                  <span>Detail</span>
                </button>
                <button
                  type="button"
                  class="w-full px-3 py-2 text-left text-xs font-semibold text-on-surface hover:bg-surface-container-low dark:hover:bg-[#282b37] flex items-center gap-2 cursor-pointer"
                  @click="openEditModal(acc)"
                >
                  <span class="material-symbols-outlined text-[16px] text-amber-500">edit</span>
                  <span>Edit</span>
                </button>
                <div class="h-px bg-surface-variant/40 dark:bg-[#2e313d] my-1"></div>
                <button
                  type="button"
                  class="w-full px-3 py-2 text-left text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 cursor-pointer"
                  @click="handleDeleteAccount(acc)"
                >
                  <span class="material-symbols-outlined text-[16px] text-rose-500">delete</span>
                  <span>Hapus</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Card Body: Balance & Sync info -->
        <div class="pt-2 border-t border-surface-variant/40 flex items-baseline justify-between">
          <div>
            <p class="text-[11px] text-muted font-medium">
              {{ acc.accountType === 'debt' ? (acc.balance >= 0 ? 'Status Kewajiban' : 'Total Kewajiban / Hutang') : 'Saldo Tersedia' }}
            </p>
            <p
              class="text-base font-bold font-tabular-number tracking-tight"
              :class="acc.balance < 0 ? 'text-amber-600' : (acc.accountType === 'debt' ? 'text-emerald-600' : 'text-on-background')"
            >
              {{ acc.accountType === 'debt' && acc.balance >= 0 ? 'Sudah Lunas (Rp 0)' : acc.balanceText }}
            </p>
          </div>
          <div class="text-right">
            <span v-if="acc.accountNumber" class="text-[11px] font-mono text-muted bg-surface-container-low px-2 py-0.5 rounded-md">
              {{ acc.accountNumber }}
            </span>
            <span v-else-if="acc.accountType === 'debt' && acc.balance >= 0" class="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 inline-flex items-center gap-1">
              <span class="material-symbols-outlined text-[12px]">verified</span> Sudah Lunas
            </span>
            <span v-else class="text-[10px] text-emerald-600 flex items-center gap-1">
              <span class="material-symbols-outlined text-[13px]">check_circle</span> Terhubung
            </span>
          </div>
        </div>

        <!-- Action when debt account is paid off -->
        <div v-if="acc.accountType === 'debt' && acc.balance >= 0" class="mt-3 pt-2.5 border-t border-dashed border-emerald-200 flex items-center justify-between bg-emerald-50/60 -mx-4 -mb-4 px-4 py-2.5">
          <div class="flex items-center gap-1.5 text-xs text-emerald-800 font-medium">
            <span class="material-symbols-outlined text-[16px] text-emerald-600">savings</span>
            <span class="text-[11px]">Hutang lunas, dapat dialihkan</span>
          </div>
          <button
            type="button"
            class="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-xs hover:bg-emerald-700 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
            @click.stop="openPaidOffModal(acc)"
          >
            <span class="material-symbols-outlined text-[14px]">tune</span>
            <span>Sesuaikan Pos Akun</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Floating Action Button Area -->
    <div class="fixed bottom-6 inset-x-0 px-4 max-w-md mx-auto z-30 pointer-events-none">
      <button
        type="button"
        class="w-full py-3.5 rounded-2xl bg-primary text-white text-xs font-bold shadow-lg shadow-primary/30 hover:bg-primary/90 active:scale-95 transition-all flex items-center justify-center gap-2 pointer-events-auto cursor-pointer"
        @click="openAddModal"
      >
        <span class="material-symbols-outlined text-[20px]">add_circle</span>
        <span>Tambah Pos Akun Baru</span>
      </button>
    </div>

    <!-- ============================================== -->
    <!-- MODAL 1: ADD & EDIT POS AKUN                   -->
    <!-- ============================================== -->
    <div
      v-if="isModalOpen"
      class="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
    >
      <div class="fixed inset-0 bg-black/40 backdrop-blur-[2px]" @click="closeModal"></div>

      <div class="relative w-full max-w-md bg-white dark:bg-[#15171e] rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl z-10 max-h-[90vh] flex flex-col animate-slide-up border dark:border-[#282b37]">
        <div class="w-10 h-1 rounded-full bg-surface-variant dark:bg-[#282b37] mx-auto mb-3 sm:hidden"></div>

        <div class="flex items-center justify-between pb-3 border-b border-surface-variant/40 dark:border-[#282b37]">
          <div>
            <h2 class="text-base font-bold text-on-background">
              {{ isEditing ? 'Edit Pos Akun' : 'Tambah Pos Akun Baru' }}
            </h2>
            <p class="text-xs text-muted">
              {{ isEditing ? 'Perbarui detail rekening, dompet digital, atau hutang' : 'Masukkan detail rekening atau dompet finansial baru' }}
            </p>
          </div>
          <button
            type="button"
            class="w-8 h-8 rounded-full bg-surface-container dark:bg-[#1e2029] flex items-center justify-center text-muted hover:text-on-background cursor-pointer"
            @click="closeModal"
          >
            <span class="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div class="overflow-y-auto py-4 space-y-3.5">
          <div v-if="formError" class="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <span class="material-symbols-outlined text-[18px]">error</span>
            <span>{{ formError }}</span>
          </div>

          <!-- Institution Selector (Add Mode) -->
          <div v-if="!isEditing">
            <label class="block text-xs font-bold text-on-background mb-1">Institusi atau Tipe</label>
            <div class="relative">
              <select
                v-model="bankCategory"
                class="w-full bg-surface-container-low dark:bg-[#1e2029] border border-surface-variant/60 dark:border-[#2e313d] rounded-2xl px-3.5 py-2.5 text-xs text-on-background focus:outline-none focus:border-primary shadow-xs appearance-none cursor-pointer"
              >
                <option value="" disabled>Pilih Institusi / Tipe...</option>
                <optgroup label="Bank Nasional">
                  <option value="bca">BCA</option>
                  <option value="mandiri">Mandiri</option>
                  <option value="bni">BNI</option>
                  <option value="bri">BRI</option>
                </optgroup>
                <optgroup label="E-Wallet">
                  <option value="gopay">GoPay</option>
                  <option value="ovo">OVO</option>
                  <option value="dana">DANA</option>
                  <option value="shopeepay">ShopeePay</option>
                </optgroup>
                <optgroup label="Dompet Tunai">
                  <option value="dompet_suami">Dompet Suami</option>
                  <option value="dompet_istri">Dompet Istri</option>
                  <option value="dompet_bersama">Dompet Bersama</option>
                </optgroup>
                <optgroup label="Investasi & Kewajiban">
                  <option value="crypto">Crypto Portfolio</option>
                  <option value="debt">Pos Hutang / Kewajiban</option>
                </optgroup>
                <option value="other">Institusi / Bank Lainnya...</option>
              </select>
              <span class="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none text-[18px]">expand_more</span>
            </div>
          </div>

          <!-- Account Name -->
          <div>
            <label class="block text-xs font-bold text-on-background mb-1">Nama Akun</label>
            <input
              v-model="customTitleInput"
              type="text"
              class="w-full bg-surface-container-low dark:bg-[#1e2029] border border-surface-variant/60 dark:border-[#2e313d] rounded-2xl px-3.5 py-2.5 text-xs text-on-background focus:outline-none focus:border-primary shadow-xs"
              placeholder="Misal: BCA Utama atau Cicilan Mobil"
            />
          </div>

          <!-- Account Type (Edit Mode or Other) -->
          <div v-if="isEditing || bankCategory === 'other'">
            <label class="block text-xs font-bold text-on-background mb-1">Jenis Akun</label>
            <select
              v-model="customInstitutionType"
              class="w-full bg-surface-container-low dark:bg-[#1e2029] border border-surface-variant/60 dark:border-[#2e313d] rounded-2xl px-3.5 py-2.5 text-xs text-on-background focus:outline-none focus:border-primary shadow-xs appearance-none cursor-pointer"
            >
              <option value="bank">Rekening Bank</option>
              <option value="e_wallet">E-Wallet</option>
              <option value="cash">Dompet Tunai</option>
              <option value="crypto">Crypto</option>
              <option value="debt">Hutang / Kewajiban</option>
            </select>
          </div>

          <!-- Saldo Input -->
          <div>
            <label class="block text-xs font-bold text-on-background mb-1">
              {{ (isEditing ? customInstitutionType === 'debt' : bankCategory === 'debt') ? 'Nominal Hutang / Kewajiban' : 'Saldo Saat Ini' }}
            </label>
            <div class="relative">
              <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted">Rp</span>
              <input
                :value="displayFormattedBalance"
                @input="handleBalanceInput"
                type="text"
                class="w-full bg-surface-container-low dark:bg-[#1e2029] border border-surface-variant/60 dark:border-[#2e313d] rounded-2xl pl-10 pr-4 py-2.5 text-xs font-bold text-on-background focus:outline-none focus:border-primary shadow-xs"
                placeholder="0"
              />
            </div>
          </div>

          <!-- Ownership Selector -->
          <div>
            <label class="block text-xs font-bold text-on-background mb-1">Kepemilikan Akun</label>
            <div v-if="userRole === 'single'" class="flex bg-surface-container-low dark:bg-[#1e2029] p-1 rounded-2xl border border-surface-variant/50 dark:border-[#2e313d]">
              <button
                type="button"
                class="flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer bg-primary text-white shadow-sm"
                @click="selectedOwnership = 'sendiri'"
              >
                Sendiri (Pribadi)
              </button>
            </div>
            <div v-else class="flex bg-surface-container-low dark:bg-[#1e2029] p-1 rounded-2xl border border-surface-variant/50 dark:border-[#2e313d]">
              <button
                type="button"
                class="flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                :class="selectedOwnership === 'suami' ? 'bg-blue-500 text-white shadow-sm' : 'text-on-surface-variant'"
                @click="selectedOwnership = 'suami'"
              >
                Suami
              </button>
              <button
                v-if="hasPartner"
                type="button"
                class="flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                :class="selectedOwnership === 'bersama' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant'"
                @click="selectedOwnership = 'bersama'"
              >
                Bersama
              </button>
              <button
                v-if="hasPartner"
                type="button"
                class="flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                :class="selectedOwnership === 'istri' ? 'bg-pink-500 text-white shadow-sm' : 'text-on-surface-variant'"
                @click="selectedOwnership = 'istri'"
              >
                Istri
              </button>
            </div>
          </div>

          <!-- Account Number (Optional) -->
          <div>
            <label class="block text-xs font-bold text-on-background mb-1">Nomor Rekening / No. HP (Opsional)</label>
            <input
              v-model="accountNumberInput"
              type="text"
              class="w-full bg-surface-container-low dark:bg-[#1e2029] border border-surface-variant/60 dark:border-[#2e313d] rounded-2xl px-3.5 py-2.5 text-xs text-on-background focus:outline-none focus:border-primary shadow-xs font-mono"
              placeholder="Contoh: 5321098765"
            />
          </div>
        </div>

        <div class="pt-3 border-t border-surface-variant/40 dark:border-[#282b37] flex gap-2">
          <button
            type="button"
            class="flex-1 py-2.5 rounded-xl border border-surface-variant/60 dark:border-[#2e313d] text-xs font-bold text-muted hover:bg-surface-container dark:hover:bg-[#1e2029] transition-all cursor-pointer"
            @click="closeModal"
          >
            Batal
          </button>
          <button
            type="button"
            class="flex-1 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 active:scale-95 transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            :disabled="isSubmitting"
            @click="handleSaveAccount"
          >
            <span v-if="isSubmitting" class="material-symbols-outlined animate-spin text-[16px]">refresh</span>
            <span>{{ isEditing ? 'Simpan Perubahan' : 'Simpan Pos Akun' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ============================================== -->
    <!-- MODAL 2: POS AKUN DETAIL                       -->
    <!-- ============================================== -->
    <div
      v-if="isDetailModalOpen && selectedAccount"
      class="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
    >
      <div class="fixed inset-0 bg-black/40 backdrop-blur-[2px]" @click="closeDetailModal"></div>

      <div class="relative w-full max-w-md bg-white dark:bg-[#15171e] rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl z-10 animate-slide-up space-y-4 border dark:border-[#282b37]">
        <div class="w-10 h-1 rounded-full bg-surface-variant dark:bg-[#282b37] mx-auto mb-2 sm:hidden"></div>

        <!-- Header -->
        <div class="flex items-center justify-between pb-3 border-b border-surface-variant/40 dark:border-[#282b37]">
          <div class="flex items-center gap-3">
            <div
              class="w-12 h-12 rounded-2xl flex items-center justify-center"
              :class="[
                selectedAccount.accountType === 'debt'
                  ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                  : selectedAccount.ownerType === 'suami'
                    ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
                    : selectedAccount.ownerType === 'istri'
                      ? 'bg-pink-100 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400'
                      : 'bg-primary/10 dark:bg-primary/20 text-primary dark:text-[#a5b4fc]'
              ]"
            >
              <span class="material-symbols-outlined text-[26px]">{{ getIconForAccount(selectedAccount) }}</span>
            </div>
            <div>
              <h2 class="text-base font-bold text-on-background">{{ selectedAccount.name }}</h2>
              <span
                class="text-[10px] font-bold px-2 py-0.5 rounded-full"
                :class="selectedAccount.isActive ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300' : 'bg-surface-container dark:bg-[#1e2029] text-muted'"
              >
                {{ selectedAccount.isActive ? 'Aktif' : 'Nonaktif' }}
              </span>
            </div>
          </div>
          <button
            type="button"
            class="w-8 h-8 rounded-full bg-surface-container dark:bg-[#1e2029] flex items-center justify-center text-muted hover:text-on-background cursor-pointer"
            @click="closeDetailModal"
          >
            <span class="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <!-- Debt Notification Banner if Debt -->
        <div
          v-if="selectedAccount.accountType === 'debt' || selectedAccount.balance < 0"
          class="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 text-xs space-y-1"
        >
          <div class="flex items-center gap-1.5 font-bold">
            <span class="material-symbols-outlined text-[16px]">info</span>
            <span>Perlakuan Sistem Hutang:</span>
          </div>
          <p class="text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">
            Pos ini dicatat sebagai kewajiban dan tidak mengurangi total saldo aset kas keluarga.
          </p>
        </div>

        <!-- Info Table -->
        <div class="space-y-2 text-xs">
          <div class="flex justify-between p-3 rounded-2xl bg-surface-container-low dark:bg-[#1e2029]">
            <span class="text-muted">Jenis Pos Akun</span>
            <span class="font-bold text-on-background">{{ getAccountTypeLabel(selectedAccount.accountType) }}</span>
          </div>
          <div class="flex justify-between p-3 rounded-2xl bg-surface-container-low dark:bg-[#1e2029]">
            <span class="text-muted">Saldo Saat Ini</span>
            <span class="font-bold font-tabular-number" :class="selectedAccount.balance < 0 ? 'text-amber-600 dark:text-amber-400' : 'text-on-background'">
              {{ selectedAccount.balanceText }}
            </span>
          </div>
          <div class="flex justify-between p-3 rounded-2xl bg-surface-container-low dark:bg-[#1e2029]">
            <span class="text-muted">Kepemilikan</span>
            <span class="font-bold text-on-background">{{ getOwnerLabel(selectedAccount.ownerType) }}</span>
          </div>
          <div v-if="selectedAccount.accountNumber" class="flex justify-between p-3 rounded-2xl bg-surface-container-low dark:bg-[#1e2029]">
            <span class="text-muted">Nomor Rekening / ID</span>
            <span class="font-bold font-mono text-on-background">{{ selectedAccount.accountNumber }}</span>
          </div>
          <div class="flex justify-between p-3 rounded-2xl bg-surface-container-low dark:bg-[#1e2029]">
            <span class="text-muted">Status Seleksi Transaksi</span>
            <span class="font-bold" :class="selectedAccount.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted'">
              {{ selectedAccount.isActive ? 'Tersedia di Menu Catat' : 'Disembunyikan dari Menu Catat' }}
            </span>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="pt-2 flex gap-2">
          <button
            type="button"
            class="flex-1 py-2.5 rounded-xl border border-amber-300 dark:border-amber-700/60 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 text-xs font-bold hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            @click="openEditModal(selectedAccount)"
          >
            <span class="material-symbols-outlined text-[16px]">edit</span>
            <span>Edit Pos Akun</span>
          </button>
          <button
            type="button"
            class="flex-1 py-2.5 rounded-xl border border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-950/50 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            @click="handleDeleteAccount(selectedAccount); closeDetailModal()"
          >
            <span class="material-symbols-outlined text-[16px]">delete</span>
            <span>Hapus</span>
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL: Sesuaikan Pos Akun Sudah Lunas -->
    <DebtPaidOffModal
      :is-open="isPaidOffModalOpen"
      :account="paidOffAccountToEdit"
      @close="isPaidOffModalOpen = false"
      @success="handlePaidOffSuccess"
    />

  </div>
</template>
