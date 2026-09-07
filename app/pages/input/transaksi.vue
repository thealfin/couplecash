<script setup lang="ts">
definePageMeta({ layout: 'app' })
useHead({ title: 'Catat Transaksi — CoupleCash' })

const router = useRouter()
const route = useRoute()
const { getAuthToken, currentUser, hasPartner } = useAuth()

interface CategoryItem {
  id: string
  name: string
  type: 'expense' | 'income'
  icon: string
  colorToken?: string
  appliesTo?: string
  isDefault?: boolean
}

interface AccountItem {
  id: string
  name: string
  accountType: string
  ownerType: string
  icon: string
  balance: number
  balanceText: string
  description?: string
}

interface PendingBillItem {
  id: string
  name: string
  amount: number
  amountText: string
  dueDate: string
  daysRemaining: number
  isOverdue: boolean
  isDueToday: boolean
  isUrgent: boolean
  urgencyLevel: string
  badgeText: string
  ownerType: 'bersama' | 'suami' | 'istri'
  ownerLabel: string
  status: string
}

const userRole = computed<'suami' | 'istri' | 'single'>(() => currentUser.value?.role || 'suami')

const type = ref<'expense' | 'income'>('expense')
const rawAmount = ref<number>(0)
const name = ref('')

const dbCategories = ref<CategoryItem[]>([])
const dbAccounts = ref<AccountItem[]>([])
const pendingBills = ref<PendingBillItem[]>([])
const selectedBillId = ref<string | null>(null)
const isLoadingData = ref(true)

