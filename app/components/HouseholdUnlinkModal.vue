<script setup lang="ts">
const {
  isHouseholdUnlinkOpen,
  closeHouseholdUnlink,
  currentHousehold,
  unlinkPartner,
} = useAuth()

const householdName = computed(() => currentHousehold.value?.name || 'Keluarga')
const suamiName = computed(() => currentHousehold.value?.suami?.firstName || 'Suami')
const istriName = computed(() => currentHousehold.value?.istri?.firstName || 'Istri')

const isUnlinking = ref(false)
const errorMessage = ref('')

async function handleConfirmUnlink() {
  isUnlinking.value = true
  errorMessage.value = ''
  try {
    const res = await unlinkPartner()
    if (res.success) {
      closeHouseholdUnlink()
    } else {
      errorMessage.value = res.message || 'Gagal memutuskan hubungan'
    }
  } catch (err: any) {
    errorMessage.value = err?.message || 'Terjadi kesalahan sistem'
  } finally {
    isUnlinking.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="isHouseholdUnlinkOpen"
        class="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
        @click.self="closeHouseholdUnlink"
      >
        <div class="w-full max-w-[390px] bg-[#fcf8ff] rounded-[28px] shadow-2xl overflow-hidden border border-purple-100/80 p-5 sm:p-6 text-center space-y-4 animate-scale-up">

          <!-- Destructive Warning Icon with broken chain badge -->
          <div class="relative inline-flex mx-auto mt-1">
            <div class="w-20 h-20 rounded-full bg-rose-100/80 flex items-center justify-center text-rose-600 text-3xl shadow-inner ring-8 ring-rose-50/70">
              <span class="material-symbols-outlined text-[36px]">link_off</span>
            </div>
            <span class="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-md">
              <span class="block w-6 h-6 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center font-bold">
                <span class="material-symbols-outlined text-[14px]">warning</span>
              </span>
            </span>
          </div>

          <!-- Modal Title & Couple Subtitle -->
          <div class="space-y-1">
            <h2 class="text-xl font-extrabold text-slate-900 tracking-tight">Putuskan Hubungan?</h2>
            <p class="text-xs font-semibold text-purple-600">{{ householdName }} ({{ suamiName }} &amp; {{ istriName }})</p>
          </div>

          <div v-if="errorMessage" class="p-2.5 bg-rose-100/80 border border-rose-200 text-rose-800 text-xs rounded-xl">
            {{ errorMessage }}
          </div>

          <!-- Warning Body Box (Soft Red) -->
          <div class="bg-rose-50/70 border border-rose-100/90 rounded-2xl p-3.5 text-left space-y-2.5">
            <p class="text-xs text-rose-900 font-medium leading-relaxed">
              Anda akan melepaskan hubungan dengan pasangan. <strong>Data keuangan pribadi tetap dipertahankan.</strong>
            </p>
            <div class="pt-2 border-t border-rose-200/60 text-[11.5px] text-slate-600 space-y-1.5">
              <div class="flex items-start gap-2 leading-snug">
                <span class="material-symbols-outlined text-amber-500 text-[16px] shrink-0 mt-0.5">error</span>
                <span><strong>Akses Rekening Bersama:</strong> Rekening gabungan tidak akan langsung dihapus, melainkan dibekukan untuk penyesuaian.</span>
              </div>
              <div class="flex items-start gap-2 leading-snug">
                <span class="material-symbols-outlined text-emerald-600 text-[16px] shrink-0 mt-0.5">check_circle</span>
                <span><strong>Data Aman:</strong> Tidak ada transaksi atau saldo individual yang dihapus secara otomatis.</span>
              </div>
            </div>
          </div>

          <!-- Notice for Next Feature: Penyesuaian Harta Bersama -->
          <div class="bg-[#eef0ff] rounded-2xl p-3 text-left border border-[#dce0ff] flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xs shrink-0 shadow-xs">
              <span class="material-symbols-outlined text-[16px]">balance</span>
            </div>
            <div class="text-[11px] text-slate-800 leading-tight">
              <span class="font-bold">Penyesuaian Harta Bersama</span> dapat dilakukan setelah konfirmasi untuk pembagian aset yang adil.
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="pt-1.5 space-y-2">
            <!-- Destructive Action -->
            <button
              type="button"
              :disabled="isUnlinking"
              class="w-full py-3.5 px-4 bg-[#e11d48] hover:bg-rose-700 active:scale-[0.99] disabled:opacity-50 text-white font-bold rounded-2xl shadow-md shadow-rose-200 transition flex items-center justify-center gap-2 text-sm cursor-pointer"
              @click="handleConfirmUnlink"
            >
              <span v-if="isUnlinking" class="material-symbols-outlined animate-spin text-[16px]">refresh</span>
              <span v-else class="material-symbols-outlined text-[16px]">link_off</span>
              <span>{{ isUnlinking ? 'Memproses...' : 'Putuskan Hubungan' }}</span>
            </button>
            <!-- Cancel Action -->
            <button
              type="button"
              class="w-full py-3.5 px-4 bg-white hover:bg-slate-50 active:scale-[0.99] text-slate-700 font-semibold rounded-2xl border border-slate-200 shadow-xs transition text-sm cursor-pointer"
              @click="closeHouseholdUnlink"
            >
              Batal
            </button>
          </div>

          <!-- Safety footnote -->
          <div class="pt-1 text-center text-slate-400 text-[11px]">
            Data keuangan personal Anda tetap tersimpan dengan aman
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>
