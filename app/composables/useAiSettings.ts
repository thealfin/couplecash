import { ref, computed } from 'vue'

export interface AiScannerSettings {
  model: 'gemini-2.5-flash' | 'gemini-2.5-pro'
  autoDeskew: boolean
  detectTax: boolean
  autoFallback: boolean
}

const STORAGE_KEY = 'couplecash_ai_scanner_settings'

const DEFAULT_SETTINGS: AiScannerSettings = {
  model: 'gemini-2.5-flash',
  autoDeskew: true,
  detectTax: true,
  autoFallback: true,
}

export function useAiSettings() {
  const { getGeminiKey, saveGeminiKey, removeGeminiKey, hasGeminiKey } = useGeminiKeyVault()

  const settings = useState<AiScannerSettings>('ai_scanner_settings', () => ({ ...DEFAULT_SETTINGS }))
  const hasKey = useState<boolean>('ai_has_gemini_key', () => false)
  const isLoaded = useState<boolean>('ai_settings_loaded', () => false)

  async function loadSettings() {
    if (!import.meta.client) return
    try {
      // 1. Check Gemini API key existence
      hasKey.value = await hasGeminiKey()

      // 2. Load scanner preferences from localStorage
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        settings.value = {
          model: parsed.model === 'gemini-2.5-pro' ? 'gemini-2.5-pro' : 'gemini-2.5-flash',
          autoDeskew: typeof parsed.autoDeskew === 'boolean' ? parsed.autoDeskew : true,
          detectTax: typeof parsed.detectTax === 'boolean' ? parsed.detectTax : true,
          autoFallback: typeof parsed.autoFallback === 'boolean' ? parsed.autoFallback : true,
        }
      }
    } catch (e) {
      console.warn('[useAiSettings] Error loading settings:', e)
    } finally {
      isLoaded.value = true
    }
  }

  function saveSettings(newSettings: Partial<AiScannerSettings>) {
    settings.value = { ...settings.value, ...newSettings }
    if (import.meta.client) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings.value))
      } catch (e) {
        console.warn('[useAiSettings] Error saving settings to localStorage:', e)
      }
    }
  }

  function resetSettings() {
    settings.value = { ...DEFAULT_SETTINGS }
    if (import.meta.client) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS))
      } catch (e) {
        console.warn('[useAiSettings] Error resetting settings:', e)
      }
    }
  }

  async function validateAndSaveKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
    const trimmed = apiKey.trim()
    if (!trimmed) {
      return { valid: false, error: 'Kunci Gemini API tidak boleh kosong' }
    }
    if (!trimmed.startsWith('AIza') && !trimmed.startsWith('AQ') && trimmed.length < 20) {
      return { valid: false, error: 'Kunci Gemini tidak valid (harus diawali AIza... atau AQ...)' }
    }

    try {
      // Validate via Nitro server endpoint
      const res: any = await $fetch('/api/ai/validate-key', {
        method: 'POST',
        headers: { 'X-Gemini-Api-Key': trimmed },
      })

      if (!res.valid) {
        return { valid: false, error: res.error || 'Kunci Gemini API tidak valid atau telah kadaluarsa' }
      }

      // Save encrypted into IndexedDB
      await saveGeminiKey(trimmed)
      hasKey.value = true

      // Update sync flag on server if user is logged in
      try {
        const { getAuthToken } = useAuth()
        const token = await getAuthToken()
        if (token) {
          await $fetch('/api/ai/settings', {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}` },
            body: { aiEnabled: true, preferredModel: settings.value.model },
          }).catch(() => {})
        }
      } catch {}

      return { valid: true }
    } catch (err: any) {
      // If network error during validation but format is right, still save locally
      const msg = err?.data?.message || err?.message || 'Gagal memvalidasi kunci'
      return { valid: false, error: msg }
    }
  }

  async function removeKey() {
    await removeGeminiKey()
    hasKey.value = false
    try {
      const { getAuthToken } = useAuth()
      const token = await getAuthToken()
      if (token) {
        await $fetch('/api/ai/settings', {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
          body: { aiEnabled: false },
        }).catch(() => {})
      }
    } catch {}
  }

  return {
    settings,
    hasKey,
    isLoaded,
    loadSettings,
    saveSettings,
    resetSettings,
    validateAndSaveKey,
    removeKey,
    getGeminiKey,
  }
}