const selectedBill = computed(() => {
  return pendingBills.value.find(b => b.id === selectedBillId.value)
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

function selectBill(bill: PendingBillItem) {
  if (selectedBillId.value === bill.id) {
    clearSelectedBill()
    return
  }
  selectedBillId.value = bill.id
  rawAmount.value = Number(bill.amount) || 0
  name.value = bill.name
  note.value = `Bayar tagihan: ${bill.name}`
  if (bill.ownerType) owner.value = bill.ownerType

  // Auto select category Tagihan & Utilitas if available
  const catTagihan = dbCategories.value.find(c =>
    c.type === 'expense' && (c.name.toLowerCase().includes('tagihan') || c.name.toLowerCase().includes('utilitas'))
  )
  if (catTagihan) {
    category.value = catTagihan.name
  }
}

function clearSelectedBill() {
  selectedBillId.value = null
  rawAmount.value = 0
  name.value = ''
  note.value = ''
}

// Modals state
const isSetupModalOpen = ref(false)
const isBalanceModalOpen = ref(false)
const bypassBalanceWarning = ref(false)

// Active debts
const activeDebts = computed(() => {
  return dbAccounts.value.filter(a => a.accountType === 'debt' && a.balance < 0)
})

const selectedDebtId = ref<string | null>(null)
const selectedDebt = computed(() => {
  return activeDebts.value.find(d => d.id === selectedDebtId.value) || null
})

function selectDebtItem(debt: any) {
  selectedDebtId.value = debt.id
  rawAmount.value = Math.abs(debt.balance)
  name.value = `Bayar Hutang: ${debt.name}`
  note.value = `Pelunasan hutang ${debt.name}`
}

function clearSelectedDebt() {
  selectedDebtId.value = null
}

const availableCategories = computed(() => {
  const cats = dbCategories.value.filter(c => c.type === type.value).map(c => c.name)
  if (type.value === 'expense' && activeDebts.value.length > 0 && !cats.includes('Hutang & Kewajiban')) {
    cats.push('Hutang & Kewajiban')
  }
  return cats
})

const availableAccounts = computed(() => {
  // If paying debt, source account should be asset account (not debt)
  if (category.value === 'Hutang & Kewajiban') {
    return dbAccounts.value.filter(a => a.accountType !== 'debt')
  }
  return dbAccounts.value
})

const category = ref('')
const account = ref('')
const owner = ref<'suami' | 'istri' | 'bersama' | 'sendiri'>('suami')

// Tax state
const rawTaxAmount = ref<number>(0)
const formattedTaxAmount = computed(() => {
  if (!rawTaxAmount.value || rawTaxAmount.value === 0) return '0'
  return rawTaxAmount.value.toLocaleString('id-ID')
})
function handleTaxInput(e: Event) {
  const input = e.target as HTMLInputElement
  const clean = input.value.replace(/\D/g, '')
  rawTaxAmount.value = clean ? parseInt(clean, 10) : 0
}

// Payment method state
const selectedPaymentMethod = ref<string>('QRIS')
const paymentMethodOptions = [
  { value: 'QRIS', label: 'QRIS', icon: 'qr_code_scanner' },
  { value: 'DEBIT_CARD', label: 'Kartu Debit', icon: 'credit_card' },
  { value: 'CREDIT_CARD', label: 'Kartu Kredit', icon: 'credit_card' },
  { value: 'BANK_TRANSFER', label: 'Transfer Bank', icon: 'account_balance' },
  { value: 'VIRTUAL_ACCOUNT', label: 'Virtual Account', icon: 'vpn_key' },
]

const selectedAccountData = computed(() => {
  return dbAccounts.value.find(a => a.name === account.value)
})

const isPaymentMethodApplicable = computed(() => {
  if (!selectedAccountData.value) return false
  const t = selectedAccountData.value.accountType
  return t !== 'cash' && t !== 'crypto'
})

// Watch category: auto-select debt if 'Hutang & Kewajiban' selected
watch(category, (newCat) => {
  if (newCat === 'Hutang & Kewajiban' && activeDebts.value.length > 0) {
    if (!selectedDebtId.value) {
      selectDebtItem(activeDebts.value[0])
    }
  } else if (newCat !== 'Hutang & Kewajiban') {
    selectedDebtId.value = null
  }
})

// Watch and set initial owner based on role
watch(
  userRole,
  (role) => {
    if (role === 'single') owner.value = 'sendiri'
    else if (role) owner.value = role
  },
  { immediate: true }
)

async function loadFormData() {
  try {
    isLoadingData.value = true
    const token = await getAuthToken()
    const headers = token ? { Authorization: `Bearer ${token}` } : {}

    const [catRes, accRes, billsRes]: [any, any, any] = await Promise.all([
      $fetch('/api/categories', { headers, query: { onlyActive: 'true' } }).catch(() => null),
      $fetch('/api/accounts', { headers, query: { onlyActive: 'true' } }).catch(() => null),
      $fetch('/api/bills', { headers }).catch(() => null),
    ])

    if (catRes?.success && Array.isArray(catRes.categories)) {
      dbCategories.value = catRes.categories
    } else {
      dbCategories.value = []
    }

    if (accRes?.success && Array.isArray(accRes.accounts)) {
      dbAccounts.value = accRes.accounts
    } else {
      dbAccounts.value = []
    }

    if (billsRes?.success && Array.isArray(billsRes.data)) {
      pendingBills.value = billsRes.data.filter((b: any) => b.status === 'pending')
      // If billId query parameter exists, auto select
      if (route.query.billId) {
        const found = pendingBills.value.find((b: any) => b.id === route.query.billId)
        if (found) selectBill(found)
      }
    }

    // Check if new user has missing accounts or categories
    if (dbAccounts.value.length === 0 || dbCategories.value.length === 0) {
      isSetupModalOpen.value = true
    }

    // Set initial account
    if (dbAccounts.value.length > 0) {
      account.value = dbAccounts.value[0].name
    } else {
      account.value = ''
    }

    // Set initial category
    const currentAvailable = availableCategories.value
    if (currentAvailable.length > 0) {
      category.value = currentAvailable[0]
    } else {
      category.value = ''
    }
  } catch (e) {
    console.warn('[transaksi.vue] Error loading realtime categories/accounts:', e)
  } finally {
    isLoadingData.value = false
  }
}

onMounted(() => {
  loadFormData()
})

watch(type, (newType) => {
  if (newType === 'income') {
    clearSelectedBill()
  }
  const currentAvailable = availableCategories.value
  if (currentAvailable.length > 0) {
    category.value = currentAvailable[0]
  } else {
    category.value = ''
  }
})

const dateVal = ref(new Date().toISOString().split('T')[0])
const note = ref('')

const isSaving = ref(false)
const errorMessage = ref('')

const formattedAmount = computed(() => {
  if (!rawAmount.value || rawAmount.value === 0) return '0'
  return rawAmount.value.toLocaleString('id-ID')
})

function handleAmountInput(e: Event) {
  const input = e.target as HTMLInputElement
  const clean = input.value.replace(/\D/g, '')
  rawAmount.value = clean ? parseInt(clean, 10) : 0
}

function addAmount(val: number) {
  rawAmount.value = (rawAmount.value || 0) + val
}

function clearAmount() {
  rawAmount.value = 0
}

const quickPresets = [
  { label: '+10rb', val: 10000 },
  { label: '+20rb', val: 20000 },
  { label: '+50rb', val: 50000 },
  { label: '+100rb', val: 100000 },
  { label: '+500rb', val: 500000 },
]

function handleSwitchAccount(newAccountName: string) {
  account.value = newAccountName
  isBalanceModalOpen.value = false
}

function handleProceedAnyway() {
  bypassBalanceWarning.value = true
  isBalanceModalOpen.value = false
  handleSubmit()
}

async function handleSubmit() {
  // Check empty state
  if (dbAccounts.value.length === 0 || dbCategories.value.length === 0) {
    isSetupModalOpen.value = true
    return
  }

  if (rawAmount.value <= 0) {
    errorMessage.value = 'Nominal harus lebih dari 0'
    return
  }

  // Tax Validation
  if (rawTaxAmount.value < 0) {
    errorMessage.value = 'Pajak tidak boleh bernilai negatif'
    return
  }
  if (rawTaxAmount.value > rawAmount.value) {
    errorMessage.value = 'Pajak tidak boleh lebih besar dari total transaksi.'
    return
  }

  // Debt Payment Validation
  if (category.value === 'Hutang & Kewajiban' && selectedDebt.value) {
    const outstanding = Math.abs(selectedDebt.value.balance)
    if (rawAmount.value > outstanding && outstanding > 0) {
      errorMessage.value = 'Nominal pembayaran melebihi sisa hutang.'
      return
    }
  }

  // Check insufficient balance for expense
  if (
    type.value === 'expense' &&
    selectedAccountData.value &&
    selectedAccountData.value.balance < rawAmount.value &&
    !bypassBalanceWarning.value
  ) {
    isBalanceModalOpen.value = true
    return
  }

  isSaving.value = true
  errorMessage.value = ''
  try {
    const token = await getAuthToken()
    const res: any = await $fetch('/api/transactions', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: {
        type: type.value,
        amount: rawAmount.value,
        tax_amount: rawTaxAmount.value,
        payment_method: isPaymentMethodApplicable.value ? selectedPaymentMethod.value : null,
        name: name.value.trim() || (type.value === 'income' ? 'Pemasukan' : 'Pengeluaran'),
        categoryName: category.value,
        accountName: account.value,
        accountId: selectedAccountData.value?.id,
        transactionDate: dateVal.value,
        note: note.value.trim(),
        ownerType: owner.value,
        source: 'manual',
        billId: selectedBillId.value,
        targetDebtAccountId: (category.value === 'Hutang & Kewajiban' && selectedDebtId.value) ? selectedDebtId.value : null,
      },
    })
    if (res.success) {
      await router.push('/beranda')
    }
  } catch (err: any) {
    console.error('[transaksi.vue] Save error:', err)
    errorMessage.value = err?.data?.statusMessage || err?.message || 'Gagal menyimpan transaksi'
  } finally {
    isSaving.value = false
    bypassBalanceWarning.value = false
  }
}
</script>

<template>
  <div class="transaksi-manual-page animate-fade-in px-page">

    <!-- Top Header -->
    <div class="header-row">
      <button class="back-btn" @click="router.back()" aria-label="Kembali">
        <span class="material-symbols-outlined">arrow_back</span>
      </button>
      <div>
        <h1 class="page-title">Catat Transaksi</h1>
        <p class="page-subtitle">Input cepat pengeluaran atau pemasukan</p>
      </div>
    </div>

    <!-- Type Switcher Pill -->
    <div class="type-switcher-pill">
      <button
        class="pill-btn"
        :class="{ 'pill-btn--expense': type === 'expense' }"
        @click="type = 'expense'"
      >
        <span class="material-symbols-outlined text-[18px]">arrow_outward</span>
        Pengeluaran
      </button>
      <button
        class="pill-btn"
        :class="{ 'pill-btn--income': type === 'income' }"
        @click="type = 'income'"
      >
        <span class="material-symbols-outlined text-[18px]">arrow_downward</span>
        Pemasukan
      </button>
    </div>

    <!-- Pending Bills Quick Selector (when expense) -->
    <div v-if="type === 'expense' && pendingBills.length > 0" class="pending-bills-section">
      <div class="flex items-center justify-between mb-1.5 px-0.5">
        <span class="text-[11px] font-bold text-on-surface flex items-center gap-1">
          <span class="material-symbols-outlined text-[15px] text-primary">receipt_long</span>
          <span>Bayar Tagihan Tertunda</span>
        </span>
        <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
          {{ pendingBills.length }} Tagihan
        </span>
      </div>

      <div class="pending-bills-scroll hide-scrollbar">
        <button
          v-for="b in pendingBills"
          :key="b.id"
          type="button"
          class="bill-select-chip"
          :class="{ 'bill-select-chip--selected': selectedBillId === b.id }"
          @click="selectBill(b)"
        >
          <div class="flex items-center gap-1.5">
            <span class="material-symbols-outlined text-[16px]">
              {{ selectedBillId === b.id ? 'check_circle' : getBillIcon(b.name) }}
            </span>
            <span class="chip-name truncate">{{ b.name }}</span>
            <span
              class="chip-badge"
              :class="b.isUrgent || b.isOverdue ? 'chip-badge--urgent' : ''"
            >
              {{ b.badgeText }}
            </span>
          </div>
          <span class="chip-amount tabular-nums font-bold">{{ b.amountText }}</span>
        </button>
      </div>

      <!-- Banner if bill selected -->
      <div v-if="selectedBill" class="selected-bill-banner">
        <div class="flex items-center gap-1.5 text-indigo-800 text-xs font-semibold min-w-0">
          <span class="material-symbols-outlined text-[16px] text-primary shrink-0">task_alt</span>
          <span class="truncate">Tagihan <strong>{{ selectedBill.name }}</strong> terpilih (Otomatis ditandai lunas)</span>
        </div>
        <button type="button" class="clear-bill-btn" @click="clearSelectedBill" title="Batal pilih tagihan">
          <span class="material-symbols-outlined text-[16px]">close</span>
        </button>
      </div>
    </div>

    <!-- Debt Quick Selector (when expense and category === 'Hutang & Kewajiban') -->
    <div v-if="type === 'expense' && category === 'Hutang & Kewajiban' && activeDebts.length > 0" class="pending-bills-section">
      <div class="flex items-center justify-between mb-1.5 px-0.5">
        <span class="text-[11px] font-bold text-on-surface flex items-center gap-1">
          <span class="material-symbols-outlined text-[15px] text-amber-600">credit_card_off</span>
          <span>Pilih Pos Hutang yang Dibayar</span>
        </span>
        <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
          {{ activeDebts.length }} Pos Hutang Aktif
        </span>
      </div>

      <div class="pending-bills-scroll hide-scrollbar">
        <button
          v-for="d in activeDebts"
          :key="d.id"
          type="button"
          class="bill-select-chip"
          :class="{ 'bill-select-chip--selected !bg-amber-50 !border-amber-500 !text-amber-900': selectedDebtId === d.id }"
          @click="selectDebtItem(d)"
        >
          <div class="flex items-center gap-1.5">
            <span class="material-symbols-outlined text-[16px]">
              {{ selectedDebtId === d.id ? 'check_circle' : (d.icon || 'credit_card') }}
            </span>
            <span class="chip-name truncate">{{ d.name }}</span>
            <span class="chip-badge bg-amber-100 text-amber-800">
              Sisa Hutang
            </span>
          </div>
          <span class="chip-amount tabular-nums font-bold text-error">{{ d.balanceText || formatCurrency(Math.abs(d.balance)) }}</span>
        </button>
      </div>

      <!-- Banner if debt selected -->
      <div v-if="selectedDebt" class="selected-bill-banner !bg-amber-50 !border-amber-200">
        <div class="flex items-center gap-1.5 text-amber-900 text-xs font-semibold min-w-0">
          <span class="material-symbols-outlined text-[16px] text-amber-600 shrink-0">task_alt</span>
          <span class="truncate">Pembayaran akan mengurangi sisa hutang <strong>{{ selectedDebt.name }}</strong></span>
        </div>
        <button type="button" class="clear-bill-btn !text-amber-700" @click="clearSelectedDebt" title="Batal pilih pos hutang">
          <span class="material-symbols-outlined text-[16px]">close</span>
        </button>
      </div>
    </div>

    <!-- M-Banking Hero Nominal Card -->
    <div class="nominal-hero-card" :class="type === 'expense' ? 'nominal-hero-card--expense' : 'nominal-hero-card--income'">
      <div class="nominal-hero-top">
        <span class="nominal-label">Nominal {{ type === 'expense' ? 'Pengeluaran' : 'Pemasukan' }}</span>
        <button v-if="rawAmount > 0" class="clear-btn" @click="clearAmount" type="button">
          <span class="material-symbols-outlined" style="font-size:14px">backspace</span>
          Reset
        </button>
      </div>

      <div class="nominal-display-row">
        <span class="currency-symbol">Rp</span>
        <input
          type="text"
          inputmode="numeric"
          :value="formattedAmount"
          @input="handleAmountInput"
          class="nominal-input tabular-nums"
          placeholder="0"
          id="input-manual-amount"
        />
      </div>

      <!-- Quick Preset Chips -->
      <div class="preset-chips">
        <button
          v-for="p in quickPresets"
          :key="p.label"
          type="button"
          class="preset-chip"
          @click="addAmount(p.val)"
        >
          {{ p.label }}
        </button>
      </div>
    </div>

    <!-- Error Banner -->
    <div v-if="errorMessage" class="error-banner">
      <span class="material-symbols-outlined text-[18px]">error</span>
      <span>{{ errorMessage }}</span>
    </div>

    <!-- Form Details Box -->
    <div class="form-card">
      <h3 class="card-section-title">
        <span class="material-symbols-outlined" style="font-size:18px;color:var(--primary)">receipt_long</span>
        Rincian Transaksi
      </h3>

      <!-- Nama Transaksi -->
      <div class="form-field">
        <label class="field-label">Nama Transaksi / Merchant</label>
        <div class="input-wrap">
          <span class="material-symbols-outlined input-icon">edit_note</span>
          <input
            type="text"
            v-model="name"
            :placeholder="type === 'expense' ? 'Misal: Kopi Kenangan, Sembako' : 'Misal: Gaji Bulanan, Bonus Project'"
            class="text-input"
            id="input-manual-name"
          />
        </div>
      </div>

      <!-- Kategori & Rekening Grid 2 Kolom -->
      <div class="grid-2col">
        <div class="form-field">
          <label class="field-label">Kategori ({{ type === 'expense' ? 'Pengeluaran' : 'Pemasukan' }})</label>
          <div class="select-chip-btn">
            <span class="material-symbols-outlined text-[18px] text-tertiary">
              {{ type === 'expense' ? 'restaurant' : 'payments' }}
            </span>
            <select v-if="availableCategories.length > 0" v-model="category" class="select-hidden" id="select-manual-category">
              <option v-for="cat in availableCategories" :key="cat" :value="cat">
                {{ cat }}
              </option>
            </select>
            <span v-else class="empty-select-hint" @click="isSetupModalOpen = true">
              + Buat Kategori
            </span>
          </div>
        </div>

        <div class="form-field">
          <label class="field-label">Dompet / Rekening</label>
          <div class="select-chip-btn">
            <span class="material-symbols-outlined text-[18px] text-primary">account_balance_wallet</span>
            <select v-if="availableAccounts.length > 0" v-model="account" class="select-hidden" id="select-manual-account">
              <option v-for="acc in availableAccounts" :key="acc.id || acc.name" :value="acc.name">
                {{ acc.name }} {{ acc.balanceText ? `(${acc.balanceText})` : '' }}
              </option>
            </select>
            <span v-else class="empty-select-hint" @click="isSetupModalOpen = true">
              + Tambah Akun
            </span>
          </div>
        </div>
      </div>

      <!-- Pajak / Tax Amount -->
      <div class="form-field">
        <div class="flex items-center justify-between">
          <label class="field-label !mb-0">Pajak / PPN (Opsional)</label>
          <span class="text-[10px] text-on-surface-variant">Bagian pajak dari total nominal</span>
        </div>
        <div class="input-wrap">
          <span class="material-symbols-outlined input-icon">percent</span>
          <span class="text-xs font-bold text-on-surface-variant ml-0.5">Rp</span>
          <input
            type="text"
            inputmode="numeric"
            :value="formattedTaxAmount"
            @input="handleTaxInput"
            placeholder="0"
            class="text-input tabular-nums"
            id="input-manual-tax"
          />
        </div>
        <span v-if="rawTaxAmount > rawAmount && rawAmount > 0" class="text-[11px] text-error font-medium">
          Pajak tidak boleh melebihi nominal transaksi
        </span>
      </div>

      <!-- Metode Pembayaran (Only if non-cash/non-crypto) -->
      <div v-if="isPaymentMethodApplicable" class="form-field">
        <label class="field-label">Metode Pembayaran</label>
        <div class="pm-chips-grid">
          <button
            v-for="pm in paymentMethodOptions"
            :key="pm.value"
            type="button"
            class="pm-chip-btn"
            :class="{ 'pm-chip-btn--selected': selectedPaymentMethod === pm.value }"
            @click="selectedPaymentMethod = pm.value"
          >
            <span class="material-symbols-outlined text-[15px]">{{ pm.icon }}</span>
            <span>{{ pm.label }}</span>
          </button>
        </div>
      </div>

      <!-- Tanggal & Catatan -->
      <div class="grid-2col">
        <div class="form-field">
          <label class="field-label">Tanggal Transaksi</label>
          <div class="input-wrap">
            <span class="material-symbols-outlined input-icon">calendar_today</span>
            <input type="date" v-model="dateVal" class="text-input" style="font-size:13px" />
          </div>
        </div>

        <div class="form-field">
          <label class="field-label">Catatan (Opsional)</label>
          <div class="input-wrap">
            <span class="material-symbols-outlined input-icon">sticky_note_2</span>
            <input type="text" v-model="note" placeholder="Keterangan..." class="text-input" />
          </div>
        </div>
      </div>
    </div>

    <!-- Alokasi Dana ("Siapa yang bayar?") -->
    <div class="owner-section">
      <div class="owner-header">
        <span class="owner-title">Penanggung Jawab / Sumber</span>
        <span class="owner-sub">{{ hasPartner ? 'Pilih pemilik transaksi' : 'Transaksi Pribadi' }}</span>
      </div>

      <div class="owner-grid" :class="{ 'owner-grid--single': !hasPartner }">
        <!-- Suami button (shown if userRole is suami) -->
        <button
          v-if="userRole === 'suami'"
          type="button"
          class="owner-card-btn"
          :class="{ 'owner-card-btn--suami': owner === 'suami' }"
          @click="owner = 'suami'"
        >
          <div class="avatar-badge avatar-badge--suami">S</div>
          <span>Suami</span>
        </button>

        <!-- Istri button (shown if userRole is istri) -->
        <button
          v-if="userRole === 'istri'"
          type="button"
          class="owner-card-btn"
          :class="{ 'owner-card-btn--istri': owner === 'istri' }"
          @click="owner = 'istri'"
        >
          <div class="avatar-badge avatar-badge--istri">I</div>
          <span>Istri</span>
        </button>

        <!-- Sendiri button (shown if userRole is single) -->
        <button
          v-if="userRole === 'single'"
          type="button"
          class="owner-card-btn"
          :class="{ 'owner-card-btn--sendiri': owner === 'sendiri' }"
          @click="owner = 'sendiri'"
        >
          <div class="avatar-badge avatar-badge--sendiri">
            <span class="material-symbols-outlined text-[18px]">person</span>
          </div>
          <span>Sendiri</span>
        </button>

        <!-- Bersama button (shown ONLY if hasPartner is true) -->
        <button
          v-if="hasPartner"
          type="button"
          class="owner-card-btn"
          :class="{ 'owner-card-btn--bersama': owner === 'bersama' }"
          @click="owner = 'bersama'"
        >
          <div class="avatar-badge avatar-badge--bersama">
            <span class="material-symbols-outlined text-[18px]">group</span>
          </div>
          <span>Bersama</span>
        </button>
      </div>
    </div>

    <!-- Submit Button -->
    <button
      class="submit-btn"
      id="btn-submit-manual-tx"
      @click="handleSubmit"
      :disabled="isSaving || rawAmount <= 0"
    >
      <span>{{ isSaving ? 'Menyimpan Transaksi...' : 'Simpan Transaksi' }}</span>
      <span class="material-symbols-outlined text-[20px]">check_circle</span>
    </button>

    <!-- Setup Reminder Modal for New Users -->
    <SetupRequiredModal
      :is-open="isSetupModalOpen"
      :has-accounts="dbAccounts.length > 0"
      :has-categories="dbCategories.length > 0"
      @close="isSetupModalOpen = false"
    />

    <!-- Insufficient Balance Warning Modal -->
    <InsufficientBalanceModal
      :is-open="isBalanceModalOpen"
      :account-name="account"
      :current-balance="selectedAccountData?.balance || 0"
      :expense-amount="rawAmount"
      :available-accounts="dbAccounts"
      @close="isBalanceModalOpen = false"
      @switch-account="handleSwitchAccount"
      @proceed-anyway="handleProceedAnyway"
    />

  </div>
</template>

<style scoped>
.transaksi-manual-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 12px;
  padding-bottom: 28px;
}
.px-page { padding-left: 16px; padding-right: 16px; }

