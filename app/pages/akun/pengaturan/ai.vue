<script setup lang="ts">
import { ref, onMounted } from 'vue'

definePageMeta({ layout: 'app' })
useHead({ title: 'Pengaturan AI — CoupleCash' })

const router = useRouter()
const {
  settings,
  hasKey,
  isLoaded,
  loadSettings,
  saveSettings,
  resetSettings,
  validateAndSaveKey,
  removeKey,
  getGeminiKey,
} = useAiSettings()

const apiKeyInput = ref('')
const showKey = ref(false)
const isValidating = ref(false)
const isSavingSettings = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const savedKeyMasked = ref('')

onMounted(async () => {
  await loadSettings()
  if (hasKey.value) {
    const raw = await getGeminiKey()
    if (raw) {
      apiKeyInput.value = raw
      savedKeyMasked.value = maskKey(raw)
    }
  }
})

function maskKey(key: string): string {
  if (key.length <= 10) return '••••••••••'
  return key.slice(0, 6) + '••••••••••••' + key.slice(-4)
}

async function handleSaveKey() {
  if (!apiKeyInput.value.trim()) {
    errorMessage.value = 'Masukkan Gemini API Key terlebih dahulu'
    return
  }

  isValidating.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const res = await validateAndSaveKey(apiKeyInput.value)
    if (res.valid) {
      successMessage.value = 'Kunci Gemini API berhasil divalidasi dan disimpan!'
      savedKeyMasked.value = maskKey(apiKeyInput.value)
      setTimeout(() => { successMessage.value = '' }, 3500)
    } else {
      errorMessage.value = res.error || 'Validasi kunci gagal'
    }
  } catch (err: any) {
    errorMessage.value = err?.message || 'Terjadi kesalahan saat menyimpan kunci'
  } finally {
    isValidating.value = false
  }
}

async function handleRemoveKey() {
  if (!confirm('Hapus Gemini API Key dari penyimpanan lokal terenkripsi perangkat ini?')) return
  errorMessage.value = ''
  successMessage.value = ''
  try {
    await removeKey()
    apiKeyInput.value = ''
    savedKeyMasked.value = ''
    successMessage.value = 'Kunci API berhasil dihapus'
    setTimeout(() => { successMessage.value = '' }, 3000)
  } catch (err: any) {
    errorMessage.value = err?.message || 'Gagal menghapus kunci'
  }
}

function handleSelectModel(m: 'gemini-2.5-flash' | 'gemini-2.5-pro') {
  settings.value.model = m
  saveSettings({ model: m })
}

function handleToggleDeskew() {
  settings.value.autoDeskew = !settings.value.autoDeskew
  saveSettings({ autoDeskew: settings.value.autoDeskew })
}

function handleToggleTax() {
  settings.value.detectTax = !settings.value.detectTax
  saveSettings({ detectTax: settings.value.detectTax })
}

function handleToggleFallback() {
  settings.value.autoFallback = !settings.value.autoFallback
  saveSettings({ autoFallback: settings.value.autoFallback })
}

function handleSaveAllPreferences() {
  isSavingSettings.value = true
  saveSettings({
    model: settings.value.model,
    autoDeskew: settings.value.autoDeskew,
    detectTax: settings.value.detectTax,
    autoFallback: settings.value.autoFallback,
  })
  setTimeout(() => {
    isSavingSettings.value = false
    successMessage.value = 'Preferensi model & pemindaian berhasil disimpan!'
    setTimeout(() => { successMessage.value = '' }, 3500)
  }, 300)
}

function handleResetAll() {
  if (!confirm('Kembalikan semua preferensi pemindaian ke setelan awal pabrik?')) return
  resetSettings()
  successMessage.value = 'Preferensi dikembalikan ke default'
  setTimeout(() => { successMessage.value = '' }, 3000)
}
</script>

