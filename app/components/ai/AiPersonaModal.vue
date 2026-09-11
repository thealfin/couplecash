<script setup lang="ts">
import { ref, onMounted } from 'vue'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
  (e: 'saved', prompt: string): void
}>()

const STORAGE_KEY = 'couplecash_ai_persona_prompt'

const DEFAULT_PERSONA =
  'Mulai sekarang dan seterusnya, berikan semua jawaban Anda dengan gaya bahasa yang santai, natural, kasual, dan mengalir seperti percakapan sehari-hari teman sebaya. Hindari bahasa yang terlalu kaku atau formal. PENTING: Jangan gunakan simbol atau format markdown apa pun dalam teks Anda (seperti tanda bintang tunggal atau ganda * ** untuk cetak tebal/miring, tanda pagar # untuk judul, baris baru menggunakan strip -, atau simbol format lainnya). Tuliskan jawaban Anda dalam bentuk teks biasa (plain text) yang bersih, hanya mengandalkan spasi, tanda baca normal (koma, titik, tanda tanya), dan paragraf baru untuk merapikan tulisan.'

const instructionText = ref(DEFAULT_PERSONA)
const isSavedSuccess = ref(false)

onMounted(() => {
  if (import.meta.client) {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      instructionText.value = saved
    }
  }
})

function handleResetDefault() {
  instructionText.value = DEFAULT_PERSONA
}

function handleSave() {
  if (import.meta.client) {
    localStorage.setItem(STORAGE_KEY, instructionText.value.trim() || DEFAULT_PERSONA)
  }
  emit('saved', instructionText.value.trim() || DEFAULT_PERSONA)
  isSavedSuccess.value = true
  setTimeout(() => {
    isSavedSuccess.value = false
    emit('update:open', false)
  }, 1000)
}

function close() {
  emit('update:open', false)
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      @click.self="close"
    >
      <div
        class="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-slide-up"
      >
        <!-- Header -->
        <div class="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <span class="material-symbols-outlined text-xl">tune</span>
            </div>
            <div>
              <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100">Gaya Bahasa AI</h3>
              <p class="text-[11px] text-slate-500 dark:text-slate-400">Atur persona & instruksi format output respons Gemini</p>
            </div>
          </div>
          <button
            class="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            @click="close"
          >
            <span class="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <!-- Body -->
        <div class="p-5 overflow-y-auto space-y-4">
          <div class="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/40 flex items-start gap-2.5">
            <span class="material-symbols-outlined text-emerald-600 text-lg shrink-0 mt-0.5">auto_awesome</span>
            <p class="text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed">
              Instruksi ini akan selalu disisipkan ke Gemini AI agar obrolan terasa natural, bersahabat, dan bersih tanpa simbol format markdown yang mengganggu.
            </p>
          </div>

          <div class="flex items-center justify-between">
            <label class="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Instruksi Persona Output AI
            </label>
            <button
              type="button"
              class="text-xs font-bold text-primary hover:underline"
              @click="handleResetDefault"
            >
              Reset Default
            </button>
          </div>

          <textarea
            v-model="instructionText"
            rows="6"
            class="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary font-sans"
            placeholder="Tuliskan instruksi persona AI Anda..."
          ></textarea>

          <!-- Chips rekomendasi -->
          <div class="flex flex-wrap gap-2 pt-1">
            <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-medium">
              <span class="material-symbols-outlined text-emerald-500 text-sm">check_circle</span>
              Gaya Santai Teman Sebaya
            </span>
            <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-medium">
              <span class="material-symbols-outlined text-emerald-500 text-sm">check_circle</span>
              Bebas Simbol (*, **, #, -)
            </span>
            <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-medium">
              <span class="material-symbols-outlined text-emerald-500 text-sm">check_circle</span>
              Plain Text Bersih &amp; Mengalir
            </span>
          </div>

          <div v-if="isSavedSuccess" class="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 text-xs font-semibold flex items-center justify-center gap-2">
            <span class="material-symbols-outlined text-base">check</span>
            <span>Gaya bahasa AI berhasil disimpan!</span>
          </div>
        </div>

        <!-- Footer -->
        <div class="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3">
          <button
            type="button"
            class="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            @click="close"
          >
            Batal
          </button>
          <button
            type="button"
            class="flex-1 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-sm hover:opacity-95 transition-all flex items-center justify-center gap-1.5"
            @click="handleSave"
          >
            <span class="material-symbols-outlined text-base">save</span>
            <span>Simpan Gaya AI</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.18s ease-out; }
.animate-slide-up { animation: slideUp 0.22s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
</style>
