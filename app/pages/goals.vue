<script setup lang="ts">
definePageMeta({ layout: 'app' })
useHead({ title: 'Goals — CoupleCash' })

const { getAuthToken, currentUser, hasPartner } = useAuth()
const token = await getAuthToken()
const authHeaders = token ? { Authorization: `Bearer ${token}` } : {}

const { data, refresh: refreshGoals, pending } = await useFetch<any>('/api/goals', {
  headers: authHeaders,
})

const { data: catData, refresh: refreshCategories } = await useFetch<any>('/api/categories', {
  headers: authHeaders,
})

const { data: accData, refresh: refreshAccounts } = await useFetch<any>('/api/accounts', {
  headers: authHeaders,
  query: { onlyActive: 'true' },
})

const userRole = computed<'suami' | 'istri'>(() => currentUser.value?.role || 'suami')

async function fetchGoals() {
  try {
    const t = await getAuthToken()
    const headers = t ? { Authorization: `Bearer ${t}` } : {}
    const res = await $fetch<any>('/api/goals', { headers })
    if (res?.success) {
      data.value = res
    }
  } catch (err) {
    console.error('[goals] load error:', err)
  }
}

async function fetchCategories() {
  try {
    const t = await getAuthToken()
    const headers = t ? { Authorization: `Bearer ${t}` } : {}
    const res = await $fetch<any>('/api/categories', { headers })
    if (res?.categories) {
      catData.value = res
    }
  } catch (err) {
    console.error('[goals] cat load error:', err)
  }
}

async function fetchAccounts() {
  try {
    const t = await getAuthToken()
    const headers = t ? { Authorization: `Bearer ${t}` } : {}
    const res = await $fetch<any>('/api/accounts', { headers, query: { onlyActive: 'true' } })
    if (res?.accounts) {
      accData.value = res
    }
  } catch (err) {
    console.error('[goals] acc load error:', err)
  }
}

const summary = computed(() => data.value?.summary ?? {
  totalTarget: 0,
  totalTargetText: 'Rp 0',
  totalCollected: 0,
  totalCollectedText: 'Rp 0',
  remainingTarget: 0,
  remainingTargetText: 'Rp 0',
  overallPct: 0,
  suamiName: 'Suami',
  istriName: 'Istri',
  suamiContribution: 0,
  suamiContributionText: 'Rp 0',
  suamiPct: 0,
  istriContribution: 0,
  istriContributionText: 'Rp 0',
  istriPct: 0,
  activeCount: 0,
  completedCount: 0,
})

const activeGoals = computed(() => data.value?.activeGoals ?? [])
const completedGoals = computed(() => data.value?.completedGoals ?? [])

const availableCategories = computed(() => {
  const all = catData.value?.categories ?? []
  const goalsCats = all.filter((c: any) => c.type === 'goals')
  return goalsCats.length > 0 ? goalsCats : all
})

// Accounts that current user has authority to use (own accounts + bersama)
const availableAccounts = computed(() => {
  const all: any[] = accData.value?.accounts ?? []
  return all.filter((a: any) => a.ownerType === userRole.value || a.ownerType === 'bersama' || !a.ownerType)
})

// ── Modals & Action Menu State ──
const isCreateModalOpen = ref(false)
const isDetailModalOpen = ref(false)
const isSubmitting = ref(false)
const editingGoalId = ref<string | null>(null)
const selectedGoal = ref<any>(null)
const activeMenuGoalId = ref<string | null>(null)
const formError = ref('')

// Balance warning modal state
const isBalanceWarningModalOpen = ref(false)
const bypassBalanceWarning = ref(false)
const pendingAction = ref<'create' | 'contribute' | null>(null)

// Quick Progress / Contribution Modal State
const isContributeModalOpen = ref(false)
const contributingGoal = ref<any>(null)
const contributeForm = reactive({
  sourceAccountId: '',
  amount: '',
  note: '',
})
const contributeError = ref('')
const isSubmittingContribute = ref(false)

const selectedContributeAccount = computed(() => {
  return availableAccounts.value.find((a: any) => a.id === contributeForm.sourceAccountId)
})

const form = reactive({
  name: '',
  icon: '✈️',
  categoryId: '',
  sourceAccountId: '',
  targetDate: '',
  targetAmount: '',
  partner1Contribution: '',
  partner2Contribution: '',
  description: '',
})

const emojiOptions = ['✈️', '🚗', '🛋️', '💻', '🏠', '💍', '🎓', '👶', '📱', '🏖️', '🎯', '💰']

// Real-time calculations for Create/Edit Modal
const computedTarget = computed(() => Number(form.targetAmount) || 0)
const computedP1 = computed(() => Number(form.partner1Contribution) || 0)
const computedP2 = computed(() => hasPartner.value ? (Number(form.partner2Contribution) || 0) : 0)
const computedTotalContribution = computed(() => computedP1.value + (hasPartner.value ? computedP2.value : 0))
const computedRemaining = computed(() => Math.max(0, computedTarget.value - computedTotalContribution.value))
const computedPct = computed(() => {
  if (computedTarget.value <= 0) return 0
  return Math.min(100, Math.round((computedTotalContribution.value / computedTarget.value) * 100))
})

const computedInitialContribution = computed(() => {
  if (hasPartner.value) {
    return userRole.value === 'suami' ? computedP1.value : computedP2.value
  }
  return computedP1.value
})

const selectedSourceAccount = computed(() => {
  return availableAccounts.value.find((a: any) => a.id === form.sourceAccountId)
})

function formatRupiah(num: number) {
  return 'Rp ' + Math.abs(num).toLocaleString('id-ID')
}

function openCreateModal() {
  editingGoalId.value = null
  form.name = ''
  form.icon = '✈️'
  form.categoryId = availableCategories.value[0]?.id || ''
  
  const nextThreeMonths = new Date()
  nextThreeMonths.setMonth(nextThreeMonths.getMonth() + 3)
  form.targetDate = nextThreeMonths.toISOString().split('T')[0]
  
  form.targetAmount = ''
  form.partner1Contribution = ''
  form.partner2Contribution = ''
  form.sourceAccountId = availableAccounts.value[0]?.id || ''
  form.description = ''
  formError.value = ''
  bypassBalanceWarning.value = false
  isCreateModalOpen.value = true
}

