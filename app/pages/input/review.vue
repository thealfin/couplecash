<script setup lang="ts">
definePageMeta({ layout: 'app' })
useHead({ title: 'Review Hasil Scan AI — CoupleCash' })

const router = useRouter()
const route = useRoute()
const { getAuthToken, currentUser, hasPartner } = useAuth()
const { getReceiptFromCache } = useReceiptCache()

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

const userRole = computed<'suami' | 'istri' | 'single'>(() => (currentUser.value?.role as any) || 'suami')

const type = ref<'expense' | 'income'>('expense')
const name = ref((route.query.merchant as string) || '')
const rawAmount = ref<number>(0)
const rawSubtotal = ref<number>(0)
const rawDiscount = ref<number>(0)
const rawTaxAmount = ref<number>(0)
const rawServiceCharge = ref<number>(0)
const dateVal = ref((route.query.date as string) || new Date().toISOString().split('T')[0])
const note = ref('')
const owner = ref<'suami' | 'istri' | 'bersama' | 'sendiri'>('suami')
const receiptObjectKey = ref((route.query.objectKey as string) || '')

// Payment method
const selectedPaymentMethod = ref<string>('QRIS')
const paymentMethodOptions = [
  { value: 'QRIS', label: 'QRIS', icon: 'qr_code_scanner' },
  { value: 'DEBIT_CARD', label: 'Kartu Debit', icon: 'credit_card' },
  { value: 'CREDIT_CARD', label: 'Kartu Kredit', icon: 'credit_card' },
  { value: 'BANK_TRANSFER', label: 'Transfer Bank', icon: 'account_balance' },
  { value: 'VIRTUAL_ACCOUNT', label: 'VA', icon: 'vpn_key' },
]

const formattedTaxAmount = computed(() => {
  if (!rawTaxAmount.value || rawTaxAmount.value === 0) return '0'
  return rawTaxAmount.value.toLocaleString('id-ID')
})

function handleTaxInput(e: Event) {
  const input = e.target as HTMLInputElement
  const clean = input.value.replace(/\D/g, '')
  rawTaxAmount.value = clean ? parseInt(clean, 10) : 0
}

watch(
  userRole,
  (role) => {
    if (role === 'single') {
      owner.value = 'sendiri'
    } else if (role) {
      owner.value = role
    }
  },
  { immediate: true }
)

const cachedReceiptData = ref<any>(null)
const receiptImagePreview = ref<string>('')
const confidenceScore = ref<number>(0.92)
const showImageModal = ref(false)

const dbCategories = ref<CategoryItem[]>([])
const dbAccounts = ref<AccountItem[]>([])
const isLoadingData = ref(true)
const isSaving = ref(false)
const errorMessage = ref('')

// Modals
const isSetupModalOpen = ref(false)
const isBalanceModalOpen = ref(false)
const bypassBalanceWarning = ref(false)

const availableCategories = computed(() => {
  return dbCategories.value.filter(c => c.type === type.value).map(c => c.name)
})

const availableAccounts = computed(() => {
  return dbAccounts.value
})

const category = ref((route.query.category as string) || '')
const account = ref('')

const selectedAccountData = computed(() => {
  return dbAccounts.value.find(a => a.name === account.value)
})

const isPaymentMethodApplicable = computed(() => {
  if (!selectedAccountData.value) return false
  const t = selectedAccountData.value.accountType
  return t !== 'cash' && t !== 'crypto'
})

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