.header-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.back-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--surface-container);
  border: none;
  color: var(--on-surface-variant);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
}

.page-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--on-surface);
}

.page-subtitle {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
}

/* Type Switcher Pill */
.type-switcher-pill {
  display: flex;
  background: var(--surface-container-high);
  padding: 4px;
  border-radius: 30px;
  gap: 4px;
}

.pill-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  border-radius: 24px;
  border: none;
  background: transparent;
  font-size: 13px;
  font-weight: 600;
  color: var(--on-surface-variant);
  cursor: pointer;
  transition: all 0.15s ease;
}

.pill-btn--expense {
  background: var(--surface-container-lowest);
  color: var(--expense);
  box-shadow: 0 2px 8px rgba(244, 63, 94, 0.15);
}

.pill-btn--income {
  background: var(--surface-container-lowest);
  color: var(--income);
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.15);
}

/* Pending Bills Quick Selector */
.pending-bills-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: var(--surface-container-lowest);
  border: 1px solid var(--outline-variant);
  border-radius: 18px;
  padding: 10px 12px;
}

.pending-bills-scroll {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.bill-select-chip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 12px;
  background: var(--surface-container-low);
  border: 1px solid var(--outline-variant);
  color: var(--on-surface);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.bill-select-chip:hover {
  background: var(--surface-container);
}

.bill-select-chip--selected {
  background: #EEF2FF;
  border-color: #6366F1;
  color: #4338CA;
  box-shadow: 0 0 0 1px #6366F1;
}

.chip-name {
  max-width: 110px;
}

.chip-badge {
  font-size: 9px;
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--surface-container);
  color: var(--muted);
}