function openEditModal(goal: any) {
  closeActionMenu()
  editingGoalId.value = goal.id
  form.name = goal.name
  form.icon = goal.icon || '✈️'
  form.categoryId = goal.categoryId || ''
  form.targetDate = goal.targetDate
  form.targetAmount = String(goal.targetAmount)
  form.partner1Contribution = goal.partner1Contribution ? String(goal.partner1Contribution) : ''
  form.partner2Contribution = goal.partner2Contribution ? String(goal.partner2Contribution) : ''
  form.sourceAccountId = ''
  form.description = goal.description || ''
  formError.value = ''
  isCreateModalOpen.value = true
}

function openDetailModal(goal: any) {
  closeActionMenu()
  selectedGoal.value = goal
  isDetailModalOpen.value = true
}

function openContributeModal(goal: any) {
  closeActionMenu()
  contributingGoal.value = goal
  contributeForm.sourceAccountId = availableAccounts.value[0]?.id || ''
  contributeForm.amount = ''
  contributeForm.note = ''
  contributeError.value = ''
  bypassBalanceWarning.value = false
  isContributeModalOpen.value = true
}

function addContributePreset(val: number) {
  const current = Number(contributeForm.amount) || 0
  contributeForm.amount = String(current + val)
}

function toggleCardMenu(goalId: string, e: Event) {
  e.stopPropagation()
  if (activeMenuGoalId.value === goalId) {
    activeMenuGoalId.value = null
  } else {
    activeMenuGoalId.value = goalId
  }
}

function closeActionMenu() {
  activeMenuGoalId.value = null
}

async function saveGoal() {
  if (!form.name.trim()) {
    formError.value = 'Nama Goals wajib diisi'
    return
  }
  if (computedTarget.value <= 0) {
    formError.value = 'Target nominal harus lebih dari 0'
    return
  }
  if (!form.targetDate) {
    formError.value = 'Tanggal target harus ditentukan'
    return
  }

  // Validate initial contribution and source account when creating
  if (!editingGoalId.value && computedInitialContribution.value > 0) {
    if (!form.sourceAccountId) {
      formError.value = 'Pilih pos akun asal untuk memotong kontribusi awal'
      return
    }

    if (
      selectedSourceAccount.value &&
      selectedSourceAccount.value.balance < computedInitialContribution.value &&
      !bypassBalanceWarning.value
    ) {
      pendingAction.value = 'create'
      isBalanceWarningModalOpen.value = true
      return
    }
  }

  isSubmitting.value = true
  formError.value = ''

  try {
    const payload = {
      name: form.name.trim(),
      icon: form.icon,
      categoryId: form.categoryId || null,
      sourceAccountId: (!editingGoalId.value && computedInitialContribution.value > 0) ? form.sourceAccountId : undefined,
      targetDate: form.targetDate,
      targetAmount: computedTarget.value,
      partner1Contribution: computedP1.value,
      partner2Contribution: hasPartner.value ? (form.partner2Contribution !== '' ? computedP2.value : 0) : null,
      description: form.description.trim(),
    }

    const t = await getAuthToken()
    const headers = t ? { Authorization: `Bearer ${t}` } : {}

    if (editingGoalId.value) {
      await $fetch(`/api/goals/${editingGoalId.value}`, {
        method: 'PUT',
        headers,
        body: payload,
      })
    } else {
      await $fetch('/api/goals', {
        method: 'POST',
        headers,
        body: payload,
      })
    }

    isCreateModalOpen.value = false
    await Promise.all([fetchGoals(), fetchAccounts()])
  } catch (err: any) {
    formError.value = err?.statusMessage || err?.message || 'Gagal menyimpan goal'
  } finally {
    isSubmitting.value = false
    bypassBalanceWarning.value = false
  }
}

async function submitContribute() {
  const numAmount = Number(contributeForm.amount)
  if (!numAmount || numAmount <= 0) {
    contributeError.value = 'Nominal kontribusi harus lebih dari 0'
    return
  }
  if (!contributeForm.sourceAccountId) {
    contributeError.value = 'Pilih pos akun asal'
    return
  }

  if (
    selectedContributeAccount.value &&
    selectedContributeAccount.value.balance < numAmount &&
    !bypassBalanceWarning.value
  ) {
    pendingAction.value = 'contribute'
    isBalanceWarningModalOpen.value = true
    return
  }

  isSubmittingContribute.value = true
  contributeError.value = ''

  try {
    const t = await getAuthToken()
    const headers = t ? { Authorization: `Bearer ${t}` } : {}

    await $fetch('/api/goals/contribute', {
      method: 'POST',
      headers,
      body: {
        goalId: contributingGoal.value.id,
        sourceAccountId: contributeForm.sourceAccountId,
        amount: numAmount,
        note: contributeForm.note.trim() || undefined,
      },
    })

    isContributeModalOpen.value = false
    await Promise.all([fetchGoals(), fetchAccounts()])
  } catch (err: any) {
    contributeError.value = err?.statusMessage || err?.message || 'Gagal menambahkan kontribusi'
  } finally {
    isSubmittingContribute.value = false
    bypassBalanceWarning.value = false
  }
}

function handleProceedWarning() {
  bypassBalanceWarning.value = true
  isBalanceWarningModalOpen.value = false
  if (pendingAction.value === 'create') {
    saveGoal()
  } else if (pendingAction.value === 'contribute') {
    submitContribute()
  }
}

async function deleteGoal(goalId: string) {
  closeActionMenu()
  if (!confirm('Apakah Anda yakin ingin menghapus Goal ini?')) return

  try {
    const t = await getAuthToken()
    const headers = t ? { Authorization: `Bearer ${t}` } : {}
    await $fetch(`/api/goals/${goalId}`, {
      method: 'DELETE',
      headers,
    })
    if (selectedGoal.value?.id === goalId) {
      isDetailModalOpen.value = false
    }
    await Promise.all([fetchGoals(), fetchAccounts()])
  } catch (err: any) {
    alert(err?.statusMessage || 'Gagal menghapus goal')
  }
}

const { startTour, shouldTriggerTour } = useWalkthrough()

