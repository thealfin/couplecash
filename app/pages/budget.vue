<script setup lang="ts">
definePageMeta({ layout: 'app' })
useHead({ title: 'Budget — CoupleCash' })

const router = useRouter()
const { getAuthToken, currentUser, hasPartner } = useAuth()
const userRole = computed<'suami' | 'istri'>(() => currentUser.value?.role || 'suami')
const token = await getAuthToken()
const authHeaders = token ? { Authorization: `Bearer ${token}` } : {}

const { data, refresh: refreshBudgets, pending } = await useFetch<any>('/api/budgets', { headers: authHeaders })
const { data: coupleData } = await useFetch<any>('/api/users/couple', { headers: authHeaders })
const { data: catData } = await useFetch<any>('/api/categories', { headers: authHeaders })

async function fetchBudgetData() {
  try {
    const t = await getAuthToken()
    const headers = t ? { Authorization: `Bearer ${t}` } : {}
    const [bRes, cRes, catRes] = await Promise.all([
      $fetch<any>('/api/budgets', { headers }).catch(() => null),
      $fetch<any>('/api/users/couple', { headers }).catch(() => null),
      $fetch<any>('/api/categories', { headers }).catch(() => null),
    ])
    if (bRes) data.value = bRes
    if (cRes) coupleData.value = cRes
    if (catRes) catData.value = catRes
  } catch (err) {
    console.error('[budget] fetch error:', err)
  }
}

const budgetList = computed(() => data.value?.budgets ?? [])
const totalUsed = computed(() => data.value?.totalUsedText ?? 'Rp 0')
const totalRemaining = computed(() => data.value?.totalRemainingText ?? 'Rp 0')
const totalLimit = computed(() => data.value?.totalLimitText ?? 'Rp 0')
const totalPct = computed(() => data.value?.totalPct ?? 0)

const suamiName = computed(() => coupleData.value?.suami?.firstName ?? 'Suami')
const istriName = computed(() => coupleData.value?.istri?.firstName ?? 'Istri')

const availableCategories = computed(() => {
  const all = catData.value?.categories ?? []
  return all.filter((c: any) => c.type === 'expense' && c.is_active !== false)
})

// ── Modals & Action Menu State ──
const showCreateModal = ref(false)
const showDetailModal = ref(false)
const isSubmitting = ref(false)
const editingBudgetId = ref<string | null>(null)
const selectedBudget = ref<any>(null)
const activeMenuBudgetId = ref<string | null>(null)
const submitError = ref('')

const form = reactive({
  name: '',
  categoryId: '',
  ownerType: 'bersama' as 'suami' | 'istri' | 'bersama',
  periodType: 'bulanan' as 'mingguan' | 'bulanan' | 'berkala',
  limitAmount: '',
  periodStart: new Date().toISOString().split('T')[0],
  periodEnd: (() => {
    const d = new Date()
    d.setMonth(d.getMonth() + 1)
    d.setDate(0)
    return d.toISOString().split('T')[0]
  })(),
})

watch(
  userRole,
  (role) => {
    if (role) form.ownerType = role
  },
  { immediate: true }
)

const ownerOptions = computed(() => {
  const opts = []
  if (userRole.value === 'suami') {
    opts.push({ key: 'suami', label: suamiName.value || 'Suami' })
  }
  if (userRole.value === 'istri') {
    opts.push({ key: 'istri', label: istriName.value || 'Istri' })
  }
  if (hasPartner.value) {
    opts.push({ key: 'bersama', label: 'Bersama' })
  }
  return opts
})

function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/beranda')
  }
}

function openCreateModal() {
  closeCardMenu()
  editingBudgetId.value = null
  form.name = ''
  form.categoryId = availableCategories.value[0]?.id || ''
  form.limitAmount = ''
  form.periodType = 'bulanan'
  form.periodStart = new Date().toISOString().split('T')[0]
  
  const d = new Date()
  d.setMonth(d.getMonth() + 1)
  d.setDate(0)
  form.periodEnd = d.toISOString().split('T')[0]
  
  submitError.value = ''
  showCreateModal.value = true
}

