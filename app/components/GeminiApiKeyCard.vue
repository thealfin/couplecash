<script setup lang="ts">
import { ref, onMounted } from 'vue'

const { saveKey, getKey, deleteKey, hasKey } = useGeminiKeyVault()

const apiKeyInput = ref('')
const appPinInput = ref('1234') // Default app lock PIN for demo session
const showKey = ref(false)
const isLoading = ref(false)
const isConfigured = ref(false)
const statusState = ref<'empty' | 'valid' | 'invalid'>('empty')
const errorMessage = ref('')
const selectedModel = ref('gemini-1.5-flash')

async function checkCurrentState() {
  isLoading.value = true
  try {
    const exists = await hasKey()
    if (exists) {
      const stored = await getKey(appPinInput.value)
      if (stored) {
        apiKeyInput.value = stored
        statusState.value = 'valid'
        isConfigured.value = true
      } else {
        statusState.value = 'empty'
        isConfigured.value = false
      }
    } else {
      statusState.value = 'empty'
      isConfigured.value = false
    }
  } catch (err) {
    statusState.value = 'empty'
  } finally {
    isLoading.value = false
  }
}

async function handleSaveKey() {
  if (!apiKeyInput.value.trim()) return
  isLoading.value = true
  errorMessage.value = ''

  try {
    // 1. Validate key in-memory via Nitro server endpoint
    const res: any = await $fetch('/api/ai/validate-key', {
      method: 'POST',
      headers: {
        'X-Gemini-Api-Key': apiKeyInput.value.trim(),
      },
    })

    if (!res.valid) {
      statusState.value = 'invalid'
      errorMessage.value = res.error || 'Kunci Gemini API tidak valid'
      isLoading.value = false
      return
    }

    // 2. Save encrypted key to local IndexedDB
    await saveKey(apiKeyInput.value.trim(), appPinInput.value)
    
    // 3. Update settings flag in server
    await $fetch('/api/ai/settings', {
      method: 'PUT',
      body: { aiEnabled: true, preferredModel: selectedModel.value },
    }).catch(() => {})

    statusState.value = 'valid'
    isConfigured.value = true
  } catch (err: any) {
    statusState.value = 'invalid'
    errorMessage.value = err?.message || 'Terjadi kesalahan saat memvalidasi kunci'
  } finally {
    isLoading.value = false
  }
}

async function handleRemoveKey() {
  if (!confirm('Apakah Anda yakin ingin menghapus kunci Gemini API dari perangkat ini?')) return
  isLoading.value = true
  try {
    await deleteKey()
    apiKeyInput.value = ''
    statusState.value = 'empty'
    isConfigured.value = false
    await $fetch('/api/ai/settings', {
      method: 'PUT',
      body: { aiEnabled: false },
    }).catch(() => {})
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  checkCurrentState()
})
</script>

<template>
  <div class="card bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm transition-all">
    <!-- Header Card -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
          <span class="material-symbols-outlined">key</span>
        </div>
        <div>
          <h3 class="font-bold text-slate-800 dark:text-slate-100 text-base">Gemini AI Key (BYOK)</h3>
          <p class="text-xs text-slate-500 dark:text-slate-400">Gunakan API Key Gemini milik Anda secara gratis</p>
        </div>
      </div>

      <!-- Badges -->
      <span v-if="statusState === 'valid'" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
        <span class="material-symbols-outlined text-sm">check_circle</span> ✓ Aktif
      </span>
      <span v-else-if="statusState === 'invalid'" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
        <span class="material-symbols-outlined text-sm">warning</span> ⚠ Bermasalah
      </span>
      <span v-else class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
        Belum Aktif
      </span>
    </div>

    <!-- Error Banner -->
    <div v-if="statusState === 'invalid' && errorMessage" class="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-900/50 dark:text-rose-300 text-xs">
      {{ errorMessage }}
    </div>

    <!-- Form State -->
    <div class="space-y-4">
      <div>
        <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
          Masukkan Gemini API Key
        </label>
        <div class="relative">
          <input
            :type="showKey ? 'text' : 'password'"
            v-model="apiKeyInput"
            placeholder="AIzaSy••••••••••••••••••••"
            autocomplete="off"
            class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
          <button
            type="button"
            @click="showKey = !showKey"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm"
          >
            <span class="material-symbols-outlined text-lg">{{ showKey ? 'visibility_off' : 'visibility' }}</span>
          </button>
        </div>
      </div>

      <!-- Links & Caption -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <a
          href="https://aistudio.google.com/app/apikey"
          target="_blank"
          rel="noopener noreferrer"
          class="text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 font-medium"
        >
          Dapatkan API Key gratis di Google AI Studio
          <span class="material-symbols-outlined text-xs">open_in_new</span>
        </a>
        <span class="text-slate-400 text-[11px]">
          🔒 Tersimpan terenkripsi di perangkat saja
        </span>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-2 pt-2">
        <button
          @click="handleSaveKey"
          :disabled="isLoading || !apiKeyInput.trim()"
          class="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition"
        >
          <span v-if="isLoading" class="material-symbols-outlined animate-spin text-sm">refresh</span>
          <span>{{ isConfigured ? 'Perbarui Kunci' : 'Simpan & Aktifkan' }}</span>
        </button>

        <button
          v-if="isConfigured"
          @click="handleRemoveKey"
          :disabled="isLoading"
          class="py-2.5 px-3 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/30 text-sm font-semibold transition"
          title="Hapus Kunci"
        >
          <span class="material-symbols-outlined text-base">delete</span>
        </button>
      </div>
    </div>
  </div>
</template>
