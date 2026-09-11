<script setup lang="ts">
const {
  isHouseholdEditOpen,
  closeHouseholdEdit,
  currentHousehold,
  currentUser,
  updateHouseholdInfo,
} = useAuth()

const householdNameInput = ref('')
const householdMottoInput = ref('')
const isSaving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const suami = computed(() => currentHousehold.value?.suami)
const istri = computed(() => currentHousehold.value?.istri)
const userRole = computed(() => currentUser.value?.role || 'suami')

watch(isHouseholdEditOpen, (open) => {
  if (open) {
    householdNameInput.value = currentHousehold.value?.name || ''
    householdMottoInput.value = currentHousehold.value?.motto || ''
    errorMessage.value = ''
    successMessage.value = ''
  }
})

async function handleSave() {
  const trimmedName = householdNameInput.value.trim()
  if (!trimmedName || trimmedName.length < 3) {
    errorMessage.value = 'Nama keluarga wajib diisi minimal 3 karakter'
    return
  }

  isSaving.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const res = await updateHouseholdInfo(trimmedName, householdMottoInput.value.trim())
    if (res.success) {
      successMessage.value = 'Detail keluarga berhasil diperbarui!'
      setTimeout(() => {
        closeHouseholdEdit()
      }, 700)
    } else {
      errorMessage.value = res.message || 'Gagal menyimpan perubahan'
    }
  } catch (err: any) {
    errorMessage.value = err?.message || 'Terjadi kesalahan saat menyimpan'
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="isHouseholdEditOpen"
        class="fixed inset-0 z-[110] bg-[#fcf8ff] dark:bg-[#0B0D12] overflow-y-auto min-h-dvh flex flex-col"
      >
        <div class="w-full max-w-md mx-auto min-h-full flex flex-col justify-between">

          <div>
            <!-- Navigation Header (Sticky with Arrow Back) -->
            <div class="sticky top-0 z-20 px-5 pt-4 pb-3 flex items-center justify-between border-b border-purple-100/60 dark:border-[#282b37] bg-[#fcf8ff]/95 dark:bg-[#0B0D12]/95 backdrop-blur-md shadow-xs">
              <div class="flex items-center gap-3">
                <button
                  type="button"
                  class="w-10 h-10 rounded-full bg-white dark:bg-[#15171e] shadow-xs border border-purple-100 dark:border-[#282b37] flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1e2029] transition active:scale-95 cursor-pointer"
                  @click="closeHouseholdEdit"
                  aria-label="Kembali"
                >
                  <span class="material-symbols-outlined text-[20px]">arrow_back</span>
                </button>
                <div>
                  <h1 class="text-base font-bold text-slate-900 dark:text-white leading-tight">Edit Detail Keluarga</h1>
                  <p class="text-xs text-slate-500 dark:text-slate-400">Perbarui identitas rumah tangga</p>
                </div>
              </div>
              <span class="text-xs font-semibold text-purple-600 dark:text-indigo-400 bg-purple-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-full border border-purple-100 dark:border-indigo-800/40">
                Connected
              </span>
            </div>

            <!-- Form Content -->
            <form class="p-5 space-y-4" @submit.prevent="handleSave">

              <!-- Family Avatar / Emblem Preview -->
              <div class="bg-white dark:bg-[#15171e] rounded-3xl p-4 border border-purple-50 dark:border-[#282b37] shadow-xs text-center">
                <div class="relative inline-flex mx-auto mb-2">
                  <div class="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl shadow-md shadow-indigo-200 dark:shadow-none">
                    <span class="material-symbols-outlined text-[32px]">diversity_1</span>
                  </div>
                </div>
                <div class="text-xs font-bold text-slate-800 dark:text-slate-200">Ikon Rumah Tangga</div>
                <p class="text-[11px] text-slate-400">Simbol visual untuk dashboard bersama</p>
              </div>

              <!-- Error & Success alerts -->
              <div v-if="errorMessage" class="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2">
                <span class="material-symbols-outlined text-[16px]">error</span>
                <span>{{ errorMessage }}</span>
              </div>
              <div v-if="successMessage" class="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs rounded-xl flex items-center gap-2">
                <span class="material-symbols-outlined text-[16px]">check_circle</span>
                <span>{{ successMessage }}</span>
              </div>

              <!-- Field: Nama Keluarga -->
              <div class="space-y-1.5">
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between">
                  <span>Nama Keluarga <span class="text-rose-500">*</span></span>
                  <span class="text-[11px] font-normal text-slate-400">Wajib diisi (min. 3)</span>
                </label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-indigo-500">
                    <span class="material-symbols-outlined text-[18px]">home</span>
                  </div>
                  <input
                    v-model="householdNameInput"
                    type="text"
                    maxlength="40"
                    minlength="3"
                    required
                    placeholder="Contoh: Keluarga Pratama"
                    class="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#1e2029] border border-purple-100 dark:border-[#2e313d] focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 rounded-2xl text-sm font-semibold text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition shadow-xs"
                  />
                </div>
                <p class="text-[11px] text-slate-400 pl-1">
                  Nama ini akan muncul pada kartu saldo, ringkasan bulanan, dan profil bersama.
                </p>
              </div>

              <!-- Field: Slogan / Moto Finansial Keluarga -->
              <div class="space-y-1.5">
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-200">
                  Catatan / Moto Finansial (Opsional)
                </label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-purple-400">
                    <span class="material-symbols-outlined text-[18px]">format_quote</span>
                  </div>
                  <input
                    v-model="householdMottoInput"
                    type="text"
                    maxlength="100"
                    placeholder="Contoh: Menabung untuk masa depan cerah"
                    class="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#1e2029] border border-purple-100 dark:border-[#2e313d] focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 rounded-2xl text-sm font-medium text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition shadow-xs"
                  />
                </div>
              </div>

              <!-- Field: Role Pengguna & Pasangan -->
              <div class="space-y-2 pt-1">
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-200">
                  Peran Dalam Rumah Tangga
                </label>
                <div class="grid grid-cols-2 gap-3">
                  <div class="bg-blue-50/60 dark:bg-blue-950/25 border border-blue-100 dark:border-blue-900/40 rounded-2xl p-3 text-left">
                    <div class="text-[11px] font-semibold text-blue-700 dark:text-blue-300 mb-1 flex items-center gap-1.5">
                      <span class="w-2 h-2 rounded-full bg-blue-500"></span> {{ userRole === 'suami' ? 'Anda (Suami)' : 'Pasangan (Suami)' }}
                    </div>
                    <div class="text-xs font-bold text-slate-800 dark:text-slate-200">{{ suami?.fullName || 'Suami' }}</div>
                    <div class="text-[10px] text-slate-400 mt-1">Role Suami</div>
                  </div>
                  <div class="bg-pink-50/60 dark:bg-pink-950/25 border border-pink-100 dark:border-pink-900/40 rounded-2xl p-3 text-left">
                    <div class="text-[11px] font-semibold text-pink-700 dark:text-pink-300 mb-1 flex items-center gap-1.5">
                      <span class="w-2 h-2 rounded-full bg-pink-500"></span> {{ userRole === 'istri' ? 'Anda (Istri)' : 'Pasangan (Istri)' }}
                    </div>
                    <div class="text-xs font-bold text-slate-800 dark:text-slate-200">{{ istri?.fullName || 'Istri' }}</div>
                    <div class="text-[10px] text-slate-400 mt-1">Role Istri</div>
                  </div>
                </div>
                <p class="text-[10.5px] text-slate-400 pl-1">
                  *Identitas login (email &amp; akun auth) terlindungi dan tidak berubah.
                </p>
              </div>

              <!-- Warning Card for Auto-Sync -->
              <div class="bg-purple-50/80 dark:bg-indigo-950/30 rounded-2xl p-3.5 border border-purple-100 dark:border-indigo-800/40 text-xs text-purple-900 dark:text-indigo-200 flex items-start gap-2.5">
                <span class="material-symbols-outlined text-[18px] text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">sync</span>
                <div>
                  <span class="font-bold">Sinkronisasi Instan:</span>
                  Perubahan nama keluarga akan langsung ter-update di layar pasangan tanpa perlu keluar atau login ulang.
                </div>
              </div>
            </form>
          </div>

          <!-- Bottom Action Buttons -->
          <div class="p-5 border-t border-purple-50 dark:border-[#282b37] bg-white/60 dark:bg-[#0B0D12]/80 backdrop-blur-sm space-y-2 pb-8">
            <button
              type="button"
              :disabled="isSaving"
              class="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] disabled:opacity-50 text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none transition flex items-center justify-center gap-2 text-sm cursor-pointer"
              @click="handleSave"
            >
              <span v-if="isSaving" class="material-symbols-outlined animate-spin text-[18px]">refresh</span>
              <span v-else class="material-symbols-outlined text-[18px]">save</span>
              <span>{{ isSaving ? 'Menyimpan...' : 'Simpan Perubahan' }}</span>
            </button>
            <button
              type="button"
              class="w-full py-2.5 text-slate-500 dark:text-slate-400 font-semibold text-xs hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
              @click="closeHouseholdEdit"
            >
              Batal
            </button>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>
