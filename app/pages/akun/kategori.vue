<script setup lang="ts">
definePageMeta({ layout: 'app' })
useHead({ title: 'Kategori Transaksi — CoupleCash' })

const router = useRouter()
const { getAuthToken } = useAuth()
const hideBottomNav = useState('hideBottomNav', () => false)

interface Category {
  id: string
  name: string
  type: 'expense' | 'income'
  icon: string
  colorToken: string | null
  appliesTo: string
  isDefault: boolean
  isActive: boolean
}

const activeType = ref<'expense' | 'income'>('expense')
const searchQuery = ref('')
const categories = ref<Category[]>([])
const isLoading = ref(true)

// Menu state
const activeMenuId = ref<string | null>(null)

function toggleMenu(id: string) {
  activeMenuId.value = activeMenuId.value === id ? null : id
}

function closeMenu() {
  activeMenuId.value = null
}

// Add & Edit Modal State
const isFormModalOpen = ref(false)
const isEditing = ref(false)
const editingCategoryId = ref<string | null>(null)
const formName = ref('')
const formType = ref<'expense' | 'income'>('expense')
const formIcon = ref('category')
const formAppliesTo = ref('bersama')
const isSubmitting = ref(false)
const formError = ref('')

// Detail Modal State
const isDetailModalOpen = ref(false)
const selectedCategory = ref<Category | null>(null)

// Toast message
const toastMessage = ref('')
let toastTimer: any = null
function showToast(msg: string) {
  toastMessage.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastMessage.value = ''
  }, 4000)
}

watch([isFormModalOpen, isDetailModalOpen], ([openForm, openDetail]) => {
  hideBottomNav.value = openForm || openDetail
})

onUnmounted(() => {
  hideBottomNav.value = false
})

const availableIcons = [
  'restaurant', 'shopping_cart', 'directions_car', 'receipt_long', 'movie', 
  'payments', 'redeem', 'medical_services', 'school', 'home', 
  'flight', 'fitness_center', 'pets', 'child_care', 'sports_esports',
  'local_gas_station', 'electric_bolt', 'wifi', 'fitness_center', 'health_and_safety'
]