<template>
  <div class="max-w-xl mx-auto px-4 py-5 space-y-5 animate-fade-in pb-20">
    <!-- Header Navigasi -->
    <div class="flex items-center gap-3">
      <button
        @click="router.back()"
        class="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition"
        type="button"
        aria-label="Kembali"
      >
        <span class="material-symbols-outlined text-xl">arrow_back</span>
      </button>
      <div>
        <h1 class="text-xl font-bold text-slate-900 dark:text-slate-100">Pengaturan Asisten AI</h1>
        <p class="text-xs text-slate-500 dark:text-slate-400">Konfigurasi tunggal Google Gemini BYOK &amp; preferensi pemindaian struk</p>
      </div>
    </div>

    <!-- Alert / Toast Banner -->
    <div v-if="successMessage" class="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fade-in">
      <span class="material-symbols-outlined text-base">check_circle</span>
      <span>{{ successMessage }}</span>
    </div>

    <div v-if="errorMessage" class="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center gap-2 animate-fade-in">
      <span class="material-symbols-outlined text-base">error</span>
      <span>{{ errorMessage }}</span>
    </div>

    <!-- 1. Hero Status Card (BYOK) -->
    <div class="card bg-white dark:bg-slate-900 rounded-2xl p-4.5 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="relative flex items-center justify-center">
            <div
              class="w-3 h-3 rounded-full"
              :class="hasKey ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'"
            ></div>
            <div
              class="w-3 h-3 rounded-full absolute"
              :class="hasKey ? 'bg-emerald-500' : 'bg-rose-500'"
            ></div>
          </div>
          <div>
            <span class="text-sm font-bold text-slate-900 dark:text-slate-100">
              {{ hasKey ? 'Gemini API Key Aktif' : 'Gemini API Key Belum Dikonfigurasi' }}
            </span>
            <p v-if="hasKey && savedKeyMasked" class="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
              {{ savedKeyMasked }}
            </p>
            <p v-else class="text-[11px] text-slate-500 dark:text-slate-400">
              Masukkan kunci Gemini API Anda untuk mengaktifkan pemindai struk
            </p>
          </div>
        </div>

        <span
          class="px-2.5 py-1 rounded-full text-[11px] font-bold"
          :class="hasKey ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'"
        >
          {{ hasKey ? 'Siap Digunakan' : 'Nonaktif' }}
        </span>
      </div>

      <!-- Feature Badges -->
      <div class="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800/80">
        <div class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-semibold">
          <span class="material-symbols-outlined text-[13px] text-emerald-500">verified_user</span>
          <span>AES-256-GCM Lokal</span>
        </div>
        <div class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-semibold">
          <span class="material-symbols-outlined text-[13px] text-amber-500">speed</span>
          <span>Latensi ~800ms</span>
        </div>
        <div class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-semibold">
          <span class="material-symbols-outlined text-[13px] text-indigo-500">key</span>
          <span>Google AI Studio (BYOK)</span>
        </div>
      </div>
    </div>

    <!-- 2. Gemini API Key Input Form -->
    <div class="card bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-indigo-600 dark:text-indigo-400 text-lg">vpn_key</span>
          <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100">
            {{ hasKey ? 'Perbarui Kunci API Gemini' : 'Tambahkan Kunci API Gemini' }}
          </h3>
        </div>
        <a
          href="https://aistudio.google.com/app/apikey"
          target="_blank"
          rel="noopener noreferrer"
          class="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline inline-flex items-center gap-0.5"
        >
          <span>Dapatkan Kunci Gratis</span>
          <span class="material-symbols-outlined text-xs">open_in_new</span>
        </a>
      </div>

      <div class="space-y-1.5">
        <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">
          Gemini API Key (Diawali dengan AIza... atau AQ...)
        </label>
        <div class="relative">
          <input
            :type="showKey ? 'text' : 'password'"
            v-model="apiKeyInput"
            placeholder="AIzaSy... atau AQ.Ab8RN..."
            autocomplete="off"
            spellcheck="false"
            class="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition font-mono text-xs"
          />
          <button
            type="button"
            @click="showKey = !showKey"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            title="Tampilkan / Sembunyikan"
          >
            <span class="material-symbols-outlined text-lg">{{ showKey ? 'visibility_off' : 'visibility' }}</span>
          </button>
        </div>
        <p class="text-[11px] text-slate-400">
          Kunci dienkripsi dengan standar industri AES-GCM 256-bit dan hanya disimpan di dalam browser perangkat Anda.
        </p>
      </div>

      <!-- Action Buttons for Key -->
      <div class="flex items-center gap-2 pt-1">
        <button
          @click="handleSaveKey"
          :disabled="isValidating || !apiKeyInput.trim()"
          class="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.98] cursor-pointer"
          type="button"
        >
          <span v-if="isValidating" class="material-symbols-outlined animate-spin text-sm">refresh</span>
          <span v-else class="material-symbols-outlined text-base">check</span>
          <span>{{ isValidating ? 'Memvalidasi Kunci...' : hasKey ? 'Validasi & Perbarui Kunci' : 'Simpan & Aktifkan Kunci' }}</span>
        </button>

        <button
          v-if="hasKey"
          @click="handleRemoveKey"
          class="py-2.5 px-3 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/30 text-xs font-semibold transition active:scale-95 cursor-pointer"
          title="Hapus Kunci dari Perangkat"
          type="button"
        >
          <span class="material-symbols-outlined text-base">delete</span>
        </button>
      </div>
    </div>

    <!-- 3. Pilih Varian Model Gemini -->
    <div class="space-y-2.5">
      <div class="flex items-center justify-between">
        <label class="text-xs font-bold text-slate-900 dark:text-slate-100">Pilih Varian Model Gemini</label>
        <span class="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60">
          v2.5 Multimodal
        </span>
      </div>

      <div class="grid grid-cols-1 gap-2.5">
        <!-- Option 1: Gemini 2.5 Flash -->
        <div
          class="cursor-pointer w-full rounded-2xl p-4 flex flex-col gap-2 transition-all border select-none"
          :class="settings.model === 'gemini-2.5-flash' ? 'bg-indigo-50/60 border-indigo-500 dark:bg-indigo-950/40 dark:border-indigo-500 shadow-sm' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'"
          @click="handleSelectModel('gemini-2.5-flash')"
        >
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
                :class="settings.model === 'gemini-2.5-flash' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'"
              >
                <span class="material-symbols-outlined text-[22px]">bolt</span>
              </div>
              <div class="flex flex-col">
                <span class="text-sm font-bold text-slate-900 dark:text-slate-100">Gemini 2.5 Flash</span>
                <div class="flex items-center gap-1.5 mt-0.5">
                  <span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 text-[10px] font-bold">
                    Direkomendasikan
                  </span>
                  <span class="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-medium">
                    ~0.8 detik
                  </span>
                </div>
              </div>
            </div>
            <div
              class="w-6 h-6 rounded-full flex items-center justify-center transition-all"
              :class="settings.model === 'gemini-2.5-flash' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-transparent'"
            >
              <span class="material-symbols-outlined text-[16px]">check</span>
            </div>
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Optimal untuk struk kasir standar, minimarket, restoran, dan e-wallet QRIS. Ekstraksi instan hemat kuota token harian berdua.
          </p>
        </div>

        <!-- Option 2: Gemini 2.5 Pro -->
        <div
          class="cursor-pointer w-full rounded-2xl p-4 flex flex-col gap-2 transition-all border select-none"
          :class="settings.model === 'gemini-2.5-pro' ? 'bg-indigo-50/60 border-indigo-500 dark:bg-indigo-950/40 dark:border-indigo-500 shadow-sm' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'"
          @click="handleSelectModel('gemini-2.5-pro')"
        >
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
                :class="settings.model === 'gemini-2.5-pro' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'"
              >
                <span class="material-symbols-outlined text-[22px]">psychology</span>
              </div>
              <div class="flex flex-col">
                <span class="text-sm font-bold text-slate-900 dark:text-slate-100">Gemini 2.5 Pro</span>
                <div class="flex items-center gap-1.5 mt-0.5">
                  <span class="px-2 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 text-[10px] font-bold">
                    Akurasi Ekstra
                  </span>
                  <span class="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-medium">
                    Penalaran Kompleks
                  </span>
                </div>
              </div>
            </div>
            <div
              class="w-6 h-6 rounded-full flex items-center justify-center transition-all"
              :class="settings.model === 'gemini-2.5-pro' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-transparent'"
            >
              <span class="material-symbols-outlined text-[16px]">check</span>
            </div>
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Dikhususkan untuk struk panjang apotek, kertas kusut, tinta termal pudar, atau catatan belanja tulisan tangan.
          </p>
        </div>
      </div>
    </div>

    <!-- 4. Preprocessing & Ekstraksi Cerdas -->
    <div class="space-y-2">
      <label class="text-xs font-bold text-slate-900 dark:text-slate-100">Preprocessing &amp; Ekstraksi Cerdas</label>
      <div class="card bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden shadow-sm">
        <!-- Toggle 1: Auto-Deskew -->
        <div class="flex items-center justify-between p-3.5">
          <div class="flex items-center gap-3 pr-2">
            <div class="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-lg">auto_fix_high</span>
            </div>
            <div>
              <span class="text-xs font-semibold text-slate-800 dark:text-slate-200 block">Auto-Deskew &amp; Enhancer</span>
              <span class="text-[11px] text-slate-500 dark:text-slate-400 block">Luruskan sudut &amp; naikkan kontras tinta pudar</span>
            </div>
          </div>
          <button
            type="button"
            class="w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 cursor-pointer shrink-0"
            :class="settings.autoDeskew ? 'bg-indigo-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'"
            @click="handleToggleDeskew"
          >
            <div class="w-5 h-5 rounded-full bg-white shadow-sm"></div>
          </button>
        </div>

        <!-- Toggle 2: Deteksi Pajak -->
        <div class="flex items-center justify-between p-3.5">
          <div class="flex items-center gap-3 pr-2">
            <div class="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-lg">receipt_long</span>
            </div>
            <div>
              <span class="text-xs font-semibold text-slate-800 dark:text-slate-200 block">Deteksi Pajak &amp; Service Charge</span>
              <span class="text-[11px] text-slate-500 dark:text-slate-400 block">Pisahkan PB1, PPN &amp; biaya layanan otomatis</span>
            </div>
          </div>
          <button
            type="button"
            class="w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 cursor-pointer shrink-0"
            :class="settings.detectTax ? 'bg-indigo-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'"
            @click="handleToggleTax"
          >
            <div class="w-5 h-5 rounded-full bg-white shadow-sm"></div>
          </button>
        </div>

        <!-- Toggle 3: Auto-Fallback -->
        <div class="flex items-center justify-between p-3.5">
          <div class="flex items-center gap-3 pr-2">
            <div class="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-lg">sync_alt</span>
            </div>
            <div>
              <span class="text-xs font-semibold text-slate-800 dark:text-slate-200 block">Auto-Fallback ke Pro</span>
              <span class="text-[11px] text-slate-500 dark:text-slate-400 block">Alihkan otomatis jika confidence score &lt; 75%</span>
            </div>
          </div>
          <button
            type="button"
            class="w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 cursor-pointer shrink-0"
            :class="settings.autoFallback ? 'bg-indigo-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'"
            @click="handleToggleFallback"
          >
            <div class="w-5 h-5 rounded-full bg-white shadow-sm"></div>
          </button>
        </div>
      </div>
    </div>

    <!-- 5. Transparansi & Keamanan BYOK -->
    <div class="card bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4.5 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
      <h3 class="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
        <span class="material-symbols-outlined text-indigo-500 text-base">shield</span>
        Transparansi &amp; Privasi BYOK (Bring Your Own Key)
      </h3>
      <ul class="text-[11px] text-slate-600 dark:text-slate-400 space-y-1.5 leading-relaxed list-disc pl-4">
        <li>
          <strong>Kebebasan Biaya:</strong> Anda menggunakan API Key pribadi dari Google AI Studio yang menyediakan kuota gratis setiap hari.
        </li>
        <li>
          <strong>Penyimpanan Lokal Terenkripsi:</strong> Kunci disimpan di IndexedDB browser Anda dan dienkripsi AES-GCM 256-bit.
        </li>
        <li>
          <strong>Tanpa Penyimpanan Server:</strong> Server CoupleCash tidak pernah menyimpan atau membagikan kunci API maupun gambar nota Anda.
        </li>
      </ul>
    </div>

    <!-- 6. Action Buttons -->
    <div class="flex flex-col gap-2 pt-2">
      <button
        @click="handleSaveAllPreferences"
        :disabled="isSavingSettings"
        class="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/25 flex items-center justify-center gap-2 active:scale-[0.98] transition cursor-pointer"
        type="button"
      >
        <span v-if="isSavingSettings" class="material-symbols-outlined animate-spin text-sm">refresh</span>
        <span v-else class="material-symbols-outlined text-base">save</span>
        <span>Simpan Semua Perubahan</span>
      </button>

      <button
        @click="handleResetAll"
        class="w-full py-2.5 rounded-2xl bg-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 active:bg-slate-100 dark:active:bg-slate-800 transition cursor-pointer"
        type="button"
      >
        <span class="material-symbols-outlined text-base">restart_alt</span>
        <span>Kembalikan ke Setelan Default</span>
      </button>
    </div>
  </div>
</template>
