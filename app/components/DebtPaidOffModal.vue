<script setup lang="ts">
const props = defineProps<{
  isOpen: boolean
  account: {
    id: string
    name: string
    icon?: string
    accountType: string
    balance: number
  } | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'success', updated: any): void
}>()

const { getAuthToken } = useAuth()

const newName = ref('')
const selectedType = ref<'bank' | 'e_wallet' | 'cash' | 'deposito'>('bank')
const selectedIcon = ref('account_balance')
const isSubmitting = ref(false)
const errorMessage = ref('')

const availableIcons = [
  { id: 'account_balance', label: 'Bank' },
  { id: 'account_balance_wallet', label: 'E-Wallet' },
  { id: 'payments', label: 'Tunai' },
  { id: 'savings', label: 'Tabungan' },
  { id: 'flight', label: 'Liburan' },
  { id: 'home', label: 'Rumah' },
  { id: 'shopping_bag', label: 'Belanja' },
  { id: 'credit_card', label: 'Kartu' },
]

const accountTypes = [
  { value: 'bank', label: 'Rekening Bank', desc: 'BCA, Mandiri, BNI, BRI, dll' },
  { value: 'e_wallet', label: 'E-Wallet', desc: 'GoPay, OVO, DANA, ShopeePay' },
  { value: 'cash', label: 'Dompet Tunai', desc: 'Uang fisik & cash flow harian' },
  { value: 'deposito', label: 'Tabungan / Deposito', desc: 'Simpanan jangka menengah/panjang' },
]

watch(
  () => props.account,
  (acc) => {
    if (acc) {
      newName.value = acc.name
      selectedType.value = 'bank'
      selectedIcon.value = 'savings'
      errorMessage.value = ''
    }
  },
  { immediate: true }
)

async function handleSave() {
  if (!props.account) return
  const trimmed = newName.value.trim()
  if (!trimmed) {
    errorMessage.value = 'Nama pos akun wajib diisi'
    return
  }

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    const token = await getAuthToken()
    const res: any = await $fetch(`/api/accounts/${props.account.id}`, {
      method: 'PUT',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: {
        name: trimmed,
        accountType: selectedType.value,
        icon: selectedIcon.value,
        debtStatus: 'paid_off',
      },
    })

    if (res?.success) {
      emit('success', res.account)
      emit('close')
    } else {
      errorMessage.value = res?.message || 'Gagal mengubah pos akun'
    }
  } catch (err: any) {
    errorMessage.value = err?.data?.statusMessage || err?.message || 'Gagal menyimpan perubahan'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
        @click.self="emit('close')"
      >
        <div class="w-full max-w-md bg-[#fcf8ff] rounded-[28px] shadow-2xl overflow-hidden border border-purple-100 p-5 sm:p-6 text-left space-y-4 animate-scale-up">

          <!-- Header -->
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-3">
              <div class="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-xs">
                <span class="material-symbols-outlined text-[24px]">verified</span>
              </div>
              <div>
                <h2 class="text-base font-bold text-slate-900 leading-tight">Pos Akun Sudah Lunas</h2>
                <span class="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Hutang Lunas 100%
                </span>
              </div>
            </div>
            <button
              type="button"
              class="w-8 h-8 rounded-full bg-white shadow-xs border border-purple-100 flex items-center justify-center text-slate-500 hover:bg-slate-50 cursor-pointer"
              @click="emit('close')"
              aria-label="Tutup"
            >
              <span class="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          <!-- Description Banner -->
          <div class="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-3 text-xs text-emerald-900">
            Hutang ini telah dilunasi! Anda dapat menyesuaikan kembali pos akun ini agar dapat digunakan sebagai pos akun biasa.
            <span class="block text-[11px] text-emerald-700 mt-1 font-medium">
              *Seluruh riwayat transaksi masa lalu tetap tersimpan utuh di histori pembukuan.
            </span>
          </div>

          <div v-if="errorMessage" class="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
            {{ errorMessage }}
          </div>

          <!-- Form Fields -->
          <div class="space-y-3.5">
            <!-- Field 1: Nama Pos Akun -->
            <div class="space-y-1">
              <label class="block text-xs font-bold text-slate-700">
                Nama Pos Akun Baru
              </label>
              <input
                v-model="newName"
                type="text"
                placeholder="Contoh: Tabungan Liburan"
                class="w-full px-3.5 py-2.5 bg-white border border-purple-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl text-sm font-semibold text-slate-800 outline-none transition shadow-xs"
              />
            </div>

            <!-- Field 2: Jenis Akun Baru -->
            <div class="space-y-1">
              <label class="block text-xs font-bold text-slate-700">
                Pilih Kategori Pos Akun
              </label>
              <div class="grid grid-cols-2 gap-2">
                <button
                  v-for="t in accountTypes"
                  :key="t.value"
                  type="button"
                  class="p-2.5 rounded-xl border text-left transition-all cursor-pointer"
                  :class="selectedType === t.value ? 'bg-indigo-50 border-indigo-300 shadow-xs' : 'bg-white border-purple-100 hover:bg-slate-50'"
                  @click="selectedType = t.value as any"
                >
                  <div class="text-xs font-bold" :class="selectedType === t.value ? 'text-indigo-700' : 'text-slate-800'">
                    {{ t.label }}
                  </div>
                  <div class="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                    {{ t.desc }}
                  </div>
                </button>
              </div>
            </div>

            <!-- Field 3: Pilihan Ikon -->
            <div class="space-y-1">
              <label class="block text-xs font-bold text-slate-700">
                Pilih Ikon Baru
              </label>
              <div class="flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar">
                <button
                  v-for="ic in availableIcons"
                  :key="ic.id"
                  type="button"
                  class="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 transition-all cursor-pointer"
                  :class="selectedIcon === ic.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' : 'bg-white text-slate-700 border-purple-100 hover:bg-purple-50'"
                  :title="ic.label"
                  @click="selectedIcon = ic.id"
                >
                  <span class="material-symbols-outlined text-[20px]">{{ ic.id }}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Bottom Action Buttons -->
          <div class="pt-2 space-y-2">
            <button
              type="button"
              :disabled="isSubmitting"
              class="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] disabled:opacity-50 text-white font-bold rounded-xl shadow-md shadow-indigo-200 transition flex items-center justify-center gap-2 text-sm cursor-pointer"
              @click="handleSave"
            >
              <span v-if="isSubmitting" class="material-symbols-outlined animate-spin text-[16px]">refresh</span>
              <span v-else class="material-symbols-outlined text-[16px]">check</span>
              <span>{{ isSubmitting ? 'Menyimpan...' : 'Jadikan Pos Akun Biasa' }}</span>
            </button>
            <button
              type="button"
              class="w-full py-2 text-slate-500 font-semibold text-xs hover:text-slate-700 transition cursor-pointer"
              @click="emit('close')"
            >
              Batal
            </button>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>