onMounted(async () => {
  // 1. Parse query amount if passed
  const qAmount = route.query.amount
  if (qAmount) {
    rawAmount.value = typeof qAmount === 'string' ? parseInt(qAmount, 10) || 0 : Number(qAmount) || 0
  }
  if (route.query.subtotal) rawSubtotal.value = Number(route.query.subtotal) || 0
  if (route.query.discount) rawDiscount.value = Number(route.query.discount) || 0
  if (route.query.taxAmount) rawTaxAmount.value = Number(route.query.taxAmount) || 0
  if (route.query.serviceCharge) rawServiceCharge.value = Number(route.query.serviceCharge) || 0
  if (route.query.paymentMethod) selectedPaymentMethod.value = String(route.query.paymentMethod)

  // 2. Load from local receipt cache if receiptId is provided
  const receiptId = route.query.receiptId as string
  if (receiptId) {
    const cached = await getReceiptFromCache(receiptId)
    if (cached) {
      cachedReceiptData.value = cached
      receiptImagePreview.value = cached.base64
      if (cached.r2ObjectKey && !receiptObjectKey.value) {
        receiptObjectKey.value = cached.r2ObjectKey
      }
      if (cached.aiData) {
        if (!name.value && cached.aiData.merchant) name.value = cached.aiData.merchant
        if (rawAmount.value === 0 && cached.aiData.amount) rawAmount.value = Number(cached.aiData.amount)
        if (cached.aiData.suggested_category) category.value = cached.aiData.suggested_category
        if (cached.aiData.date) {
          const parsedYear = parseInt(cached.aiData.date.split('-')[0], 10)
          const currentYear = new Date().getFullYear()
          if (!isNaN(parsedYear) && parsedYear >= currentYear) {
            dateVal.value = cached.aiData.date
          } else {
            dateVal.value = new Date().toISOString().split('T')[0]
          }
        }
        if (cached.aiData.confidence) confidenceScore.value = cached.aiData.confidence
        if (cached.aiData.subtotal && !rawSubtotal.value) rawSubtotal.value = Number(cached.aiData.subtotal)
        if (cached.aiData.discount && !rawDiscount.value) rawDiscount.value = Number(cached.aiData.discount)
        if (cached.aiData.tax_amount && !rawTaxAmount.value) rawTaxAmount.value = Number(cached.aiData.tax_amount)
        if (cached.aiData.service_charge && !rawServiceCharge.value) rawServiceCharge.value = Number(cached.aiData.service_charge)
        if (cached.aiData.payment_method) selectedPaymentMethod.value = cached.aiData.payment_method
      }
    }
  }

  // 3. Fetch Realtime DB categories & accounts
  await loadFormData()
})

async function loadFormData() {
  try {
    isLoadingData.value = true
    const token = await getAuthToken()
    const headers = token ? { Authorization: `Bearer ${token}` } : {}

    const [catRes, accRes]: [any, any] = await Promise.all([
      $fetch('/api/categories', { headers, query: { onlyActive: 'true' } }).catch(() => null),
      $fetch('/api/accounts', { headers, query: { onlyActive: 'true' } }).catch(() => null),
    ])

    if (catRes?.success && Array.isArray(catRes.categories)) {
      dbCategories.value = catRes.categories
    } else {
      dbCategories.value = []
    }

    if (accRes?.success && Array.isArray(accRes.accounts)) {
      dbAccounts.value = accRes.accounts
      if (dbAccounts.value.length > 0) {
        account.value = dbAccounts.value[0].name
      }
    } else {
      dbAccounts.value = []
    }

    // Check empty state
    if (dbAccounts.value.length === 0 || dbCategories.value.length === 0) {
      isSetupModalOpen.value = true
    }

    // Match category if suggested by AI
    const qCategory = route.query.category as string
    if (qCategory) {
      const match = availableCategories.value.find(c => c.toLowerCase().includes(qCategory.toLowerCase()))
      if (match) {
        category.value = match
      }
    } else if (availableCategories.value.length > 0 && !category.value) {
      category.value = availableCategories.value[0]
    }
  } catch (e) {
    console.warn('[review.vue] Error loading realtime categories/accounts:', e)
  } finally {
    isLoadingData.value = false
  }
}

watch(type, () => {
  const currentAvailable = availableCategories.value
  if (currentAvailable.length > 0) {
    category.value = currentAvailable[0]
  } else {
    category.value = ''
  }
})

function handleSwitchAccount(newAccountName: string) {
  account.value = newAccountName
  isBalanceModalOpen.value = false
}

function handleProceedAnyway() {
  bypassBalanceWarning.value = true
  isBalanceModalOpen.value = false
  saveTransaction()
}

