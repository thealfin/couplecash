<script setup lang="ts">
import { ref, onMounted } from 'vue'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved', settings: { model: string; autoDeskew: boolean; detectTax: boolean; autoFallback: boolean }): void
}>()

const router = useRouter()
const {
  settings,
  hasKey,
  loadSettings,
  saveSettings,
  resetSettings,
  validateAndSaveKey,
  getGeminiKey,
} = useAiSettings()

const isInlineKeyOpen = ref(false)
const inlineKeyInput = ref('')
const inlineShowKey = ref(false)
const isInlineValidating = ref(false)
const inlineError = ref('')
const inlineSuccess = ref('')

onMounted(async () => {
  await loadSettings()
  if (hasKey.value) {
    const raw = await getGeminiKey()
    if (raw) inlineKeyInput.value = raw
  }
})

async function handleSaveInlineKey() {
  if (!inlineKeyInput.value.trim()) {
    inlineError.value = 'Kunci API Gemini tidak boleh kosong'
    return
  }

  isInlineValidating.value = true
  inlineError.value = ''
  inlineSuccess.value = ''

  try {
    const res = await validateAndSaveKey(inlineKeyInput.value)
    if (res.valid) {
      inlineSuccess.value = 'Kunci API Gemini berhasil disimpan!'
      setTimeout(() => {
        inlineSuccess.value = ''
        isInlineKeyOpen.value = false
      }, 1500)
    } else {
      inlineError.value = res.error || 'Validasi kunci gagal'
    }
  } catch (err: any) {
    inlineError.value = err?.message || 'Gagal menyimpan kunci'
  } finally {
    isInlineValidating.value = false
  }
}

function handleSave() {
  saveSettings({
    model: settings.value.model,
    autoDeskew: settings.value.autoDeskew,
    detectTax: settings.value.detectTax,
    autoFallback: settings.value.autoFallback,
  })
  emit('saved', { ...settings.value })
  emit('close')
}

function handleReset() {
  resetSettings()
  emit('saved', { ...settings.value })
  emit('close')
}