// Ensure goals & accounts are loaded on mount & when auth initializes
onMounted(async () => {
  if (typeof window !== 'undefined') {
    window.addEventListener('click', closeActionMenu)
  }
  await Promise.all([fetchGoals(), fetchCategories(), fetchAccounts()])

  setTimeout(() => {
    if (shouldTriggerTour('goals')) {
      startTour('goals')
    }
  }, 500)
})

watch(
  currentUser,
  (user) => {
    if (user) {
      fetchGoals()
      fetchCategories()
      fetchAccounts()
    }
  },
  { immediate: true }
)

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('click', closeActionMenu)
  }
})
</script>

<template>
  <div class="goals-page px-3 max-w-[520px] mx-auto animate-fade-in pb-28 pt-2">
    <div class="flex flex-col w-full gap-5">
      
      <!-- Page Header Subtitle & Quick Encouragement -->
      <div class="flex flex-col gap-1">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-xl font-bold text-on-surface">{{ hasPartner ? 'Target Bersama' : 'Target Keuangan' }}</h1>
            <p class="text-xs text-on-surface-variant">{{ hasPartner ? 'Wujudkan rencana impian kalian berdua selangkah demi selangkah.' : 'Wujudkan rencana impian finansial Anda selangkah demi selangkah.' }}</p>
          </div>
          <div class="flex items-center gap-1 bg-surface-container-low px-2.5 py-1 rounded-full shadow-sm border border-outline-variant/30">
            <span class="material-symbols-outlined text-[16px] text-primary" style="font-variation-settings: 'FILL' 1;">auto_awesome</span>
            <span class="text-xs text-on-surface font-semibold">Tersinkron</span>
          </div>
        </div>
      </div>

      <!-- 1. SUMMARY GOALS CARD (Vault-like Hero Glassmorphism Gradient) -->
      <section class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-[#4f46e5] to-[#6b38d4] p-5 text-white shadow-xl shadow-primary/25">
        <!-- Decorative Ambient Glow Circles -->
        <div class="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/10 blur-2xl pointer-events-none"></div>
        <div class="absolute -left-6 -bottom-6 w-32 h-32 rounded-full bg-secondary-container/20 blur-xl pointer-events-none"></div>

        <div class="relative z-10 flex flex-col gap-4">
          <div class="flex items-start justify-between">
            <div class="flex flex-col">
              <span class="text-[11px] uppercase tracking-wider text-primary-fixed opacity-90 font-semibold">Total Target Goals</span>
              <span class="text-[28px] sm:text-[32px] font-bold text-white tracking-tight">{{ summary.totalTargetText }}</span>
            </div>
            <div class="bg-white/15 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm border border-white/20">
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span class="text-xs text-white font-medium">{{ summary.activeCount }} Aktif • {{ summary.completedCount }} Selesai</span>
            </div>
          </div>

          <!-- Glassmorphic Progress Container -->
          <div class="bg-white/10 backdrop-blur-md rounded-xl p-3.5 flex flex-col gap-2.5 shadow-sm border border-white/15">
            <div class="flex justify-between items-baseline">
              <div class="flex items-center gap-1.5">
                <span class="material-symbols-outlined text-[16px] text-primary-fixed">savings</span>
                <span class="text-xs text-primary-fixed font-medium">Terkumpul</span>
                <span class="font-bold text-sm text-white ml-1 tabular-nums">{{ summary.totalCollectedText }}</span>
              </div>
              <span class="text-lg font-bold text-white">{{ summary.overallPct }}%</span>
            </div>

            <!-- Integrated Progress Bar with Dual Accents or Single Bar -->
            <div class="w-full h-3 bg-black/25 rounded-full overflow-hidden p-0.5 backdrop-blur-xs flex">
              <div
                class="h-full bg-suami transition-all duration-500"
                :class="hasPartner ? 'rounded-l-full' : 'rounded-full'"
                :style="{ width: (hasPartner ? summary.suamiPct : summary.overallPct) + '%' }"
                :title="hasPartner ? 'Kontribusi ' + summary.suamiName : 'Terkumpul'"
              ></div>
              <div
                v-if="hasPartner"
                class="h-full bg-istri rounded-r-full transition-all duration-500"
                :style="{ width: summary.istriPct + '%' }"
                :title="'Kontribusi ' + summary.istriName"
              ></div>
            </div>

            <div class="flex items-center justify-between text-xs text-primary-fixed pt-0.5">
              <div v-if="hasPartner" class="flex items-center gap-3">
                <span class="flex items-center gap-1">
                  <span class="w-2 h-2 rounded-full bg-suami"></span>
                  {{ summary.suamiName }} ({{ summary.suamiPct }}%)
                </span>
                <span class="flex items-center gap-1">
                  <span class="w-2 h-2 rounded-full bg-istri"></span>
                  {{ summary.istriName }} ({{ summary.istriPct }}%)
                </span>
              </div>
              <div v-else class="flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-suami"></span>
                <span>Progres Tabungan ({{ summary.overallPct }}%)</span>
              </div>
              <span class="opacity-90">Sisa: {{ summary.remainingTargetText }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 2. SECTION: GOALS AKTIF -->
      <section class="flex flex-col gap-3">
        <div class="flex items-center justify-between px-1">
          <div class="flex items-center gap-2">
            <h2 class="text-base font-bold text-on-surface">Goals Aktif</h2>
            <span class="px-2 py-0.5 rounded-full bg-primary-fixed text-primary font-bold text-xs">
              {{ activeGoals.length }}
            </span>
          </div>
        </div>

        <!-- Cards Stack -->
        <div v-if="activeGoals.length > 0" class="flex flex-col gap-3">
          <article
            v-for="goal in activeGoals"
            :key="goal.id"
            class="bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-outline-variant/30 hover:shadow-md transition-shadow flex flex-col gap-3 relative"
          >
            <!-- Card Top Header -->
            <div class="flex items-start justify-between">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-xl bg-surface-container-low flex items-center justify-center text-2xl shadow-inner border border-outline-variant/20">
                  {{ goal.icon }}
                </div>
                <div class="flex flex-col">
                  <h3 class="text-sm font-bold text-on-surface">{{ goal.name }}</h3>
                  <div class="flex items-center gap-1.5 mt-0.5">
                    <span class="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-[11px]">
                      {{ goal.categoryName }}
                    </span>
                    <span
                      v-if="goal.status === 'warning'"
                      class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-semibold flex items-center gap-0.5"
                    >
                      <span class="material-symbols-outlined text-[13px] text-amber-600">timer</span>
                      Mendekati Deadline
                    </span>
                    <span
                      v-else-if="goal.collectedAmount === 0"
                      class="px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant text-[11px] font-medium"
                    >
                      Belum Dimulai
                    </span>
                    <span
                      v-else
                      class="px-2 py-0.5 rounded-full bg-primary-fixed text-primary text-[11px] font-medium"
                    >
                      Berjalan
                    </span>
                  </div>
                </div>
              </div>

              <!-- Action Buttons: + Quick Contribution & 3-dots Menu -->
              <div class="flex items-center gap-1.5">
                <!-- Quick Add Contribution / Progress Button (+) -->
                <button
                  type="button"
                  aria-label="Tambah Perkembangan Goals"
                  class="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-sm shadow-primary/30 hover:bg-primary-container active:scale-95 transition-all"
                  title="Tambah Perkembangan Goals"
                  @click.stop="openContributeModal(goal)"
                >
                  <span class="material-symbols-outlined text-[18px]">add</span>
                </button>

                <!-- Three-dot Action Menu Button -->
                <div class="relative">
                  <button
                    type="button"
                    aria-label="Menu Opsi"
                    class="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors"
                    @click="toggleCardMenu(goal.id, $event)"
                  >
                    <span class="material-symbols-outlined text-[20px]">more_vert</span>
                  </button>

                  <!-- Dropdown Menu -->
                  <div
                    v-if="activeMenuGoalId === goal.id"
                    class="absolute right-0 top-9 w-36 bg-white rounded-xl shadow-xl border border-outline-variant/30 py-1 z-30 flex flex-col animate-fade-in"
                    @click.stop
                  >
                    <button
                      type="button"
                      class="px-3 py-2 text-left text-xs font-semibold text-on-surface hover:bg-surface-container-low flex items-center gap-2"
                      @click="openDetailModal(goal)"
                    >
                      <span class="material-symbols-outlined text-[16px] text-primary">visibility</span>
                      Lihat Detail
                    </button>
                    <button
                      type="button"
                      class="px-3 py-2 text-left text-xs font-semibold text-on-surface hover:bg-surface-container-low flex items-center gap-2"
                      @click="openEditModal(goal)"
                    >
                      <span class="material-symbols-outlined text-[16px] text-amber-600">edit</span>
                      Edit Goals
                    </button>
                    <div class="h-px bg-outline-variant/20 my-0.5"></div>
                    <button
                      type="button"
                      class="px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                      @click="deleteGoal(goal.id)"
                    >
                      <span class="material-symbols-outlined text-[16px]">delete</span>
                      Hapus Goals
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Target Numbers Info -->
            <div class="bg-surface-container-low/60 rounded-xl p-3 flex flex-col gap-2">
              <div class="flex items-baseline justify-between">
                <div>
                  <span class="text-[11px] text-on-surface-variant">Terkumpul</span>
                  <div class="font-bold text-sm text-primary tabular-nums">{{ goal.collectedAmountText }}</div>
                </div>
                <div class="text-right">
                  <span class="text-[11px] text-on-surface-variant">Target</span>
                  <div class="font-bold text-sm text-on-surface tabular-nums">{{ goal.targetAmountText }}</div>
                </div>
              </div>

              <!-- Dual-Tone or Single Progress Bar -->
              <div class="flex flex-col gap-1">
                <div class="w-full h-2.5 bg-surface-container-highest rounded-full overflow-hidden flex">
                  <div
                    class="h-full bg-suami"
                    :class="(hasPartner && goal.partner2Contribution !== null) ? 'rounded-l-full' : 'rounded-full'"
                    :style="{ width: (hasPartner && goal.partner2Contribution !== null ? goal.partner1Pct : goal.pct) + '%' }"
                  ></div>
                  <div
                    v-if="hasPartner && goal.partner2Contribution !== null"
                    class="h-full bg-istri rounded-r-full"
                    :style="{ width: goal.partner2Pct + '%' }"
                  ></div>
                </div>
                <div class="flex justify-between items-center text-[11px] text-on-surface-variant">
                  <span>{{ goal.pct }}% tercapai</span>
                  <span>Sisa: {{ goal.remainingAmountText }}</span>
                </div>
              </div>
            </div>

            <!-- Partner Contributions and Deadline -->
            <div class="flex items-center justify-between pt-0.5 text-on-surface-variant text-xs">
              <div class="flex items-center gap-2.5">
                <span class="flex items-center gap-1">
                  <span class="w-2 h-2 rounded-full bg-suami"></span>
                  {{ hasPartner ? goal.partner1Name + ':' : 'Terkumpul:' }} <strong class="text-on-surface font-semibold tabular-nums">{{ formatRupiah(goal.partner1Contribution) }}</strong>
                </span>
                <span v-if="hasPartner && goal.partner2Contribution !== null" class="flex items-center gap-1">
                  <span class="w-2 h-2 rounded-full bg-istri"></span>
                  {{ goal.partner2Name }}: <strong class="text-on-surface font-semibold tabular-nums">{{ formatRupiah(goal.partner2Contribution) }}</strong>
                </span>
              </div>
              <div
                class="flex items-center gap-1 px-2 py-0.5 rounded-md font-medium"
                :class="goal.status === 'warning' ? 'text-amber-800 bg-amber-100' : 'text-on-surface-variant bg-surface-container-low'"
              >
                <span class="material-symbols-outlined text-[14px]">event</span>
                <span>{{ goal.daysRemaining }} hari lagi</span>
              </div>
            </div>
          </article>
        </div>

        <!-- Empty State Active Goals -->
        <div v-else class="bg-surface-container-lowest rounded-2xl p-6 text-center border border-outline-variant/30 flex flex-col items-center">
          <div class="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2">
            <span class="material-symbols-outlined text-[24px]">track_changes</span>
          </div>
          <p class="font-bold text-sm text-on-surface">Belum ada Goals Aktif</p>
          <p class="text-xs text-muted max-w-[240px] mt-0.5">Mulai canangkan impian bersama seperti liburan, DP rumah, atau tabungan kencan.</p>
        </div>
      </section>

      <!-- 3. ACTION BUTTON: BUAT GOALS BARU -->
      <div class="w-full pt-1">
        <button
          type="button"
          class="w-full py-3.5 px-4 bg-primary text-white rounded-xl text-sm font-semibold shadow-lg shadow-primary/25 hover:bg-primary-container active:scale-[0.99] transition-all flex items-center justify-center gap-2"
          @click="openCreateModal"
        >
          <span class="material-symbols-outlined text-[20px]">add_circle</span>
          <span>Buat Goals Baru</span>
        </button>
      </div>

      <!-- 4. SECTION: GOALS SELESAI -->
      <section v-if="completedGoals.length > 0" class="flex flex-col gap-3 pt-2">
        <div class="flex items-center justify-between px-1">
          <div class="flex items-center gap-2">
            <h2 class="text-base font-bold text-on-surface">Goals Selesai</h2>
            <span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs">
              {{ completedGoals.length }} Tercapai
            </span>
          </div>
          <span class="text-xs text-on-surface-variant">Histori Impian</span>
        </div>

        <!-- Completed Cards -->
        <article
          v-for="goal in completedGoals"
          :key="goal.id"
          class="bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-emerald-200 flex flex-col gap-3 relative overflow-hidden"
        >
          <!-- Decorative Success Watermark -->
          <div class="absolute -right-4 -bottom-4 text-emerald-500/10 pointer-events-none select-none">
            <span class="material-symbols-outlined text-[90px]" style="font-variation-settings: 'FILL' 1;">task_alt</span>
          </div>

          <div class="flex items-start justify-between relative z-10">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-2xl border border-emerald-100">
                {{ goal.icon }}
              </div>
              <div class="flex flex-col">
                <h3 class="text-sm font-bold text-on-surface">{{ goal.name }}</h3>
                <div class="flex items-center gap-1.5 mt-0.5">
                  <span class="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-[11px]">
                    {{ goal.categoryName }}
                  </span>
                  <span class="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[11px] font-semibold flex items-center gap-0.5">
                    <span class="material-symbols-outlined text-[13px]">check_circle</span>
                    Tercapai
                  </span>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-1">
              <div class="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <span class="material-symbols-outlined text-[20px]" style="font-variation-settings: 'FILL' 1;">celebration</span>
              </div>
              <button
                type="button"
                aria-label="Hapus Goal"
                class="w-7 h-7 rounded-full text-muted hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors"
                @click="deleteGoal(goal.id)"
                title="Hapus dari Histori"
              >
                <span class="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
          </div>

          <!-- Target & Completion Status -->
          <div class="bg-surface-container-low/70 rounded-xl p-3 flex flex-col gap-2 relative z-10">
            <div class="flex items-baseline justify-between">
              <div>
                <span class="text-[11px] text-on-surface-variant">Terkumpul Penuh</span>
                <div class="font-bold text-sm text-emerald-600 tabular-nums">{{ goal.collectedAmountText }}</div>
              </div>
              <div class="text-right">
                <span class="text-[11px] text-on-surface-variant">Target Tercapai</span>
                <div class="font-bold text-sm text-on-surface tabular-nums">{{ goal.targetAmountText }}</div>
              </div>
            </div>

            <!-- 100% Emerald Green Progress Bar -->
            <div class="flex flex-col gap-1">
              <div class="w-full h-2 bg-emerald-500 rounded-full shadow-xs"></div>
              <div class="flex justify-between items-center text-[11px] text-on-surface-variant pt-0.5">
                <span class="text-emerald-700 font-semibold">100% Selesai Sempurna</span>
                <span v-if="goal.completedAtText" class="flex items-center gap-1 text-muted">
                  <span class="material-symbols-outlined text-[14px]">event_available</span>
                  Selesai pada {{ goal.completedAtText }}
                </span>
              </div>
            </div>
          </div>

          <!-- Partner Contributions Detail -->
          <div class="flex items-center justify-between pt-0.5 text-on-surface-variant text-xs relative z-10">
            <div class="flex items-center gap-2">
              <span class="flex items-center gap-1">
                <span class="w-2 h-2 rounded-full bg-suami"></span>
                {{ hasPartner ? goal.partner1Name : 'Terkumpul' }} {{ formatRupiah(goal.partner1Contribution) }}
              </span>
              <template v-if="hasPartner && goal.partner2Contribution !== null">
                <span>•</span>
                <span class="flex items-center gap-1">
                  <span class="w-2 h-2 rounded-full bg-istri"></span>
                  {{ goal.partner2Name }} {{ formatRupiah(goal.partner2Contribution) }}
                </span>
              </template>
            </div>
            <span class="text-emerald-700 font-semibold">{{ hasPartner ? 'Tercapai Berdua' : 'Tercapai' }}</span>
          </div>
        </article>
      </section>

    </div>

    <!-- ── MODAL: CREATE / EDIT GOAL ── -->
    <div
      v-if="isCreateModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
      @click.self="isCreateModalOpen = false"
    >
      <div class="bg-surface-container-lowest w-full max-w-md rounded-3xl p-5 shadow-2xl border border-outline-variant/30 flex flex-col gap-4 max-h-[90vh] overflow-y-auto hide-scrollbar">
        <div class="flex items-center justify-between pb-2 border-b border-outline-variant/20">
          <div class="flex items-center gap-2">
            <div class="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <span class="material-symbols-outlined text-[20px]">track_changes</span>
            </div>
            <h3 class="text-base font-bold text-on-surface">
              {{ editingGoalId ? 'Edit Goal' : 'Buat Goal Baru' }}
            </h3>
          </div>
          <button
            type="button"
            class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-muted hover:text-on-surface"
            @click="isCreateModalOpen = false"
          >
            <span class="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div v-if="formError" class="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
          {{ formError }}
        </div>

        <div class="flex flex-col gap-3">
          <!-- Nama Goals -->
          <div>
            <label class="block text-xs font-semibold text-on-surface mb-1">Nama Goals</label>
            <input
              v-model="form.name"
              type="text"
              placeholder="Contoh: Liburan ke Jepang, DP Rumah"
              class="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/50 bg-surface text-sm focus:border-primary focus:outline-none"
            />
          </div>

          <!-- Icon / Emoji Selector -->
          <div>
            <label class="block text-xs font-semibold text-on-surface mb-1">Pilih Ikon</label>
            <div class="flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar">
              <button
                v-for="emo in emojiOptions"
                :key="emo"
                type="button"
                class="w-10 h-10 rounded-xl text-lg flex items-center justify-center shrink-0 border transition-all"
                :class="form.icon === emo ? 'bg-primary/15 border-primary scale-105' : 'bg-surface border-outline-variant/30 hover:bg-surface-container-low'"
                @click="form.icon = emo"
              >
                {{ emo }}
              </button>
            </div>
          </div>

          <!-- Kategori Goals & Tanggal Target -->
          <div class="grid grid-cols-2 gap-2.5">
            <div>
              <label class="block text-xs font-semibold text-on-surface mb-1">Kategori</label>
              <select
                v-model="form.categoryId"
                class="w-full px-3 py-2.5 rounded-xl border border-outline-variant/50 bg-surface text-xs font-medium focus:border-primary focus:outline-none"
              >
                <option value="">Umum</option>
                <option v-for="c in availableCategories" :key="c.id" :value="c.id">
                  {{ c.name }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-on-surface mb-1">Tanggal Target</label>
              <input
                v-model="form.targetDate"
                type="date"
                class="w-full px-3 py-2.5 rounded-xl border border-outline-variant/50 bg-surface text-xs font-medium focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <!-- Nominal Total Target -->
          <div>
            <label class="block text-xs font-semibold text-on-surface mb-1">Target Nominal (Rp)</label>
            <input
              v-model="form.targetAmount"
              type="number"
              min="1"
              placeholder="Contoh: 20000000"
              class="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/50 bg-surface text-sm font-semibold focus:border-primary focus:outline-none"
            />
          </div>

          <!-- Kontribusi Pasangan (Jika Single, kolom kontribusi pasangan di-hide) -->
          <div v-if="!hasPartner">
            <label class="block text-xs font-semibold text-primary mb-1">Kontribusi Awal Anda (Rp)</label>
            <input
              v-model="form.partner1Contribution"
              type="number"
              min="0"
              placeholder="0"
              class="w-full px-3.5 py-2.5 rounded-xl border border-primary/40 bg-primary/5 text-sm font-semibold focus:border-primary focus:outline-none"
            />
          </div>

          <div v-else class="grid grid-cols-2 gap-2.5">
            <div>
              <label class="block text-xs font-semibold text-suami mb-1">
                Kontribusi {{ summary.suamiName }} {{ userRole === 'suami' ? '(Anda)' : '' }}
              </label>
              <input
                v-model="form.partner1Contribution"
                type="number"
                min="0"
                placeholder="0"
                :disabled="userRole !== 'suami'"
                class="w-full px-3 py-2 rounded-xl border border-suami/40 text-xs font-semibold focus:border-suami focus:outline-none disabled:opacity-50 disabled:bg-surface-container"
                :class="userRole === 'suami' ? 'bg-suami/5' : ''"
              />
              <span v-if="userRole !== 'suami'" class="text-[10px] text-muted block mt-0.5">
                Hanya bisa diisi oleh Suami
              </span>
            </div>
            <div>
              <label class="block text-xs font-semibold text-istri mb-1">
                Kontribusi {{ summary.istriName }} {{ userRole === 'istri' ? '(Anda)' : '' }}
              </label>
              <input
                v-model="form.partner2Contribution"
                type="number"
                min="0"
                placeholder="0"
                :disabled="userRole !== 'istri'"
                class="w-full px-3 py-2 rounded-xl border border-istri/40 text-xs font-semibold focus:border-istri focus:outline-none disabled:opacity-50 disabled:bg-surface-container"
                :class="userRole === 'istri' ? 'bg-istri/5' : ''"
              />
              <span v-if="userRole !== 'istri'" class="text-[10px] text-muted block mt-0.5">
                Hanya bisa diisi oleh Istri
              </span>
            </div>
          </div>

          <!-- Pos Akun Sumber Kontribusi (Wajib jika ada kontribusi awal pada saat create) -->
          <div v-if="computedInitialContribution > 0 && !editingGoalId" class="animate-fade-in">
            <label class="block text-xs font-semibold text-on-surface mb-1">
              Pos Akun Sumber Kontribusi <span class="text-rose-500">*</span>
            </label>
            <select
              v-model="form.sourceAccountId"
              class="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/50 bg-surface text-xs font-medium focus:border-primary focus:outline-none"
            >
              <option value="" disabled>-- Pilih Pos Akun Asal --</option>
              <option v-for="acc in availableAccounts" :key="acc.id" :value="acc.id">
                {{ acc.name }} (Saldo: {{ acc.balanceText }}) - {{ acc.ownerType || 'Bersama' }}
              </option>
            </select>
            <p v-if="selectedSourceAccount" class="text-[11px] text-muted mt-1">
              Saldo tersedia: <strong :class="selectedSourceAccount.balance < computedInitialContribution ? 'text-rose-600' : 'text-emerald-600'">{{ selectedSourceAccount.balanceText }}</strong>
            </p>
            <span class="text-[10px] text-muted block mt-0.5">
              Saldo pos akun ini akan langsung dipotong dan dialihkan ke pos akun pasif goals.
            </span>
          </div>

          <!-- Real-Time Auto Computed Preview -->
          <div class="bg-surface-container-low p-3 rounded-2xl border border-outline-variant/30 flex flex-col gap-1.5 text-xs">
            <div class="flex justify-between">
              <span class="text-muted">Total Terkumpul:</span>
              <span class="font-bold text-primary">{{ formatRupiah(computedTotalContribution) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted">Sisa Target:</span>
              <span class="font-semibold text-on-surface">{{ formatRupiah(computedRemaining) }}</span>
            </div>
            <div class="flex justify-between items-center pt-1 border-t border-outline-variant/20">
              <span class="text-muted">Status Progress:</span>
              <span class="font-bold" :class="computedPct >= 100 ? 'text-emerald-600' : 'text-primary'">
                {{ computedPct }}% {{ computedPct >= 100 ? '(Akan Langsung Selesai 🎉)' : '' }}
              </span>
            </div>
          </div>

          <!-- Keterangan / Deskripsi -->
          <div>
            <label class="block text-xs font-semibold text-on-surface mb-1">Catatan / Keterangan (Opsional)</label>
            <textarea
              v-model="form.description"
              rows="2"
              placeholder="Catatan detail mengenai rencana goals ini..."
              class="w-full px-3.5 py-2 rounded-xl border border-outline-variant/50 bg-surface text-xs focus:border-primary focus:outline-none resize-none"
            ></textarea>
          </div>
        </div>

        <div class="flex gap-2 pt-2">
          <button
            type="button"
            class="flex-1 py-3 bg-surface-container hover:bg-surface-variant text-on-surface rounded-xl text-xs font-bold transition-all"
            @click="isCreateModalOpen = false"
          >
            Batal
          </button>
          <button
            type="button"
            class="flex-1 py-3 bg-primary text-white rounded-xl text-xs font-bold shadow-md shadow-primary/30 hover:bg-primary-container active:scale-95 transition-all flex items-center justify-center gap-1.5"
            :disabled="isSubmitting"
            @click="saveGoal"
          >
            <span v-if="isSubmitting" class="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
            <span>{{ editingGoalId ? 'Simpan Perubahan' : 'Buat Goals' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ── MODAL: GOAL DETAIL ── -->
    <div
      v-if="isDetailModalOpen && selectedGoal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
      @click.self="isDetailModalOpen = false"
    >
      <div class="bg-surface-container-lowest w-full max-w-md rounded-3xl p-5 shadow-2xl border border-outline-variant/30 flex flex-col gap-4 max-h-[90vh] overflow-y-auto hide-scrollbar">
        <div class="flex items-center justify-between pb-2 border-b border-outline-variant/20">
          <div class="flex items-center gap-2.5">
            <div class="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center text-2xl shadow-inner">
              {{ selectedGoal.icon }}
            </div>
            <div>
              <h3 class="text-base font-bold text-on-surface leading-snug">{{ selectedGoal.name }}</h3>
              <span class="text-xs text-muted">{{ selectedGoal.categoryName }}</span>
            </div>
          </div>
          <button
            type="button"
            class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-muted hover:text-on-surface"
            @click="isDetailModalOpen = false"
          >
            <span class="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div class="flex flex-col gap-3 text-xs">
          <div class="grid grid-cols-2 gap-2.5">
            <div class="p-3 rounded-xl bg-surface-container-low">
              <span class="text-muted block text-[11px]">Target Nominal</span>
              <strong class="text-sm text-on-surface font-bold">{{ selectedGoal.targetAmountText }}</strong>
            </div>
            <div class="p-3 rounded-xl bg-primary/10">
              <span class="text-primary block text-[11px]">Terkumpul</span>
              <strong class="text-sm text-primary font-bold">{{ selectedGoal.collectedAmountText }}</strong>
            </div>
          </div>

          <div class="p-3 rounded-xl bg-surface-container-low flex flex-col gap-2">
            <div class="flex justify-between items-center">
              <span class="text-muted">Status Tercapai:</span>
              <span class="font-bold text-primary">{{ selectedGoal.pct }}%</span>
            </div>
            <div class="w-full h-2.5 bg-surface-container-highest rounded-full overflow-hidden flex">
              <div
                class="h-full bg-suami"
                :class="(hasPartner && selectedGoal.partner2Contribution !== null) ? 'rounded-l-full' : 'rounded-full'"
                :style="{ width: (hasPartner && selectedGoal.partner2Contribution !== null ? selectedGoal.partner1Pct : selectedGoal.pct) + '%' }"
              ></div>
              <div
                v-if="hasPartner && selectedGoal.partner2Contribution !== null"
                class="h-full bg-istri rounded-r-full"
                :style="{ width: selectedGoal.partner2Pct + '%' }"
              ></div>
            </div>
            <div class="flex justify-between text-muted text-[11px]">
              <span>{{ hasPartner ? selectedGoal.partner1Name + ':' : 'Terkumpul:' }} {{ formatRupiah(selectedGoal.partner1Contribution) }}</span>
              <span v-if="hasPartner && selectedGoal.partner2Contribution !== null">{{ selectedGoal.partner2Name }}: {{ formatRupiah(selectedGoal.partner2Contribution) }}</span>
            </div>
          </div>

          <div class="p-3 rounded-xl bg-surface-container-low flex flex-col gap-1.5">
            <div class="flex justify-between">
              <span class="text-muted">Target Waktu:</span>
              <span class="font-semibold text-on-surface">{{ selectedGoal.targetDate }} ({{ selectedGoal.daysRemaining }} hari lagi)</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted">Status:</span>
              <span class="font-bold uppercase tracking-wider text-[10px]" :class="selectedGoal.status === 'completed' ? 'text-emerald-600' : 'text-primary'">
                {{ selectedGoal.status }}
              </span>
            </div>
            <div v-if="selectedGoal.description" class="pt-2 border-t border-outline-variant/20">
              <span class="text-muted block mb-0.5">Catatan:</span>
              <p class="text-on-surface">{{ selectedGoal.description }}</p>
            </div>
          </div>
        </div>

        <div class="flex gap-2 pt-2">
          <button
            type="button"
            class="flex-1 py-2.5 bg-amber-50 text-amber-800 rounded-xl text-xs font-bold border border-amber-200 flex items-center justify-center gap-1.5"
            @click="openEditModal(selectedGoal); isDetailModalOpen = false"
          >
            <span class="material-symbols-outlined text-[16px]">edit</span>
            Edit
          </button>
          <button
            type="button"
            class="flex-1 py-2.5 bg-rose-50 text-rose-700 rounded-xl text-xs font-bold border border-rose-200 flex items-center justify-center gap-1.5"
            @click="deleteGoal(selectedGoal.id)"
          >
            <span class="material-symbols-outlined text-[16px]">delete</span>
            Hapus
          </button>
        </div>
      </div>
    </div>

    <!-- ── MODAL: QUICK PROGRESS / TAMBAH PERKEMBANGAN GOALS (+) ── -->
    <div
      v-if="isContributeModalOpen && contributingGoal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
      @click.self="isContributeModalOpen = false"
    >
      <div class="bg-surface-container-lowest w-full max-w-md rounded-3xl p-5 shadow-2xl border border-outline-variant/30 flex flex-col gap-4 max-h-[90vh] overflow-y-auto hide-scrollbar">
        <!-- Header -->
        <div class="flex items-center justify-between pb-2 border-b border-outline-variant/20">
          <div class="flex items-center gap-2.5">
            <div class="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-xl shadow-inner">
              {{ contributingGoal.icon }}
            </div>
            <div>
              <h3 class="text-base font-bold text-on-surface leading-tight">Tambah Perkembangan</h3>
              <p class="text-xs text-muted truncate max-w-[200px]">{{ contributingGoal.name }}</p>
            </div>
          </div>
          <button
            type="button"
            class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-muted hover:text-on-surface"
            @click="isContributeModalOpen = false"
          >
            <span class="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div v-if="contributeError" class="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
          {{ contributeError }}
        </div>

        <!-- Progress Overview Card -->
        <div class="bg-surface-container-low rounded-2xl p-3 flex flex-col gap-2 border border-outline-variant/20">
          <div class="flex justify-between items-baseline text-xs">
            <span class="text-muted">Terkumpul: <strong class="text-primary">{{ contributingGoal.collectedAmountText }}</strong></span>
            <span class="text-muted">Target: <strong class="text-on-surface">{{ contributingGoal.targetAmountText }}</strong></span>
          </div>
          <div class="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
            <div
              class="h-full bg-primary rounded-full transition-all duration-300"
              :style="{ width: contributingGoal.pct + '%' }"
            ></div>
          </div>
          <div class="flex justify-between text-[11px] text-muted">
            <span>{{ contributingGoal.pct }}% tercapai</span>
            <span>Sisa: {{ contributingGoal.remainingAmountText }}</span>
          </div>
        </div>

        <!-- Form Input -->
        <div class="flex flex-col gap-3">
          <!-- Pos Akun Sumber -->
          <div>
            <label class="block text-xs font-semibold text-on-surface mb-1">
              Pos Akun Asal (Dipotong) <span class="text-rose-500">*</span>
            </label>
            <select
              v-model="contributeForm.sourceAccountId"
              class="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/50 bg-surface text-xs font-medium focus:border-primary focus:outline-none"
            >
              <option value="" disabled>-- Pilih Pos Akun --</option>
              <option v-for="acc in availableAccounts" :key="acc.id" :value="acc.id">
                {{ acc.name }} (Saldo: {{ acc.balanceText }}) - {{ acc.ownerType || 'Bersama' }}
              </option>
            </select>
            <p v-if="selectedContributeAccount" class="text-[11px] text-muted mt-1">
              Saldo tersedia: <strong :class="selectedContributeAccount.balance < (Number(contributeForm.amount) || 0) ? 'text-rose-600' : 'text-emerald-600'">{{ selectedContributeAccount.balanceText }}</strong>
            </p>
          </div>

          <!-- Nominal Tambahan -->
          <div>
            <label class="block text-xs font-semibold text-on-surface mb-1">
              Nominal Perkembangan (Rp) <span class="text-rose-500">*</span>
            </label>
            <input
              v-model="contributeForm.amount"
              type="number"
              min="1"
              placeholder="Contoh: 500000"
              class="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/50 bg-surface text-sm font-semibold focus:border-primary focus:outline-none"
            />

            <!-- Preset Buttons -->
            <div class="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1">
              <button
                v-for="p in [50000, 100000, 200000, 500000, 1000000]"
                :key="p"
                type="button"
                class="px-2.5 py-1 bg-surface-container hover:bg-primary/10 hover:text-primary rounded-lg text-[11px] font-bold text-on-surface-variant border border-outline-variant/30 transition-all shrink-0"
                @click="addContributePreset(p)"
              >
                +{{ p >= 1000000 ? (p/1000000) + 'jt' : (p/1000) + 'rb' }}
              </button>
            </div>
          </div>

          <!-- Catatan -->
          <div>
            <label class="block text-xs font-semibold text-on-surface mb-1">Catatan (Opsional)</label>
            <input
              v-model="contributeForm.note"
              type="text"
              placeholder="Contoh: Setoran tabungan dari gaji bulan ini"
              class="w-full px-3.5 py-2 rounded-xl border border-outline-variant/50 bg-surface text-xs focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-2 pt-2">
          <button
            type="button"
            class="flex-1 py-3 bg-surface-container hover:bg-surface-variant text-on-surface rounded-xl text-xs font-bold transition-all"
            @click="isContributeModalOpen = false"
          >
            Batal
          </button>
          <button
            type="button"
            class="flex-1 py-3 bg-primary text-white rounded-xl text-xs font-bold shadow-md shadow-primary/30 hover:bg-primary-container active:scale-95 transition-all flex items-center justify-center gap-1.5"
            :disabled="isSubmittingContribute"
            @click="submitContribute"
          >
            <span v-if="isSubmittingContribute" class="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
            <span>Simpan Perkembangan</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ── MODAL: BALANCE WARNING ── -->
    <div
      v-if="isBalanceWarningModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      @click.self="isBalanceWarningModalOpen = false"
    >
      <div class="bg-surface-container-lowest w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-outline-variant/30 flex flex-col gap-4 text-center">
        <div class="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto text-2xl">
          <span class="material-symbols-outlined text-[32px]">warning</span>
        </div>
        <div>
          <h3 class="text-base font-bold text-on-surface">Peringatan Saldo Kurang</h3>
          <p class="text-xs text-muted mt-1.5 leading-relaxed">
            Nominal kontribusi melebihi saldo yang tersedia di pos akun yang dipilih. Saldo akun akan menjadi minus jika tetap dilanjutkan.
          </p>
        </div>
        <div class="flex gap-2 pt-1">
          <button
            type="button"
            class="flex-1 py-2.5 bg-surface-container hover:bg-surface-variant text-on-surface rounded-xl text-xs font-bold transition-all"
            @click="isBalanceWarningModalOpen = false"
          >
            Pilih Akun Lain
          </button>
          <button
            type="button"
            class="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
            @click="handleProceedWarning"
          >
            Tetap Lanjutkan
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.goals-page,
.px-page {
  padding-left: 12px;
  padding-right: 12px;
}
</style>