.chip-badge--urgent {
  background: #FEF3C7;
  color: #92400E;
  font-weight: 700;
}

.chip-amount {
  font-size: 11px;
}

.selected-bill-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  border-radius: 10px;
  background: #EEF2FF;
  border: 1px solid #C7D2FE;
  margin-top: 2px;
}

.clear-bill-btn {
  background: none;
  border: none;
  color: #6366F1;
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
}

/* M-Banking Nominal Hero Card */
.nominal-hero-card {
  border-radius: 24px;
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  transition: all 0.2s ease;
}

.nominal-hero-card--expense {
  background: linear-gradient(135deg, color-mix(in srgb, var(--expense) 8%, var(--surface-container-lowest)) 0%, var(--surface-container-lowest) 100%);
  border: 1.5px solid color-mix(in srgb, var(--expense) 25%, transparent);
}

.nominal-hero-card--income {
  background: linear-gradient(135deg, color-mix(in srgb, var(--income) 8%, var(--surface-container-lowest)) 0%, var(--surface-container-lowest) 100%);
  border: 1.5px solid color-mix(in srgb, var(--income) 25%, transparent);
}

.nominal-hero-top {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.nominal-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
}

.clear-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  background: color-mix(in srgb, var(--error) 10%, transparent);
  color: var(--error);
  border: none;
  border-radius: 12px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