async function saveTransaction() {
  // Prevent double submit
  if (isSaving.value) return

  // Empty data check
  if (dbAccounts.value.length === 0 || dbCategories.value.length === 0) {
    isSetupModalOpen.value = true
    return
  }

  if (rawAmount.value <= 0) {
    errorMessage.value = 'Nominal harus lebih dari 0'
    return
  }

  if (rawTaxAmount.value > rawAmount.value) {
    errorMessage.value = 'Pajak tidak boleh lebih besar dari total nominal'
    return
  }

  // Insufficient Balance check
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
        taxAmount: rawTaxAmount.value,
        paymentMethod: isPaymentMethodApplicable.value ? selectedPaymentMethod.value : null,
        name: name.value.trim() || (type.value === 'income' ? 'Pemasukan' : 'Struk Belanja'),
        categoryName: category.value,
        accountName: account.value,
        accountId: selectedAccountData.value?.id,
        transactionDate: dateVal.value,
        note: note.value.trim(),
        ownerType: owner.value,
        source: 'ai_scan',
        receiptObjectKey: receiptObjectKey.value || null,
      },
    })

    if (res.success) {
      await router.push('/beranda')
    }
  } catch (err: any) {
    console.error('[review.vue] Save error:', err)
    errorMessage.value = err?.data?.statusMessage || err?.message || 'Gagal menyimpan transaksi'
  } finally {
    isSaving.value = false
    bypassBalanceWarning.value = false
  }
}

function repeatScan() {
  router.push('/input/kamera')
}
</script>

