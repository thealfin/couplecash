<script setup lang="ts">
const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
}>()

const router = useRouter()

function close() {
  emit('update:open', false)
}

function goToSettings() {
  close()
  router.push('/akun/pengaturan/ai')
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      @click.self="close"
    >
      <div
        class="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-2xl flex flex-col items-center text-center gap-4 animate-scale-up"
      >
        <!-- Icon badge -->
        <div class="w-16 h-16 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center relative">
          <span class="material-symbols-outlined text-3xl" style="font-variation-settings: 'FILL' 1">key</span>
          <span class="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold shadow-sm">
            AI
          </span>
        </div>

        <div>
          <h3 class="text-base font-bold text-slate-900 dark:text-slate-100">
            Kunci Gemini API Diperlukan
          </h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
            Untuk berkonsultasi dengan <strong>Asisten Finansial AI</strong>, Anda perlu memasukkan Google Gemini API Key pribadi (BYOK).
          </p>
          <div class="mt-3 p-3 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/40 text-left flex items-start gap-2">
            <span class="material-symbols-outlined text-amber-600 dark:text-amber-400 text-sm mt-0.5 shrink-0">verified_user</span>
            <p class="text-[11px] text-amber-900 dark:text-amber-200 leading-tight">
              API Key Anda 100% gratis dari Google AI Studio dan tersimpan terenkripsi secara lokal di brankas perangkat Anda.
            </p>
          </div>
        </div>

        <div class="w-full flex flex-col gap-2 mt-1">
          <button
            type="button"
            class="w-full py-3 px-4 rounded-2xl bg-primary text-white text-xs font-bold shadow-md shadow-primary/20 hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            @click="goToSettings"
          >
            <span class="material-symbols-outlined text-base">settings</span>
            <span>Buka Pengaturan AI Sekarang</span>
          </button>
          <button
            type="button"
            class="w-full py-2.5 px-4 rounded-2xl text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            @click="close"
          >
            Nanti Saja
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.18s ease-out;
}
.animate-scale-up {
  animation: scaleUp 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes scaleUp {
  from { transform: scale(0.94); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
</style>