.nominal-display-row {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 6px;
  width: 100%;
}

.currency-symbol {
  font-size: 22px;
  font-weight: 700;
  color: var(--on-surface-variant);
}

.nominal-input {
  width: 100%;
  max-width: 260px;
  background: transparent;
  border: none;
  outline: none;
  font-size: 36px;
  font-weight: 800;
  text-align: center;
  color: var(--on-surface);
  font-family: inherit;
  letter-spacing: -0.02em;
}

.nominal-hero-card--expense .nominal-input { color: var(--expense); }
.nominal-hero-card--income .nominal-input { color: var(--income); }

/* Error Banner */
.error-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fee2e2;
  color: #991b1b;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
}

/* Preset Chips */
.preset-chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: center;
  width: 100%;
  padding-top: 4px;
}

.preset-chip {
  padding: 6px 12px;
  border-radius: 16px;
  background: var(--surface-container-high);
  border: 1px solid var(--outline-variant);
  color: var(--on-surface);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}
.preset-chip:hover {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}
.preset-chip:active {
  transform: scale(0.94);
}

/* Form Card */
.form-card {
  background: var(--surface-container-lowest);
  border-radius: 20px;
  padding: 18px 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.card-section-title {
  margin: 0 0 2px;
  font-size: 14px;
  font-weight: 700;
  color: var(--on-surface);
  display: flex;
  align-items: center;
  gap: 6px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--on-surface-variant);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.input-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--surface-container-low);
  padding: 12px 14px;
  border-radius: 14px;
}