<template>
  <div class="review-page animate-fade-in px-page">

    <!-- Top Header -->
    <div class="header-row">
      <button class="back-btn" @click="router.back()" aria-label="Kembali">
        <span class="material-symbols-outlined">arrow_back</span>
      </button>
      <div>
        <h1 class="page-title">Review Hasil Scan AI</h1>
        <p class="page-subtitle">Verifikasi dan sesuaikan hasil ekstraksi nota</p>
      </div>
    </div>

    <!-- AI Scan Banner Card with Receipt Thumbnail -->
    <div class="ai-banner-card">
      <div class="ai-banner-content">
        <!-- Thumbnail Foto Struk (Bisa di-klik untuk zoom) -->
        <div class="receipt-thumb-wrap" v-if="receiptImagePreview" @click="showImageModal = true">
          <img :src="receiptImagePreview" alt="Foto Struk" class="receipt-thumb-img" />
          <div class="receipt-zoom-badge">
            <span class="material-symbols-outlined" style="font-size:12px">zoom_in</span>
          </div>
        </div>

        <div class="ai-banner-info">
          <div class="ai-badge-row">
            <span class="ai-pill">
              <span class="material-symbols-outlined text-[13px]">auto_awesome</span>
              Gemini Vision
            </span>
            <span class="confidence-pill" v-if="confidenceScore">
              Akurasi {{ Math.round(confidenceScore * 100) }}%
            </span>
          </div>
          <p class="ai-banner-desc">Data berhasil diekstraksi dari foto nota Anda.</p>
        </div>
      </div>

      <!-- Action mini repeat scan -->
      <button class="repeat-scan-btn" @click="repeatScan" type="button">
        <span class="material-symbols-outlined text-[14px]">photo_camera</span>
        Foto Ulang
      </button>
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

    <!-- M-Banking Hero Nominal Card -->
    <div class="nominal-hero-card" :class="type === 'expense' ? 'nominal-hero-card--expense' : 'nominal-hero-card--income'">
      <div class="nominal-hero-top">
        <span class="nominal-label">Total Nominal {{ type === 'expense' ? 'Pengeluaran' : 'Pemasukan' }}</span>
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
          id="input-review-amount"
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

      <!-- Nama Transaksi / Merchant -->
      <div class="form-field">
        <label class="field-label">Nama Merchant / Transaksi</label>
        <div class="input-wrap">
          <span class="material-symbols-outlined input-icon">storefront</span>
          <input
            type="text"
            v-model="name"
            placeholder="Misal: Indomaret, Starbucks, Kopi Kenangan"
            class="text-input"
            id="input-review-merchant"
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
            <select v-if="availableCategories.length > 0" v-model="category" class="select-hidden" id="select-review-category">
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
            <select v-if="availableAccounts.length > 0" v-model="account" class="select-hidden" id="select-review-account">
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

      <!-- Breakdown Rincian Belanja Struk -->
      <div class="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-2.5">
        <span class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Rincian Nominal Struk</span>
        
        <div class="flex items-center justify-between text-xs">
          <span class="text-on-surface-variant">Subtotal Belanja</span>
          <span class="font-bold text-on-surface tabular-nums">Rp {{ (rawSubtotal || rawAmount).toLocaleString('id-ID') }}</span>
        </div>

        <div v-if="rawDiscount > 0" class="flex items-center justify-between text-xs">
          <span class="text-on-surface-variant">Diskon Toko</span>
          <span class="font-bold text-income tabular-nums">-Rp {{ rawDiscount.toLocaleString('id-ID') }}</span>
        </div>

        <!-- NEW: tax_amount -->
        <div class="flex items-center justify-between text-xs bg-surface-container/70 p-2 rounded-xl border border-outline-variant/20">
          <div class="flex items-center gap-1.5">
            <span class="font-semibold text-on-surface">Pajak (Tax / PPN)</span>
            <span class="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">tax_amount</span>
          </div>
          <div class="flex items-center gap-1">
            <span class="text-xs text-muted">Rp</span>
            <input
              type="text"
              inputmode="numeric"
              :value="formattedTaxAmount"
              @input="handleTaxInput"
              class="w-24 text-right font-bold text-xs bg-surface-container rounded-lg px-1.5 py-1 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary tabular-nums"
              placeholder="0"
              id="input-review-tax"
            />
          </div>
        </div>
        <span v-if="rawTaxAmount > rawAmount && rawAmount > 0" class="text-[10px] text-error font-medium">
          Pajak tidak boleh melebihi grand total transaksi
        </span>

        <div v-if="rawServiceCharge > 0" class="flex items-center justify-between text-xs">
          <span class="text-on-surface-variant">Biaya Layanan (Service Charge)</span>
          <span class="font-bold text-on-surface tabular-nums">Rp {{ rawServiceCharge.toLocaleString('id-ID') }}</span>
        </div>
      </div>

      <!-- Metode Pembayaran (Only shown if non-cash/non-crypto) -->
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

    <!-- Submit Action Button -->
    <div class="actions-footer">
      <button
        class="submit-btn"
        id="btn-save-reviewed-tx"
        @click="saveTransaction"
        :disabled="isSaving || rawAmount <= 0"
      >
        <span>{{ isSaving ? 'Menyimpan ke Pembukuan...' : 'Simpan Transaksi ke Pembukuan' }}</span>
        <span class="material-symbols-outlined text-[20px]">check_circle</span>
      </button>
    </div>

    <!-- Modal Zoom Foto Struk -->
    <Teleport to="body">
      <div v-if="showImageModal" class="image-modal-backdrop" @click.self="showImageModal = false">
        <div class="image-modal-box">
          <button class="image-modal-close" @click="showImageModal = false">
            <span class="material-symbols-outlined">close</span>
          </button>
          <img :src="receiptImagePreview" alt="Foto Struk Full" class="image-modal-full" />
        </div>
      </div>
    </Teleport>

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
.review-page {
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

/* AI Banner Card */
.ai-banner-card {
  background: linear-gradient(135deg, rgba(70, 72, 212, 0.08) 0%, rgba(99, 102, 241, 0.04) 100%);
  border: 1px solid rgba(70, 72, 212, 0.2);
  border-radius: 20px;
  padding: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.ai-banner-content {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.receipt-thumb-wrap {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  cursor: pointer;
  border: 1.5px solid var(--primary);
  flex-shrink: 0;
}

.receipt-thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.receipt-zoom-badge {
  position: absolute;
  bottom: 2px;
  right: 2px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  border-radius: 4px;
  padding: 1px 3px;
  display: flex;
  align-items: center;
}

.ai-banner-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.ai-badge-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.ai-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--primary);
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.confidence-pill {
  font-size: 10px;
  font-weight: 600;
  color: var(--income);
  background: color-mix(in srgb, var(--income) 12%, transparent);
  padding: 2px 6px;
  border-radius: 8px;
}

.ai-banner-desc {
  margin: 0;
  font-size: 11px;
  color: var(--muted);
}

.repeat-scan-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border-radius: 12px;
  background: var(--surface-container-highest);
  border: none;
  font-size: 11px;
  font-weight: 600;
  color: var(--on-surface-variant);
  cursor: pointer;
  flex-shrink: 0;
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

/* Actions footer */
.actions-footer {
  margin-top: 4px;
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
}
.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}
.submit-btn:not(:disabled):active { transform: scale(0.98); }

/* Image Modal */
.image-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(6px);
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.image-modal-box {
  position: relative;
  max-width: 90vw;
  max-height: 85vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-modal-full {
  max-width: 100%;
  max-height: 80vh;
  border-radius: 16px;
  object-fit: contain;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}

.image-modal-close {
  position: absolute;
  top: -44px;
  right: 0;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

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