function navigateToKeySettings() {
  emit('close')
  router.push('/akun/pengaturan/ai')
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-end justify-center animate-fade-in"
      @click.self="emit('close')"
    >
      <div
        class="w-full max-w-lg bg-surface-container-lowest rounded-t-[28px] shadow-2xl pb-6 flex flex-col max-h-[85vh] overflow-y-auto animate-slide-up"
      >
        <!-- Grabber & Header -->
        <div class="flex flex-col items-center pt-3 pb-2 px-4 sticky top-0 bg-surface-container-lowest z-10 border-b border-outline-variant/10">
          <div class="w-12 h-1.5 rounded-full bg-surface-container-highest mb-3"></div>
          <div class="w-full flex items-start justify-between gap-3">
            <div class="flex flex-col">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-primary text-[22px]">tune</span>
                <h2 class="text-base font-bold text-on-surface">Pengaturan Mesin OCR AI</h2>
              </div>
              <p class="text-[11px] text-muted mt-0.5">Konfigurasi model Gemini &amp; preferensi pemindaian struk</p>
            </div>
            <button
              aria-label="Tutup pengaturan"
              class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant active:scale-90 transition-transform cursor-pointer"
              type="button"
              @click="emit('close')"
            >
              <span class="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        <!-- Scrollable Content -->
        <div class="flex flex-col px-4 gap-4 mt-3">
          <!-- Section 1: BYOK Status Card with Inline Key Entry -->
          <div class="w-full bg-surface-container-low rounded-2xl p-3.5 flex flex-col gap-2.5 border border-outline-variant/30">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <div
                  class="w-2.5 h-2.5 rounded-full"
                  :class="hasKey ? 'bg-income animate-ping' : 'bg-error'"
                ></div>
                <span class="text-xs font-bold text-on-surface">
                  {{ hasKey ? 'Gemini API Key Aktif' : 'Gemini API Key Belum Diatur' }}
                </span>
              </div>
              <div class="flex items-center gap-2">
                <button
                  class="text-[11px] text-primary font-semibold flex items-center gap-0.5 active:opacity-75 cursor-pointer"
                  type="button"
                  @click="isInlineKeyOpen = !isInlineKeyOpen"
                >
                  <span>{{ isInlineKeyOpen ? 'Tutup' : hasKey ? 'Ganti Kunci' : 'Atur Kunci' }}</span>
                  <span class="material-symbols-outlined text-[14px]">
                    {{ isInlineKeyOpen ? 'expand_less' : 'expand_more' }}
                  </span>
                </button>
              </div>
            </div>

            <!-- Inline API Key Input (Expanded) -->
            <div v-if="isInlineKeyOpen" class="flex flex-col gap-2 pt-2 border-t border-outline-variant/20 animate-fade-in">
              <label class="text-[11px] font-semibold text-on-surface">
                Masukkan Gemini API Key:
              </label>
              <div class="relative">
                <input
                  :type="inlineShowKey ? 'text' : 'password'"
                  v-model="inlineKeyInput"
                  placeholder="AIzaSy... atau AQ.Ab8RN..."
                  class="w-full px-3 py-2 pr-9 rounded-xl border border-outline-variant/50 bg-surface-container-lowest text-on-surface text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  @click="inlineShowKey = !inlineShowKey"
                  class="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-on-surface p-1"
                >
                  <span class="material-symbols-outlined text-[16px]">
                    {{ inlineShowKey ? 'visibility_off' : 'visibility' }}
                  </span>
                </button>
              </div>

              <div v-if="inlineError" class="text-[11px] text-error font-medium flex items-center gap-1">
                <span class="material-symbols-outlined text-[14px]">error</span>
                <span>{{ inlineError }}</span>
              </div>
              <div v-if="inlineSuccess" class="text-[11px] text-income font-medium flex items-center gap-1">
                <span class="material-symbols-outlined text-[14px]">check_circle</span>
                <span>{{ inlineSuccess }}</span>
              </div>

              <div class="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  @click="handleSaveInlineKey"
                  :disabled="isInlineValidating || !inlineKeyInput.trim()"
                  class="flex-1 py-2 px-3 rounded-xl bg-primary text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <span v-if="isInlineValidating" class="material-symbols-outlined animate-spin text-[14px]">refresh</span>
                  <span v-else class="material-symbols-outlined text-[14px]">check</span>
                  <span>{{ isInlineValidating ? 'Memvalidasi...' : 'Simpan Kunci' }}</span>
                </button>
                <button
                  type="button"
                  @click="navigateToKeySettings"
                  class="py-2 px-3 rounded-xl border border-outline-variant text-[11px] font-semibold text-primary hover:bg-primary/5 transition cursor-pointer"
                >
                  Buka Pengaturan Penuh
                </button>
              </div>
            </div>

            <!-- Badges -->
            <div class="flex flex-wrap items-center gap-1.5 pt-0.5">
              <div class="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container-highest/60 text-on-surface-variant text-[10px] font-medium">
                <span class="material-symbols-outlined text-[12px] text-income">verified_user</span>
                <span>AES-256-GCM Lokal</span>
              </div>
              <div class="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container-highest/60 text-on-surface-variant text-[10px] font-medium">
                <span class="material-symbols-outlined text-[12px] text-warning">speed</span>
                <span>Latensi ~800ms</span>
              </div>
              <div class="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container-highest/60 text-on-surface-variant text-[10px] font-medium">
                <span class="material-symbols-outlined text-[12px] text-primary">key</span>
                <span>AI Studio (BYOK)</span>
              </div>
            </div>
          </div>

          <!-- Section 2: Model Selection -->
          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <label class="text-xs font-bold text-on-surface">Pilih Varian Model Gemini</label>
              <span class="text-[10px] font-semibold text-primary px-2 py-0.5 rounded-full bg-primary/10">v2.5 Multimodal</span>
            </div>

            <div class="flex flex-col gap-2">
              <!-- Option 1: Gemini 2.5 Flash -->
              <div
                class="cursor-pointer w-full rounded-2xl p-3 flex flex-col gap-1.5 transition-all border"
                :class="settings.model === 'gemini-2.5-flash' ? 'bg-primary/5 border-primary shadow-sm' : 'bg-surface-container-low border-outline-variant/30'"
                @click="settings.model = 'gemini-2.5-flash'"
              >
                <div class="flex items-start justify-between">
                  <div class="flex items-center gap-2.5">
                    <div
                      class="w-9 h-9 rounded-xl flex items-center justify-center"
                      :class="settings.model === 'gemini-2.5-flash' ? 'bg-primary text-white shadow-sm' : 'bg-surface-container text-on-surface-variant'"
                    >
                      <span class="material-symbols-outlined text-[20px]">bolt</span>
                    </div>
                    <div class="flex flex-col">
                      <div class="flex items-center gap-1.5">
                        <span class="text-xs font-bold text-on-surface">Gemini 2.5 Flash</span>
                      </div>
                      <div class="flex items-center gap-1 mt-0.5">
                        <span class="px-1.5 py-0.5 rounded bg-income/15 text-income text-[10px] font-bold">Direkomendasikan</span>
                        <span class="px-1.5 py-0.5 rounded bg-surface-container text-muted text-[10px]">~0.8 detik</span>
                      </div>
                    </div>
                  </div>
                  <div
                    class="w-6 h-6 rounded-full flex items-center justify-center"
                    :class="settings.model === 'gemini-2.5-flash' ? 'bg-primary text-white' : 'bg-surface-container-highest text-transparent'"
                  >
                    <span class="material-symbols-outlined text-[16px]">check</span>
                  </div>
                </div>
                <p class="text-[11px] text-muted leading-relaxed">
                  Optimal untuk struk kasir standar, minimarket, restoran, dan e-wallet QRIS. Ekstraksi instan hemat kuota token harian berdua.
                </p>
              </div>

              <!-- Option 2: Gemini 2.5 Pro -->
              <div
                class="cursor-pointer w-full rounded-2xl p-3 flex flex-col gap-1.5 transition-all border"
                :class="settings.model === 'gemini-2.5-pro' ? 'bg-primary/5 border-primary shadow-sm' : 'bg-surface-container-low border-outline-variant/30'"
                @click="settings.model = 'gemini-2.5-pro'"
              >
                <div class="flex items-start justify-between">
                  <div class="flex items-center gap-2.5">
                    <div
                      class="w-9 h-9 rounded-xl flex items-center justify-center"
                      :class="settings.model === 'gemini-2.5-pro' ? 'bg-primary text-white shadow-sm' : 'bg-surface-container text-on-surface-variant'"
                    >
                      <span class="material-symbols-outlined text-[20px]">psychology</span>
                    </div>
                    <div class="flex flex-col">
                      <div class="flex items-center gap-1.5">
                        <span class="text-xs font-bold text-on-surface">Gemini 2.5 Pro</span>
                      </div>
                      <div class="flex items-center gap-1 mt-0.5">
                        <span class="px-1.5 py-0.5 rounded bg-secondary/15 text-secondary text-[10px] font-bold">Akurasi Ekstra</span>
                        <span class="px-1.5 py-0.5 rounded bg-surface-container text-muted text-[10px]">Penalaran Kompleks</span>
                      </div>
                    </div>
                  </div>
                  <div
                    class="w-6 h-6 rounded-full flex items-center justify-center"
                    :class="settings.model === 'gemini-2.5-pro' ? 'bg-primary text-white' : 'bg-surface-container-highest text-transparent'"
                  >
                    <span class="material-symbols-outlined text-[16px]">check</span>
                  </div>
                </div>
                <p class="text-[11px] text-muted leading-relaxed">
                  Dikhususkan untuk struk panjang apotek, kertas kusut, tinta termal pudar, atau catatan belanja tulisan tangan.
                </p>
              </div>
            </div>
          </div>

          <!-- Section 3: Preprocessing & Ekstraksi Cerdas -->
          <div class="flex flex-col gap-2">
            <label class="text-xs font-bold text-on-surface">Preprocessing &amp; Ekstraksi Cerdas</label>
            <div class="flex flex-col rounded-2xl bg-surface-container-low border border-outline-variant/30 divide-y divide-outline-variant/20">
              <!-- Toggle 1: Auto-Deskew & Enhancer -->
              <div class="flex items-center justify-between p-3">
                <div class="flex items-center gap-2.5 pr-2">
                  <div class="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary shrink-0">
                    <span class="material-symbols-outlined text-[18px]">auto_fix_high</span>
                  </div>
                  <div class="flex flex-col">
                    <span class="text-xs font-semibold text-on-surface">Auto-Deskew &amp; Enhancer</span>
                    <span class="text-[10px] text-muted">Luruskan sudut &amp; naikkan kontras tinta pudar</span>
                  </div>
                </div>
                <button
                  type="button"
                  class="w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 cursor-pointer shrink-0"
                  :class="settings.autoDeskew ? 'bg-primary justify-end' : 'bg-surface-container-highest justify-start'"
                  @click="settings.autoDeskew = !settings.autoDeskew"
                >
                  <div class="w-5 h-5 rounded-full bg-white shadow-sm"></div>
                </button>
              </div>

              <!-- Toggle 2: Deteksi Pajak & Service Charge -->
              <div class="flex items-center justify-between p-3">
                <div class="flex items-center gap-2.5 pr-2">
                  <div class="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-tertiary shrink-0">
                    <span class="material-symbols-outlined text-[18px]">receipt_long</span>
                  </div>
                  <div class="flex flex-col">
                    <span class="text-xs font-semibold text-on-surface">Deteksi Pajak &amp; Service Charge</span>
                    <span class="text-[10px] text-muted">Pisahkan PB1, PPN &amp; layanan otomatis</span>
                  </div>
                </div>
                <button
                  type="button"
                  class="w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 cursor-pointer shrink-0"
                  :class="settings.detectTax ? 'bg-primary justify-end' : 'bg-surface-container-highest justify-start'"
                  @click="settings.detectTax = !settings.detectTax"
                >
                  <div class="w-5 h-5 rounded-full bg-white shadow-sm"></div>
                </button>
              </div>

              <!-- Toggle 3: Auto-Fallback ke Pro -->
              <div class="flex items-center justify-between p-3">
                <div class="flex items-center gap-2.5 pr-2">
                  <div class="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-secondary shrink-0">
                    <span class="material-symbols-outlined text-[18px]">sync_alt</span>
                  </div>
                  <div class="flex flex-col">
                    <span class="text-xs font-semibold text-on-surface">Auto-Fallback ke Pro</span>
                    <span class="text-[10px] text-muted">Alihkan otomatis jika confidence score &lt; 75%</span>
                  </div>
                </div>
                <button
                  type="button"
                  class="w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 cursor-pointer shrink-0"
                  :class="settings.autoFallback ? 'bg-primary justify-end' : 'bg-surface-container-highest justify-start'"
                  @click="settings.autoFallback = !settings.autoFallback"
                >
                  <div class="w-5 h-5 rounded-full bg-white shadow-sm"></div>
                </button>
              </div>
            </div>
          </div>

          <!-- Section 4: Privacy & Security Link Card -->
          <div class="w-full rounded-xl bg-surface-container-high/60 p-3 flex items-center justify-between gap-2.5 border border-outline-variant/20">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-primary text-[18px] shrink-0">settings</span>
              <span class="text-[11px] text-on-surface font-semibold">Pengaturan Lengkap di Menu Akun</span>
            </div>
            <button
              type="button"
              @click="navigateToKeySettings"
              class="text-[11px] text-primary font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <span>Buka</span>
              <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
            </button>
          </div>

          <!-- Action Buttons -->
          <div class="flex flex-col gap-2 pt-1">
            <button
              class="w-full py-3 rounded-2xl bg-primary text-white font-bold text-xs shadow-md shadow-primary/25 flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer"
              type="button"
              @click="handleSave"
            >
              <span class="material-symbols-outlined text-[18px]">check_circle</span>
              <span>Simpan Konfigurasi</span>
            </button>
            <button
              class="w-full py-2.5 rounded-2xl bg-transparent text-muted hover:text-on-surface text-xs font-medium flex items-center justify-center gap-1.5 active:bg-surface-container transition-colors cursor-pointer"
              type="button"
              @click="handleReset"
            >
              <span class="material-symbols-outlined text-[16px]">restart_alt</span>
              <span>Reset ke Default</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
.animate-slide-up {
  animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
</style>