function openEditModal(item: any) {
  closeCardMenu()
  editingBudgetId.value = item.id
  form.name = item.name || ''
  form.categoryId = item.categoryId || availableCategories.value.find((c: any) => c.name === item.name)?.id || ''
  form.ownerType = item.owners?.[0] || 'bersama'
  form.periodType = item.periodType || 'bulanan'
  form.limitAmount = String(item.limit)
  form.periodStart = item.periodStart || new Date().toISOString().split('T')[0]
  form.periodEnd = item.periodEnd || new Date().toISOString().split('T')[0]
  submitError.value = ''
  showCreateModal.value = true
}

function openDetailModal(item: any) {
  closeCardMenu()
  selectedBudget.value = item
  showDetailModal.value = true
}

function toggleCardMenu(id: string, e: Event) {
  e.stopPropagation()
  if (activeMenuBudgetId.value === id) {
    activeMenuBudgetId.value = null
  } else {
    activeMenuBudgetId.value = id
  }
}

function closeCardMenu() {
  activeMenuBudgetId.value = null
}

async function saveBudget() {
  const numericLimit = Number(form.limitAmount)
  if (!numericLimit || numericLimit <= 0) {
    submitError.value = 'Batas limit budget harus lebih dari 0'
    return
  }
  if (!form.categoryId) {
    submitError.value = 'Pilih kategori budget'
    return
  }

  isSubmitting.value = true
  submitError.value = ''

  try {
    const payload = {
      name: form.name.trim() || undefined,
      categoryId: form.categoryId,
      ownerType: form.ownerType,
      periodType: form.periodType,
      limitAmount: numericLimit,
      periodStart: form.periodStart,
      periodEnd: form.periodEnd,
    }

    const t = await getAuthToken()
    const headers = t ? { Authorization: `Bearer ${t}` } : {}

    if (editingBudgetId.value) {
      await $fetch(`/api/budgets/${editingBudgetId.value}`, {
        method: 'PUT',
        headers,
        body: payload,
      })
    } else {
      await $fetch('/api/budgets', {
        method: 'POST',
        headers,
        body: payload,
      })
    }

    showCreateModal.value = false
    await fetchBudgetData()
  } catch (err: any) {
    submitError.value = err?.statusMessage || err?.message || 'Gagal menyimpan budget'
  } finally {
    isSubmitting.value = false
  }
}

async function deleteBudget(budgetId: string) {
  closeCardMenu()
  if (!confirm('Apakah Anda yakin ingin menghapus pos Budget ini?')) return

  try {
    const t = await getAuthToken()
    const headers = t ? { Authorization: `Bearer ${t}` } : {}
    await $fetch(`/api/budgets/${budgetId}`, {
      method: 'DELETE',
      headers,
    })
    if (selectedBudget.value?.id === budgetId) {
      showDetailModal.value = false
    }
    await fetchBudgetData()
  } catch (err: any) {
    alert(err?.statusMessage || 'Gagal menghapus budget')
  }
}

onMounted(async () => {
  if (typeof window !== 'undefined') {
    window.addEventListener('click', closeCardMenu)
  }
  await fetchBudgetData()
})

watch(
  currentUser,
  (user) => {
    if (user) {
      fetchBudgetData()
    }
  },
  { immediate: true }
)

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('click', closeCardMenu)
  }
})
</script>

