<script setup lang="ts">
const {
  isHouseholdDetailOpen,
  closeHouseholdDetail,
  openHouseholdEdit,
  openHouseholdUnlink,
  currentHousehold,
  currentUser,
} = useAuth()

const householdName = computed(() => currentHousehold.value?.name || 'Keluarga Kami')
const inviteCode = computed(() => currentHousehold.value?.inviteCode || 'CC-FAM')
const suami = computed(() => currentHousehold.value?.suami)
const istri = computed(() => currentHousehold.value?.istri)

const userRole = computed(() => currentUser.value?.role || 'suami')
const partnerRole = computed(() => (userRole.value === 'suami' ? 'istri' : 'suami'))

const currentMember = computed(() => {
  return userRole.value === 'suami' ? suami.value : istri.value
})

const partnerMember = computed(() => {
  return userRole.value === 'suami' ? istri.value : suami.value
})

const connectedDateFormatted = computed(() => {
  if (currentHousehold.value?.createdAt) {
    const d = new Date(currentHousehold.value.createdAt)
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  }
  return '12 Okt 2023'
})

const daysTogether = computed(() => {
  if (currentHousehold.value?.createdAt) {
    const d = new Date(currentHousehold.value.createdAt).getTime()
    const now = Date.now()
    const days = Math.max(1, Math.floor((now - d) / (1000 * 60 * 60 * 24)))
    return `${days} hari bersama`
  }
  return 'Hari ini'
})

function handleEdit() {
  openHouseholdEdit()
}