.input-icon {
  color: var(--muted);
  font-size: 20px;
  flex-shrink: 0;
}

.text-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  color: var(--on-surface);
  font-family: inherit;
  width: 100%;
}

.grid-2col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.select-chip-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--surface-container-low);
  padding: 10px 12px;
  border-radius: 14px;
  position: relative;
  min-height: 42px;
}

.select-hidden {
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
  font-weight: 600;
  color: var(--on-surface);
  width: 100%;
  font-family: inherit;
  cursor: pointer;
}

.empty-select-hint {
  font-size: 12px;
  font-weight: 700;
  color: var(--primary);
  cursor: pointer;
}

/* Owner section */
.owner-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.owner-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px;
}

.owner-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--on-surface);
}

.owner-sub {
  font-size: 11px;
  color: var(--muted);
}

.owner-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.owner-grid--single {
  grid-template-columns: 1fr;
}

.owner-card-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 14px 8px;
  border-radius: 16px;
  border: 1px solid var(--outline-variant);
  background: var(--surface-container-lowest);
  color: var(--on-surface-variant);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  gap: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  transition: all 0.15s ease;
}

.avatar-badge {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  color: white;
}
.avatar-badge--suami { background: var(--suami); }
.avatar-badge--istri { background: var(--istri); }
.avatar-badge--bersama { background: var(--primary); }
.avatar-badge--sendiri { background: #6366f1; }

.owner-card-btn--suami {
  border-color: var(--suami);
  background: color-mix(in srgb, var(--suami) 12%, transparent);
  color: var(--suami);
}

.owner-card-btn--istri {
  border-color: var(--istri);
  background: color-mix(in srgb, var(--istri) 12%, transparent);
  color: var(--istri);
}

.owner-card-btn--bersama {
  border-color: var(--primary);
  background: color-mix(in srgb, var(--primary) 12%, transparent);
  color: var(--primary);
}

.owner-card-btn--sendiri {
  border-color: #6366f1;
  background: color-mix(in srgb, #6366f1 12%, transparent);
  color: #6366f1;
}

.submit-btn {
  width: 100%;
  padding: 16px;
  border-radius: 28px;
  background: linear-gradient(90deg, var(--primary), var(--secondary));
  color: white;
  font-size: 15px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 4px 16px rgba(70, 72, 212, 0.35);
  transition: transform 0.15s;
  margin-top: 4px;
}
.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}
.submit-btn:not(:disabled):active { transform: scale(0.98); }

/* Payment method chips */
.pm-chips-grid {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 2px 2px 6px;
}
.pm-chip-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 12px;
  background: var(--surface-container-low);
  border: 1px solid var(--outline-variant);
  color: var(--on-surface-variant);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
  flex-shrink: 0;
}
.pm-chip-btn:hover {
  background: var(--surface-container);
}
.pm-chip-btn--selected {
  background: color-mix(in srgb, var(--primary) 12%, transparent);
  border-color: var(--primary);
  color: var(--primary);
  box-shadow: 0 0 0 1px var(--primary);
}
</style>