<template>
  <div class="budget-page px-3 max-w-[520px] mx-auto animate-fade-in pb-16 pt-2">
    <!-- Standalone Header with Back Button -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2.5">
        <button
          type="button"
          class="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface hover:bg-surface-variant transition-colors"
          @click="goBack"
          aria-label="Kembali"
        >
          <span class="material-symbols-outlined text-[20px]">arrow_back</span>
        </button>
        <div>
          <h1 class="text-xl font-bold text-on-surface leading-tight">Budget Bulanan</h1>
          <p class="text-xs text-muted">{{ hasPartner ? 'Kelola batas pengeluaran keluarga berdua' : 'Kelola batas pengeluaran pribadi' }}</p>
        </div>
      </div>
      <button
        type="button"
        class="px-3.5 py-1.5 rounded-xl bg-primary text-white text-xs font-bold shadow-md shadow-primary/25 hover:bg-primary-container active:scale-95 transition-all flex items-center gap-1.5"
        @click="openCreateModal"
      >
        <span class="material-symbols-outlined text-[16px]">add</span>
        <span>Tambah</span>
      </button>
    </div>

    <!-- Summary Card -->
    <div class="bg-gradient-to-br from-primary via-[#4f46e5] to-secondary rounded-2xl p-5 text-white shadow-xl shadow-primary/20 mb-5 relative overflow-hidden">
      <div class="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
      <div class="relative z-10 flex flex-col gap-3">
        <div class="flex justify-between items-start">
          <div>
            <span class="text-[11px] uppercase tracking-wider text-primary-fixed font-semibold opacity-90">Total Pemakaian Budget</span>
            <div class="text-[26px] font-bold text-white tracking-tight tabular-nums">{{ totalUsed }}</div>
          </div>
          <div class="bg-white/15 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold border border-white/20">
            {{ totalPct }}% Terpakai
          </div>
        </div>

        <div class="w-full h-2.5 bg-black/25 rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-500"
            :class="totalPct >= 90 ? 'bg-rose-400' : totalPct >= 70 ? 'bg-amber-400' : 'bg-emerald-400'"
            :style="{ width: totalPct + '%' }"
          ></div>
        </div>

        <div class="flex justify-between items-center text-xs text-primary-fixed pt-0.5">
          <span>Sisa: <strong class="text-white">{{ totalRemaining }}</strong></span>
          <span>Batas: <strong class="text-white">{{ totalLimit }}</strong></span>
        </div>
      </div>
    </div>

    <!-- Budget List Section -->
    <div class="flex flex-col gap-3">
      <div class="flex items-center justify-between px-1">
        <h2 class="text-base font-bold text-on-surface">Daftar Pos Budget</h2>
        <span class="text-xs text-muted font-medium">{{ budgetList.length }} Pos Aktif</span>
      </div>

      <div v-if="budgetList.length > 0" class="flex flex-col gap-3">
        <article
          v-for="item in budgetList"
          :key="item.id"
          class="bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-outline-variant/30 flex flex-col gap-3 relative"
        >
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-3">
              <div class="w-11 h-11 rounded-xl bg-surface-container-low flex items-center justify-center text-primary border border-outline-variant/20">
                <span class="material-symbols-outlined text-[22px]">{{ item.icon }}</span>
              </div>
              <div>
                <h3 class="text-sm font-bold text-on-surface leading-snug">{{ item.name }}</h3>
                <p v-if="item.categoryName && item.categoryName !== item.name" class="text-[11px] text-muted leading-tight mb-1">
                  Kategori: {{ item.categoryName }}
                </p>
                <div class="flex items-center gap-1.5 mt-0.5">
                  <span
                    v-for="owner in item.owners"
                    :key="owner"
                    class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                    :class="owner === 'suami' ? 'bg-suami/15 text-suami' : owner === 'istri' ? 'bg-istri/15 text-istri' : 'bg-primary/15 text-primary'"
                  >
                    {{ owner }}
                  </span>
                  <span
                    v-if="item.state === 'danger'"
                    class="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold"
                  >
                    Over Budget
                  </span>
                </div>
              </div>
            </div>

            <!-- Three-dot menu -->
            <div class="relative">
              <button
                type="button"
                aria-label="Menu Opsi"
                class="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors"
                @click="toggleCardMenu(item.id, $event)"
              >
                <span class="material-symbols-outlined text-[20px]">more_vert</span>
              </button>

              <div
                v-if="activeMenuBudgetId === item.id"
                class="absolute right-0 top-9 w-36 bg-white rounded-xl shadow-xl border border-outline-variant/30 py-1 z-30 flex flex-col animate-fade-in"
                @click.stop
              >
                <button
                  type="button"
                  class="px-3 py-2 text-left text-xs font-semibold text-on-surface hover:bg-surface-container-low flex items-center gap-2"
                  @click="openDetailModal(item)"
                >
                  <span class="material-symbols-outlined text-[16px] text-primary">visibility</span>
                  Lihat Detail
                </button>
                <button
                  type="button"
                  class="px-3 py-2 text-left text-xs font-semibold text-on-surface hover:bg-surface-container-low flex items-center gap-2"
                  @click="openEditModal(item)"
                >
                  <span class="material-symbols-outlined text-[16px] text-amber-600">edit</span>
                  Edit Budget
                </button>
                <div class="h-px bg-outline-variant/20 my-0.5"></div>
                <button
                  type="button"
                  class="px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                  @click="deleteBudget(item.id)"
                >
                  <span class="material-symbols-outlined text-[16px]">delete</span>
                  Hapus Budget
                </button>
              </div>
            </div>
          </div>

          <!-- Numbers & Progress -->
          <div class="bg-surface-container-low/60 rounded-xl p-3 flex flex-col gap-2">
            <div class="flex items-baseline justify-between">
              <div>
                <span class="text-[11px] text-muted">Terpakai</span>
                <div class="font-bold text-sm text-on-surface tabular-nums">{{ item.usedText }}</div>
              </div>
              <div class="text-right">
                <span class="text-[11px] text-muted">Batas Limit</span>
                <div class="font-bold text-sm text-on-surface tabular-nums">{{ item.limitText }}</div>
              </div>
            </div>

            <div class="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-500"
                :class="item.state === 'danger' ? 'bg-rose-500' : item.state === 'warning' ? 'bg-amber-500' : 'bg-primary'"
                :style="{ width: item.pct + '%' }"
              ></div>
            </div>

            <div class="flex justify-between items-center text-[11px] text-muted">
              <span>{{ item.pct }}% terpakai</span>
              <span>Sisa: <strong class="text-on-surface">{{ item.remainingText }}</strong></span>
            </div>
          </div>
        </article>
      </div>

      <!-- Empty State -->
      <div v-else class="bg-surface-container-lowest rounded-2xl p-6 text-center border border-outline-variant/30 flex flex-col items-center">
        <div class="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2">
          <span class="material-symbols-outlined text-[24px]">savings</span>
        </div>
        <p class="font-bold text-sm text-on-surface">Belum ada Pos Budget</p>
        <p class="text-xs text-muted max-w-[240px] mt-0.5 mb-3">Atur batas alokasi pengeluaran per kategori untuk mengontrol keuangan rumah tangga.</p>
        <button
          type="button"
          class="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold shadow-sm hover:bg-primary-container transition-all"
          @click="openCreateModal"
        >
          + Tambah Budget Baru
        </button>
      </div>
    </div>

    <!-- ── MODAL: CREATE / EDIT BUDGET ── -->
    <div
      v-if="showCreateModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
      @click.self="showCreateModal = false"
    >
      <div class="bg-surface-container-lowest w-full max-w-md rounded-3xl p-5 shadow-2xl border border-outline-variant/30 flex flex-col gap-4 max-h-[90vh] overflow-y-auto hide-scrollbar">
        <div class="flex items-center justify-between pb-2 border-b border-outline-variant/20">
          <div class="flex items-center gap-2">
            <div class="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <span class="material-symbols-outlined text-[20px]">savings</span>
            </div>
            <h3 class="text-base font-bold text-on-surface">
              {{ editingBudgetId ? 'Edit Budget' : 'Tambah Budget Baru' }}
            </h3>
          </div>
          <button
            type="button"
            class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-muted hover:text-on-surface"
            @click="showCreateModal = false"
          >
            <span class="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div v-if="submitError" class="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
          {{ submitError }}
        </div>

        <div class="flex flex-col gap-3">
          <!-- Nama Budget -->
          <div>
            <label class="block text-xs font-semibold text-on-surface mb-1">Nama Budget</label>
            <input
              v-model="form.name"
              type="text"
              placeholder="Contoh: Budget Traveling, Belanja Mingguan"
              class="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/50 bg-surface text-sm font-medium focus:border-primary focus:outline-none"
            />
            <span class="text-[10px] text-muted mt-1 block">
              Sistem akan otomatis membuat 1 kategori turunan khusus untuk budget ini.
            </span>
          </div>

          <!-- Kategori -->
          <div>
            <label class="block text-xs font-semibold text-on-surface mb-1">Kategori Pengeluaran</label>
            <select
              v-model="form.categoryId"
              class="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/50 bg-surface text-sm font-medium focus:border-primary focus:outline-none"
            >
              <option value="" disabled>Pilih Kategori</option>
              <option v-for="c in availableCategories" :key="c.id" :value="c.id">
                {{ c.name }}
              </option>
            </select>
          </div>

          <!-- Pemilik / Alokasi -->
          <div>
            <label class="block text-xs font-semibold text-on-surface mb-1">Untuk Siapa</label>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="opt in ownerOptions"
                :key="opt.key"
                type="button"
                class="py-2 px-1 rounded-xl text-xs font-bold border transition-all text-center"
                :class="form.ownerType === opt.key ? 'bg-primary text-white border-primary shadow-sm' : 'bg-surface border-outline-variant/40 text-on-surface hover:bg-surface-container-low'"
                @click="form.ownerType = opt.key as any"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>

          <!-- Nominal Limit -->
          <div>
            <label class="block text-xs font-semibold text-on-surface mb-1">Batas Limit Bulanan (Rp)</label>
            <input
              v-model="form.limitAmount"
              type="number"
              min="1"
              placeholder="Contoh: 3000000"
              class="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/50 bg-surface text-sm font-semibold focus:border-primary focus:outline-none"
            />
          </div>

          <!-- Periode Start & End -->
          <div class="grid grid-cols-2 gap-2.5">
            <div>
              <label class="block text-xs font-semibold text-on-surface mb-1">Tanggal Mulai</label>
              <input
                v-model="form.periodStart"
                type="date"
                class="w-full px-3 py-2 rounded-xl border border-outline-variant/50 bg-surface text-xs font-medium focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-on-surface mb-1">Tanggal Berakhir</label>
              <input
                v-model="form.periodEnd"
                type="date"
                class="w-full px-3 py-2 rounded-xl border border-outline-variant/50 bg-surface text-xs font-medium focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div class="flex gap-2 pt-2">
          <button
            type="button"
            class="flex-1 py-3 bg-surface-container hover:bg-surface-variant text-on-surface rounded-xl text-xs font-bold transition-all"
            @click="showCreateModal = false"
          >
            Batal
          </button>
          <button
            type="button"
            class="flex-1 py-3 bg-primary text-white rounded-xl text-xs font-bold shadow-md shadow-primary/30 hover:bg-primary-container active:scale-95 transition-all flex items-center justify-center gap-1.5"
            :disabled="isSubmitting"
            @click="saveBudget"
          >
            <span v-if="isSubmitting" class="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
            <span>{{ editingBudgetId ? 'Simpan Perubahan' : 'Buat Budget' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ── MODAL: BUDGET DETAIL ── -->
    <div
      v-if="showDetailModal && selectedBudget"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
      @click.self="showDetailModal = false"
    >
      <div class="bg-surface-container-lowest w-full max-w-md rounded-3xl p-5 shadow-2xl border border-outline-variant/30 flex flex-col gap-4 max-h-[90vh] overflow-y-auto hide-scrollbar">
        <div class="flex items-center justify-between pb-2 border-b border-outline-variant/20">
          <div class="flex items-center gap-2.5">
            <div class="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center text-primary text-xl">
              <span class="material-symbols-outlined">{{ selectedBudget.icon }}</span>
            </div>
            <div>
              <h3 class="text-base font-bold text-on-surface leading-snug">{{ selectedBudget.name }}</h3>
              <span class="text-xs text-muted">Periode {{ selectedBudget.periodType }}</span>
            </div>
          </div>
          <button
            type="button"
            class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-muted hover:text-on-surface"
            @click="showDetailModal = false"
          >
            <span class="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div class="flex flex-col gap-3 text-xs">
          <div class="grid grid-cols-2 gap-2.5">
            <div class="p-3 rounded-xl bg-surface-container-low">
              <span class="text-muted block text-[11px]">Batas Limit</span>
              <strong class="text-sm text-on-surface font-bold">{{ selectedBudget.limitText }}</strong>
            </div>
            <div class="p-3 rounded-xl bg-primary/10">
              <span class="text-primary block text-[11px]">Terpakai</span>
              <strong class="text-sm text-primary font-bold">{{ selectedBudget.usedText }}</strong>
            </div>
          </div>

          <div class="p-3 rounded-xl bg-surface-container-low flex flex-col gap-2">
            <div class="flex justify-between items-center">
              <span class="text-muted">Persentase Terpakai:</span>
              <span class="font-bold text-primary">{{ selectedBudget.pct }}%</span>
            </div>
            <div class="w-full h-2.5 bg-surface-container-highest rounded-full overflow-hidden">
              <div
                class="h-full rounded-full"
                :class="selectedBudget.state === 'danger' ? 'bg-rose-500' : 'bg-primary'"
                :style="{ width: selectedBudget.pct + '%' }"
              ></div>
            </div>
            <div class="flex justify-between text-muted text-[11px]">
              <span>Sisa Alokasi: <strong class="text-on-surface">{{ selectedBudget.remainingText }}</strong></span>
              <span class="font-semibold uppercase" :class="selectedBudget.state === 'danger' ? 'text-rose-600' : 'text-emerald-600'">
                {{ selectedBudget.state === 'danger' ? 'Over Budget' : 'Aman' }}
              </span>
            </div>
          </div>

          <div class="p-3 rounded-xl bg-surface-container-low flex flex-col gap-1.5">
            <div v-if="selectedBudget.categoryName" class="flex justify-between">
              <span class="text-muted">Kategori Dasar:</span>
              <span class="font-semibold text-on-surface">{{ selectedBudget.categoryName }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted">Masa Berlaku:</span>
              <span class="font-semibold text-on-surface">{{ selectedBudget.periodStart }} s/d {{ selectedBudget.periodEnd }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted">Pemilik Budget:</span>
              <span class="font-bold uppercase tracking-wider text-[10px] text-primary">
                {{ selectedBudget.owners?.join(', ') }}
              </span>
            </div>
          </div>
        </div>

        <div class="flex gap-2 pt-2">
          <button
            type="button"
            class="flex-1 py-2.5 bg-amber-50 text-amber-800 rounded-xl text-xs font-bold border border-amber-200 flex items-center justify-center gap-1.5"
            @click="openEditModal(selectedBudget); showDetailModal = false"
          >
            <span class="material-symbols-outlined text-[16px]">edit</span>
            Edit
          </button>
          <button
            type="button"
            class="flex-1 py-2.5 bg-rose-50 text-rose-700 rounded-xl text-xs font-bold border border-rose-200 flex items-center justify-center gap-1.5"
            @click="deleteBudget(selectedBudget.id)"
          >
            <span class="material-symbols-outlined text-[16px]">delete</span>
            Hapus
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.budget-page,
.px-page {
  padding-left: 12px;
  padding-right: 12px;
}
</style>