function handleUnlink() {
  openHouseholdUnlink()
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="isHouseholdDetailOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
        @click.self="closeHouseholdDetail"
      >
        <div class="w-full max-w-md min-h-screen sm:min-h-0 bg-[#fcf8ff] sm:rounded-[32px] shadow-2xl relative flex flex-col justify-between overflow-hidden border border-purple-100 animate-scale-up">

          <!-- Top Header Navigation -->
          <div>
            <div class="px-5 pt-6 pb-3 flex items-center justify-between border-b border-purple-50 bg-[#fcf8ff]">
              <div class="flex items-center gap-3">
                <button
                  type="button"
                  class="w-10 h-10 rounded-full bg-white shadow-xs border border-purple-100 flex items-center justify-center text-slate-700 hover:bg-slate-50 transition active:scale-95 cursor-pointer"
                  @click="closeHouseholdDetail"
                  aria-label="Kembali"
                >
                  <span class="material-symbols-outlined text-[20px]">arrow_back</span>
                </button>
                <div>
                  <h1 class="text-base font-bold text-slate-900 leading-tight">Detail Keluarga</h1>
                  <p class="text-xs text-purple-600 font-medium flex items-center gap-1.5 mt-0.5">
                    <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Connected Household
                  </p>
                </div>
              </div>
              <button
                type="button"
                class="w-10 h-10 rounded-full bg-white shadow-xs border border-purple-100 flex items-center justify-center text-purple-600 hover:bg-purple-50 transition active:scale-95 cursor-pointer"
                @click="handleEdit"
                aria-label="Edit Detail Keluarga"
              >
                <span class="material-symbols-outlined text-[18px]">edit</span>
              </button>
            </div>

            <!-- Content -->
            <div class="p-5 space-y-5">
              <!-- Hero Family Card -->
              <div class="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 rounded-3xl p-6 text-white shadow-lg shadow-indigo-200 relative overflow-hidden">
                <div class="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
                <div class="absolute right-4 top-4 text-white/20 text-5xl font-black pointer-events-none">
                  <span class="material-symbols-outlined text-[48px]">diversity_1</span>
                </div>
                <div class="flex items-center gap-2 mb-4">
                  <span class="inline-flex items-center gap-1.5 bg-emerald-400/20 text-emerald-200 text-xs px-2.5 py-1 rounded-full border border-emerald-400/30 font-semibold backdrop-blur-sm">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Aktif &amp; Tersinkron
                  </span>
                  <span class="text-xs text-white/80 bg-white/15 px-2.5 py-1 rounded-full font-medium">
                    ID: {{ inviteCode }}
                  </span>
                </div>
                <div class="mb-4">
                  <div class="text-[11px] font-medium text-purple-200 uppercase tracking-wider mb-1">Nama Keluarga</div>
                  <h2 class="text-2xl font-extrabold text-white tracking-tight">{{ householdName }}</h2>
                  <p class="text-xs text-indigo-100 mt-0.5">
                    {{ suami?.fullName || 'Suami' }} (Suami) &amp; {{ istri?.fullName || 'Istri' }} (Istri)
                  </p>
                </div>
                <!-- Dual Badge Avatar Connector -->
                <div class="pt-4 border-t border-white/15 flex items-center justify-between text-xs">
                  <div class="flex items-center gap-2">
                    <div class="flex -space-x-2">
                      <div class="w-8 h-8 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center font-bold text-white text-xs shadow-xs">
                        {{ suami?.initial || 'S' }}
                      </div>
                      <div class="w-8 h-8 rounded-full bg-pink-500 border-2 border-white flex items-center justify-center font-bold text-white text-xs shadow-xs">
                        {{ istri?.initial || 'I' }}
                      </div>
                    </div>
                    <span class="text-white/90 font-medium text-[11px]">2 Anggota Terhubung</span>
                  </div>
                  <div class="text-right text-indigo-100 text-[11px]">
                    Terhubung sejak: <br/><strong class="text-white font-semibold">{{ connectedDateFormatted }}</strong>
                  </div>
                </div>
              </div>

              <!-- Section: Informasi Keluarga -->
              <div>
                <div class="flex items-center justify-between mb-3 px-1">
                  <h3 class="text-xs font-bold text-slate-800 uppercase tracking-wider">Informasi Keluarga</h3>
                  <button
                    type="button"
                    class="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                    @click="handleEdit"
                  >
                    <span class="material-symbols-outlined text-[14px]">edit_square</span> Edit Info
                  </button>
                </div>
                <div class="bg-white rounded-2xl p-4 shadow-xs border border-purple-50 space-y-3.5">
                  <div class="flex items-center justify-between py-1 border-b border-slate-50">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-xl bg-purple-50 text-indigo-600 flex items-center justify-center text-xs">
                        <span class="material-symbols-outlined text-[18px]">home</span>
                      </div>
                      <div>
                        <div class="text-[11px] text-slate-400 font-medium">Nama Keluarga</div>
                        <div class="text-sm font-semibold text-slate-800">{{ householdName }}</div>
                      </div>
                    </div>
                    <span class="text-xs bg-purple-50 text-indigo-700 px-2 py-0.5 rounded-md font-semibold">Utama</span>
                  </div>
                  <div class="flex items-center justify-between py-1 border-b border-slate-50">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs">
                        <span class="material-symbols-outlined text-[18px]">sync</span>
                      </div>
                      <div>
                        <div class="text-[11px] text-slate-400 font-medium">Status Hubungan</div>
                        <div class="text-sm font-semibold text-slate-800">Tersinkronisasi Otomatis</div>
                      </div>
                    </div>
                    <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  </div>
                  <div class="flex items-center justify-between py-1 border-b border-slate-50">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xs">
                        <span class="material-symbols-outlined text-[18px]">calendar_today</span>
                      </div>
                      <div>
                        <div class="text-[11px] text-slate-400 font-medium">Tanggal Terhubung</div>
                        <div class="text-sm font-semibold text-slate-800">{{ connectedDateFormatted }}</div>
                      </div>
                    </div>
                    <span class="text-xs text-slate-500">{{ daysTogether }}</span>
                  </div>
                  <div class="flex items-center justify-between py-1">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xs">
                        <span class="material-symbols-outlined text-[18px]">account_balance_wallet</span>
                      </div>
                      <div>
                        <div class="text-[11px] text-slate-400 font-medium">Mode Pembagian Keuangan</div>
                        <div class="text-sm font-semibold text-slate-800">Dual-Wallet Transparan</div>
                      </div>
                    </div>
                    <span class="material-symbols-outlined text-slate-300 text-[18px]">info</span>
                  </div>
                </div>
              </div>

              <!-- Section: Anggota Keluarga (User + Partner Cards) -->
              <div>
                <div class="flex items-center justify-between mb-3 px-1">
                  <h3 class="text-xs font-bold text-slate-800 uppercase tracking-wider">Anggota Keluarga (2)</h3>
                  <span class="text-xs font-semibold text-slate-400">Suami &amp; Istri</span>
                </div>
                <div class="space-y-3">
                  <!-- User Card -->
                  <div class="bg-white rounded-2xl p-4 shadow-xs border border-purple-50 flex items-center justify-between relative overflow-hidden">
                    <div
                      class="absolute left-0 top-0 bottom-0 w-1.5 rounded-l"
                      :class="userRole === 'suami' ? 'bg-blue-500' : 'bg-pink-500'"
                    ></div>
                    <div class="flex items-center gap-3 pl-2">
                      <div
                        class="w-11 h-11 rounded-full text-white font-bold flex items-center justify-center text-sm shadow-xs"
                        :class="userRole === 'suami' ? 'bg-blue-500' : 'bg-pink-500'"
                      >
                        {{ currentMember?.initial || (userRole === 'suami' ? 'S' : 'I') }}
                      </div>
                      <div>
                        <div class="flex items-center gap-2">
                          <h4 class="text-sm font-bold text-slate-900">{{ currentMember?.fullName || currentUser?.fullName }}</h4>
                          <span
                            class="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            :class="userRole === 'suami' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'"
                          >
                            Anda
                          </span>
                        </div>
                        <p class="text-xs text-slate-500">Role: <strong class="font-semibold capitalize">{{ userRole }}</strong></p>
                        <p class="text-[11px] text-slate-400">{{ currentMember?.email || currentUser?.email }}</p>
                      </div>
                    </div>
                    <div class="text-right">
                      <span class="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                        <span class="material-symbols-outlined text-[13px]">check</span> Aktif
                      </span>
                    </div>
                  </div>

                  <!-- Partner Card -->
                  <div class="bg-white rounded-2xl p-4 shadow-xs border border-purple-50 flex items-center justify-between relative overflow-hidden">
                    <div
                      class="absolute left-0 top-0 bottom-0 w-1.5 rounded-l"
                      :class="partnerRole === 'suami' ? 'bg-blue-500' : 'bg-pink-500'"
                    ></div>
                    <div class="flex items-center gap-3 pl-2">
                      <div
                        class="w-11 h-11 rounded-full text-white font-bold flex items-center justify-center text-sm shadow-xs"
                        :class="partnerRole === 'suami' ? 'bg-blue-500' : 'bg-pink-500'"
                      >
                        {{ partnerMember?.initial || (partnerRole === 'suami' ? 'S' : 'I') }}
                      </div>
                      <div>
                        <div class="flex items-center gap-2">
                          <h4 class="text-sm font-bold text-slate-900">{{ partnerMember?.fullName || 'Pasangan' }}</h4>
                          <span
                            class="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            :class="partnerRole === 'suami' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'"
                          >
                            Pasangan
                          </span>
                        </div>
                        <p class="text-xs text-slate-500">Role: <strong class="font-semibold capitalize">{{ partnerRole }}</strong></p>
                        <p class="text-[11px] text-slate-400">{{ partnerMember?.email || 'pasangan@couplecash.app' }}</p>
                      </div>
                    </div>
                    <div class="text-right">
                      <span class="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 bg-purple-50 px-2 py-1 rounded-full">
                        <span class="material-symbols-outlined text-[13px]">link</span> Terhubung
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Section: Kelola Hubungan & Aksi Harta Bersama Note -->
              <div class="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 text-xs text-amber-900 space-y-1.5">
                <div class="flex items-center gap-2 font-bold text-amber-950">
                  <span class="material-symbols-outlined text-[18px] text-amber-600">shield</span>
                  Perlindungan Harta &amp; Rekening Pribadi
                </div>
                <p class="text-[11.5px] leading-relaxed text-amber-800/90">
                  Seluruh saldo akun individual dan riwayat transaksi tetap terjaga utuh dalam database Anda. Fitur <strong>Penyelesaian Harta Bersama</strong> akan mendampingi pembagian pos akun bersama jika diperlukan.
                </p>
              </div>

              <!-- Action Buttons -->
              <div class="pt-2 space-y-3 pb-6">
                <button
                  type="button"
                  class="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 transition flex items-center justify-center gap-2 text-sm cursor-pointer"
                  @click="handleEdit"
                >
                  <span class="material-symbols-outlined text-[18px]">edit_note</span>
                  Edit Detail Keluarga
                </button>
                <!-- Unlink Button with broken chain icon -->
                <button
                  type="button"
                  class="w-full py-3.5 px-4 bg-rose-50 hover:bg-rose-100/80 active:scale-[0.99] text-rose-600 font-bold rounded-2xl border border-rose-200/70 transition flex items-center justify-center gap-2 text-sm cursor-pointer"
                  @click="handleUnlink"
                >
                  <span class="material-symbols-outlined text-[18px]">link_off</span>
                  Putuskan Hubungan
                </button>
              </div>
            </div>
          </div>

          <!-- Quick Footer Note -->
          <div class="px-5 pb-6 text-center text-slate-400 text-[11px]">
            CoupleCash Connected Household • ID: {{ inviteCode }}
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.animate-scale-up {
  animation: scaleUp 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes scaleUp {
  from {
    transform: scale(0.95);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