async function fetchCategories() {
  isLoading.value = true
  try {
    const token = await getAuthToken()
    const res: any = await $fetch('/api/categories', {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    if (res?.success) {
      categories.value = res.categories || []
    }
  } catch (err) {
    console.error('Failed to fetch categories', err)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchCategories()
})

const filteredCategories = computed(() => {
  return categories.value.filter(cat => {
    const matchesType = cat.type === activeType.value
    const matchesQuery = !searchQuery.value || cat.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    return matchesType && matchesQuery
  })
})

async function toggleCategoryActive(cat: Category) {
  const newActiveState = !cat.isActive
  // Optimistic update
  cat.isActive = newActiveState

  try {
    const token = await getAuthToken()
    await $fetch(`/api/categories/${cat.id}`, {
      method: 'PUT',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: { isActive: newActiveState }
    })
    showToast(`Kategori "${cat.name}" ${newActiveState ? 'diaktifkan' : 'dinonaktifkan'}`)
  } catch (err: any) {
    // Revert
    cat.isActive = !newActiveState
    showToast('Gagal mengubah status kategori')
  }
}

function openAddModal() {
  closeMenu()
  isEditing.value = false
  editingCategoryId.value = null
  formName.value = ''
  formType.value = activeType.value
  formIcon.value = activeType.value === 'income' ? 'payments' : 'category'
  formAppliesTo.value = 'bersama'
  formError.value = ''
  isFormModalOpen.value = true
}

function openEditModal(cat: Category) {
  closeMenu()
  isEditing.value = true
  editingCategoryId.value = cat.id
  formName.value = cat.name
  formType.value = cat.type
  formIcon.value = cat.icon || 'category'
  formAppliesTo.value = cat.appliesTo || 'bersama'
  formError.value = ''
  isFormModalOpen.value = true
}

function openDetailModal(cat: Category) {
  closeMenu()
  selectedCategory.value = cat
  isDetailModalOpen.value = true
}

function closeFormModal() {
  isFormModalOpen.value = false
}

function closeDetailModal() {
  isDetailModalOpen.value = false
  selectedCategory.value = null
}

async function handleSaveCategory() {
  formError.value = ''
  if (!formName.value.trim()) {
    formError.value = 'Nama kategori wajib diisi'
    return
  }

  isSubmitting.value = true
  try {
    const token = await getAuthToken()
    if (isEditing.value && editingCategoryId.value) {
      // UPDATE existing category
      const res: any = await $fetch(`/api/categories/${editingCategoryId.value}`, {
        method: 'PUT',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: {
          name: formName.value.trim(),
          type: formType.value,
          icon: formIcon.value,
          appliesTo: formAppliesTo.value,
        }
      })
      if (res?.success) {
        showToast('Kategori berhasil diperbarui')
        closeFormModal()
        await fetchCategories()
      }
    } else {
      // CREATE new category
      const res: any = await $fetch('/api/categories', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: {
          name: formName.value.trim(),
          type: formType.value,
          icon: formIcon.value,
          appliesTo: formAppliesTo.value,
        }
      })
      if (res?.success) {
        showToast('Kategori baru berhasil ditambahkan')
        closeFormModal()
        await fetchCategories()
      }
    }
  } catch (err: any) {
    formError.value = err?.data?.statusMessage || err?.message || 'Terjadi kesalahan'
  } finally {
    isSubmitting.value = false
  }
}

async function handleDeleteCategory(cat: Category) {
  closeMenu()
  if (!confirm(`Hapus atau nonaktifkan kategori "${cat.name}"?`)) {
    return
  }

  try {
    const token = await getAuthToken()
    const res: any = await $fetch(`/api/categories/${cat.id}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })

    if (res?.success) {
      showToast(res.message || 'Kategori berhasil diproses')
      await fetchCategories()
    }
  } catch (err: any) {
    showToast(err?.data?.statusMessage || 'Gagal menghapus kategori')
  }
}
</script>

<template>
  <div class="kategori-page animate-fade-in pb-32" @click="closeMenu">
    <!-- Header -->
    <div class="header-bar px-4 pt-4 flex items-center gap-3">
      <button
        type="button"
        class="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-surface-variant active:scale-95 transition-all cursor-pointer"
        @click="router.back()"
        aria-label="Kembali"
      >
        <span class="material-symbols-outlined text-[20px]">arrow_back</span>
      </button>
      <div>
        <h1 class="text-lg font-bold text-on-background">Kategori Transaksi</h1>
        <p class="text-xs text-muted">Kelola pengelompokan pemasukan dan pengeluaran</p>
      </div>
    </div>

    <!-- Toast Notification -->
    <div
      v-if="toastMessage"
      class="mx-4 mt-3 p-3 rounded-2xl bg-on-background text-white text-xs font-medium shadow-lg flex items-center gap-2 animate-slide-up z-30"
    >
      <span class="material-symbols-outlined text-[18px] text-emerald-400">info</span>
      <span>{{ toastMessage }}</span>
    </div>

    <!-- Segmented Tab & Search Controls -->
    <div class="px-4 pt-4 space-y-3">
      <!-- Segmented Tab Toggle -->
      <div class="flex bg-surface-container-low p-1 rounded-2xl border border-surface-variant/50">
        <button
          type="button"
          class="flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer"
          :class="activeType === 'expense' ? 'bg-rose-500 text-white shadow-sm' : 'text-on-surface-variant hover:text-on-background'"
          @click="activeType = 'expense'"
        >
          Pengeluaran
        </button>
        <button
          type="button"
          class="flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer"
          :class="activeType === 'income' ? 'bg-emerald-600 text-white shadow-sm' : 'text-on-surface-variant hover:text-on-background'"
          @click="activeType = 'income'"
        >
          Pemasukan
        </button>
      </div>

      <!-- Search Input -->
      <div class="relative w-full">
        <span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-[18px]">search</span>
        <input
          v-model="searchQuery"
          type="text"
          class="w-full bg-white border border-surface-variant/60 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-on-background placeholder:text-muted focus:outline-none focus:border-primary shadow-xs"
          placeholder="Cari kategori..."
        />
      </div>
    </div>

    <!-- Category List -->
    <div class="px-4 pt-4 space-y-2.5">
      <div v-if="isLoading" class="text-center py-10 text-muted text-xs flex flex-col items-center gap-2">
        <span class="material-symbols-outlined animate-spin text-[28px] text-primary">refresh</span>
        <span>Memuat kategori...</span>
      </div>

      <div v-else-if="filteredCategories.length === 0" class="bg-white rounded-3xl p-8 text-center shadow-xs border border-surface-variant/40 flex flex-col items-center">
        <div class="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center text-muted mb-2">
          <span class="material-symbols-outlined text-[24px]">category</span>
        </div>
        <p class="text-sm font-bold text-on-background">Tidak ada kategori ditemukan</p>
        <p class="text-xs text-muted mt-0.5">Klik tombol tambah di bawah untuk membuat kategori baru.</p>
      </div>

      <div
        v-for="cat in filteredCategories"
        :key="cat.id"
        class="relative bg-white rounded-2xl p-3.5 shadow-xs border border-surface-variant/40 flex items-center justify-between hover:shadow-sm transition-all"
      >
        <!-- Left: Icon & Info -->
        <div class="flex items-center gap-3 min-w-0 flex-1 cursor-pointer" @click="openDetailModal(cat)">
          <div
            class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            :class="cat.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'"
          >
            <span class="material-symbols-outlined text-[20px]">{{ cat.icon || 'category' }}</span>
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-[13px] font-bold text-on-background truncate">{{ cat.name }}</span>
              <span
                v-if="!cat.isActive"
                class="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-surface-container text-muted"
              >
                Nonaktif
              </span>
            </div>
            <span class="text-[11px] text-muted capitalize">{{ cat.type === 'income' ? 'Pemasukan' : 'Pengeluaran' }}</span>
          </div>
        </div>

        <!-- Right: Active Toggle & 3-Dot Menu -->
        <div class="flex items-center gap-2 shrink-0">
          <!-- Active Toggle Switch -->
          <button
            type="button"
            class="w-11 h-6 rounded-full transition-colors relative cursor-pointer focus:outline-none"
            :class="cat.isActive ? 'bg-primary' : 'bg-slate-200'"
            @click.stop="toggleCategoryActive(cat)"
            :title="cat.isActive ? 'Klik untuk nonaktifkan' : 'Klik untuk aktifkan'"
          >
            <div
              class="w-4 h-4 rounded-full bg-white transition-transform shadow-xs absolute top-1"
              :class="cat.isActive ? 'translate-x-6 left-0' : 'translate-x-1 left-0'"
            ></div>
          </button>

          <!-- Three Dot Action Menu Button -->
          <div class="relative">
            <button
              type="button"
              class="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:text-on-background hover:bg-surface-container transition-all cursor-pointer"
              @click.stop="toggleMenu(cat.id)"
              aria-label="Menu Opsi"
            >
              <span class="material-symbols-outlined text-[20px]">more_vert</span>
            </button>

            <!-- Dropdown Popover -->
            <div
              v-if="activeMenuId === cat.id"
              class="absolute right-0 top-9 w-36 bg-white rounded-2xl shadow-xl border border-surface-variant/60 py-1.5 z-40 animate-slide-up"
              @click.stop
            >
              <button
                type="button"
                class="w-full px-3 py-2 text-left text-xs font-semibold text-on-surface hover:bg-surface-container-low flex items-center gap-2 cursor-pointer"
                @click="openDetailModal(cat)"
              >
                <span class="material-symbols-outlined text-[16px] text-primary">visibility</span>
                <span>Detail</span>
              </button>
              <button
                type="button"
                class="w-full px-3 py-2 text-left text-xs font-semibold text-on-surface hover:bg-surface-container-low flex items-center gap-2 cursor-pointer"
                @click="openEditModal(cat)"
              >
                <span class="material-symbols-outlined text-[16px] text-amber-500">edit</span>
                <span>Edit</span>
              </button>
              <div class="h-px bg-surface-variant/40 my-1"></div>
              <button
                type="button"
                class="w-full px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                @click="handleDeleteCategory(cat)"
              >
                <span class="material-symbols-outlined text-[16px] text-rose-500">delete</span>
                <span>Hapus</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Floating Action Button: Add Category -->
    <button
      type="button"
      class="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/35 hover:scale-105 active:scale-95 transition-all z-30 cursor-pointer"
      @click="openAddModal"
      aria-label="Tambah Kategori Baru"
    >
      <span class="material-symbols-outlined text-[28px]">add</span>
    </button>

    <!-- ============================================== -->
    <!-- MODAL 1: ADD / EDIT CATEGORY                   -->
    <!-- ============================================== -->
    <div
      v-if="isFormModalOpen"
      class="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
    >
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-black/40 backdrop-blur-[2px]" @click="closeFormModal"></div>

      <!-- Sheet Container -->
      <div class="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl z-10 max-h-[90vh] flex flex-col animate-slide-up">
        <div class="w-10 h-1 rounded-full bg-surface-variant mx-auto mb-3 sm:hidden"></div>

        <div class="flex items-center justify-between pb-3 border-b border-surface-variant/40">
          <div>
            <h2 class="text-base font-bold text-on-background">
              {{ isEditing ? 'Edit Kategori' : 'Tambah Kategori Baru' }}
            </h2>
            <p class="text-xs text-muted">
              {{ isEditing ? 'Perbarui informasi kategori transaksi' : 'Buat kategori pengeluaran atau pemasukan baru' }}
            </p>
          </div>
          <button
            type="button"
            class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-muted hover:text-on-background cursor-pointer"
            @click="closeFormModal"
          >
            <span class="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div class="overflow-y-auto py-4 space-y-4">
          <div v-if="formError" class="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-center gap-2">
            <span class="material-symbols-outlined text-[18px]">error</span>
            <span>{{ formError }}</span>
          </div>

          <!-- Type Selector -->
          <div>
            <label class="block text-xs font-bold text-on-background mb-1.5">Tipe Kategori</label>
            <div class="flex bg-surface-container-low p-1 rounded-2xl border border-surface-variant/50">
              <button
                type="button"
                class="flex-1 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer"
                :class="formType === 'expense' ? 'bg-rose-500 text-white shadow-sm' : 'text-on-surface-variant'"
                @click="formType = 'expense'"
              >
                Pengeluaran
              </button>
              <button
                type="button"
                class="flex-1 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer"
                :class="formType === 'income' ? 'bg-emerald-600 text-white shadow-sm' : 'text-on-surface-variant'"
                @click="formType = 'income'"
              >
                Pemasukan
              </button>
            </div>
          </div>

          <!-- Icon Grid -->
          <div>
            <label class="block text-xs font-bold text-on-background mb-1.5">Pilih Ikon</label>
            <div class="grid grid-cols-5 gap-2 max-h-36 overflow-y-auto p-1 bg-surface-container-low rounded-2xl border border-surface-variant/40">
              <button
                v-for="icon in availableIcons"
                :key="icon"
                type="button"
                class="w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer"
                :class="formIcon === icon ? 'bg-primary text-white shadow-sm scale-105' : 'bg-white text-muted hover:text-on-background'"
                @click="formIcon = icon"
              >
                <span class="material-symbols-outlined text-[20px]">{{ icon }}</span>
              </button>
            </div>
          </div>

          <!-- Name -->
          <div>
            <label class="block text-xs font-bold text-on-background mb-1.5">Nama Kategori</label>
            <input
              v-model="formName"
              type="text"
              class="w-full bg-surface-container-low border border-surface-variant/60 rounded-2xl px-3.5 py-2.5 text-xs text-on-background focus:outline-none focus:border-primary shadow-xs"
              placeholder="Misal: Belanja Groceries"
            />
          </div>
        </div>

        <div class="pt-3 border-t border-surface-variant/40 flex gap-2">
          <button
            type="button"
            class="flex-1 py-2.5 rounded-xl border border-surface-variant/60 text-xs font-bold text-muted hover:bg-surface-container transition-all cursor-pointer"
            @click="closeFormModal"
          >
            Batal
          </button>
          <button
            type="button"
            class="flex-1 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 active:scale-95 transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            :disabled="isSubmitting"
            @click="handleSaveCategory"
          >
            <span v-if="isSubmitting" class="material-symbols-outlined animate-spin text-[16px]">refresh</span>
            <span>{{ isEditing ? 'Simpan Perubahan' : 'Buat Kategori' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ============================================== -->
    <!-- MODAL 2: CATEGORY DETAIL                       -->
    <!-- ============================================== -->
    <div
      v-if="isDetailModalOpen && selectedCategory"
      class="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
    >
      <div class="fixed inset-0 bg-black/40 backdrop-blur-[2px]" @click="closeDetailModal"></div>

      <div class="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl z-10 animate-slide-up space-y-4">
        <div class="w-10 h-1 rounded-full bg-surface-variant mx-auto mb-2 sm:hidden"></div>

        <!-- Header -->
        <div class="flex items-center justify-between pb-3 border-b border-surface-variant/40">
          <div class="flex items-center gap-3">
            <div
              class="w-12 h-12 rounded-2xl flex items-center justify-center"
              :class="selectedCategory.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'"
            >
              <span class="material-symbols-outlined text-[26px]">{{ selectedCategory.icon || 'category' }}</span>
            </div>
            <div>
              <h2 class="text-base font-bold text-on-background">{{ selectedCategory.name }}</h2>
              <span
                class="text-[10px] font-bold px-2 py-0.5 rounded-full"
                :class="selectedCategory.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-surface-container text-muted'"
              >
                {{ selectedCategory.isActive ? 'Aktif' : 'Nonaktif' }}
              </span>
            </div>
          </div>
          <button
            type="button"
            class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-muted hover:text-on-background cursor-pointer"
            @click="closeDetailModal"
          >
            <span class="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <!-- Details Info Table -->
        <div class="space-y-2.5 text-xs">
          <div class="flex justify-between p-3 rounded-2xl bg-surface-container-low">
            <span class="text-muted">Tipe Kategori</span>
            <span class="font-bold capitalize">{{ selectedCategory.type === 'income' ? 'Pemasukan' : 'Pengeluaran' }}</span>
          </div>
          <div class="flex justify-between p-3 rounded-2xl bg-surface-container-low">
            <span class="text-muted">Status Seleksi Transaksi</span>
            <span class="font-bold" :class="selectedCategory.isActive ? 'text-emerald-600' : 'text-muted'">
              {{ selectedCategory.isActive ? 'Tersedia di Menu Catat' : 'Disembunyikan dari Menu Catat' }}
            </span>
          </div>
          <div class="flex justify-between p-3 rounded-2xl bg-surface-container-low">
            <span class="text-muted">Kategori Bawaan</span>
            <span class="font-bold">{{ selectedCategory.isDefault ? 'Ya (Sistem)' : 'Kustom Pengguna' }}</span>
          </div>
        </div>

        <!-- Action Buttons in Detail -->
        <div class="pt-2 flex gap-2">
          <button
            type="button"
            class="flex-1 py-2.5 rounded-xl border border-amber-300 text-amber-700 bg-amber-50 text-xs font-bold hover:bg-amber-100 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            @click="openEditModal(selectedCategory)"
          >
            <span class="material-symbols-outlined text-[16px]">edit</span>
            <span>Edit Kategori</span>
          </button>
          <button
            type="button"
            class="flex-1 py-2.5 rounded-xl border border-rose-200 text-rose-600 bg-rose-50 text-xs font-bold hover:bg-rose-100 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            @click="handleDeleteCategory(selectedCategory); closeDetailModal()"
          >
            <span class="material-symbols-outlined text-[16px]">delete</span>
            <span>Hapus</span>
          </button>
        </div>
      </div>
    </div>

  </div>
</template>
