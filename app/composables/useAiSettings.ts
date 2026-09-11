import { ref, computed } from 'vue'

export type AiModelType =
  | 'gemini-2.5-flash'
  | 'gemini-2.5-pro'
  | 'gemini-3.0-flash'
  | 'gemini-3.0-pro'
  | 'gemini-3.1-flash'
  | 'gemini-3.1-pro'
  | 'gemini-3.5-flash'
  | 'gemini-3.5-pro'
  | 'gemini-3.6-flash'
  | 'gemini-3.6-pro'
  | 'gemini-3.7-flash'
  | 'gemini-3.7-pro'
  | 'gemini-3.8-flash'
  | 'gemini-3.8-pro'
  | string

export interface AiScannerSettings {
  model: AiModelType
  autoDeskew: boolean
  detectTax: boolean
  autoFallback: boolean
}

export interface ModelCardInfo {
  id: AiModelType
  name: string
  series: '2.5' | '3.0' | '3.1' | '3.5' | '3.6' | '3.7' | '3.8'
  tier: 'flash' | 'pro'
  badge: string
  badgeClass: string
  speedText: string
  icon: string
  powerTitle: string
  powerDescription: string
  highlight: string
}

export const AVAILABLE_AI_MODELS: ModelCardInfo[] = [
  // ── Generasi 2.5 ──
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    series: '2.5',
    tier: 'flash',
    badge: 'Rekomendasi Utama',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300',
    speedText: '~0.8s (Kilat)',
    icon: 'bolt',
    powerTitle: 'Cepat & Hemat Token',
    powerDescription: 'Optimal untuk pemindaian struk harian (kasir, minimarket, e-wallet) dan tanya jawab anggaran instan hemat kuota token berdua.',
    highlight: 'Kecepatan 9.5/10 • Efisiensi Maksimal',
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    series: '2.5',
    tier: 'pro',
    badge: 'Akurasi Ekstra',
    badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300',
    speedText: '~1.8s (Mendalam)',
    icon: 'psychology',
    powerTitle: 'Akurasi Tinggi & Kertas Pudar',
    powerDescription: 'Penalaran kuat untuk struk panjang apotek, kertas kusut, tinta termal pudar, dan kalkulasi beban hutang multi-pos.',
    highlight: 'Akurasi 9.6/10 • Penalaran Kompleks',
  },

  // ── Generasi 3.0 ──
  {
    id: 'gemini-3.0-flash',
    name: 'Gemini 3.0 Flash',
    series: '3.0',
    tier: 'flash',
    badge: 'Generasi Baru',
    badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300',
    speedText: '~0.7s (Super Cepat)',
    icon: 'smart_toy',
    powerTitle: 'Responsif & Percakapan Luwes',
    powerDescription: 'Peningkatan pemahaman multi-turn dengan kecepatan tinggi, ideal untuk percakapan tanya-jawab interaktif seputar keuangan rumah tangga.',
    highlight: 'Responsif 9.7/10 • Konteks Luas',
  },
  {
    id: 'gemini-3.0-pro',
    name: 'Gemini 3.0 Pro',
    series: '3.0',
    tier: 'pro',
    badge: 'Perencana Finansial',
    badgeClass: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300',
    speedText: '~1.9s (Cerdas)',
    icon: 'neurology',
    powerTitle: 'Logika & Simulasi Anggaran',
    powerDescription: 'Analisis cerdas untuk simulasi pelunasan hutang (Snowball vs Avalanche), deteksi anomali belanja, dan rencana dana darurat.',
    highlight: 'Logika Finansial 9.7/10 • Multi-Step Reasoning',
  },

  // ── Generasi 3.1 ──
  {
    id: 'gemini-3.1-flash',
    name: 'Gemini 3.1 Flash',
    series: '3.1',
    tier: 'flash',
    badge: 'Efisiensi Tinggi',
    badgeClass: 'bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300',
    speedText: '~0.65s (Ringan)',
    icon: 'offline_bolt',
    powerTitle: 'Audit Pengeluaran Kilat & Ringkas',
    powerDescription: 'Penyempurnaan arsitektur 3.1 yang sangat hemat token dan stabil untuk klasifikasi transaksi belanja rutin harian.',
    highlight: 'Efisiensi 9.7/10 • Hemat Biaya',
  },
  {
    id: 'gemini-3.1-pro',
    name: 'Gemini 3.1 Pro',
    series: '3.1',
    tier: 'pro',
    badge: 'Analisis Multi-Kategori',
    badgeClass: 'bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300',
    speedText: '~1.8s (Mendalam)',
    icon: 'insights',
    powerTitle: 'Korelasi Anggaran & Deteksi Kebocoran',
    powerDescription: 'Penalaran presisi untuk membandingkan pos anggaran antar bulan dan mendeteksi pos pengeluaran mikro yang bocor halus.',
    highlight: 'Logika 9.8/10 • Analisis Pola',
  },

  // ── Generasi 3.5 ──
  {
    id: 'gemini-3.5-flash',
    name: 'Gemini 3.5 Flash',
    series: '3.5',
    tier: 'flash',
    badge: 'Next-Gen Speed',
    badgeClass: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/70 dark:text-cyan-300',
    speedText: '~0.6s (Ultra Cepat)',
    icon: 'rocket_launch',
    powerTitle: 'Ekstraksi Cepat Multi-Konteks',
    powerDescription: 'Kecepatan kilat dengan context window luas, mampu merangkum riwayat transaksi tahunan keluarga hanya dalam beberapa detik.',
    highlight: 'Kecepatan 9.8/10 • Analisis Massal',
  },
  {
    id: 'gemini-3.5-pro',
    name: 'Gemini 3.5 Pro',
    series: '3.5',
    tier: 'pro',
    badge: 'Master Audit Finansial',
    badgeClass: 'bg-violet-100 text-violet-800 dark:bg-violet-950/70 dark:text-violet-300',
    speedText: '~2.1s (Ultra Akurat)',
    icon: 'account_balance',
    powerTitle: 'Audit Mendalam & Rekomendasi Solutif',
    powerDescription: 'Kecerdasan tinggi untuk audit mendalam mutasi pengeluaran, optimasi perpajakan belanja, dan target tabungan impian agresif.',
    highlight: 'Penalaran 9.9/10 • Rekomendasi Solutif',
  },

  // ── Generasi 3.6 ──
  {
    id: 'gemini-3.6-flash',
    name: 'Gemini 3.6 Flash',
    series: '3.6',
    tier: 'flash',
    badge: 'Ultra-Fast Parser',
    badgeClass: 'bg-lime-100 text-lime-800 dark:bg-lime-950/70 dark:text-lime-300',
    speedText: '~0.55s (Kilat Ekstrem)',
    icon: 'electric_bolt',
    powerTitle: 'Ekstraksi OCR & Parsing Kilat',
    powerDescription: 'Kecepatan decoding super cepat dengan toleransi tinggi terhadap struk belanja beresolusi rendah dan format struk non-standar.',
    highlight: 'Kecepatan 9.9/10 • Ekstraksi Instan',
  },
  {
    id: 'gemini-3.6-pro',
    name: 'Gemini 3.6 Pro',
    series: '3.6',
    tier: 'pro',
    badge: 'Strategi Pajak & Keuangan',
    badgeClass: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950/70 dark:text-fuchsia-300',
    speedText: '~2.2s (Komprehensif)',
    icon: 'calculate',
    powerTitle: 'Optimalisasi Arus Kas & Hitung PB1/PPN',
    powerDescription: 'Kemampuan kalkulasi matematis canggih untuk membedah beban pajak struk, biaya layanan tersembunyi, dan efisiensi arus kas keluarga.',
    highlight: 'Matematika 9.9/10 • Ketepatan Pajak',
  },

  // ── Generasi 3.7 ──
  {
    id: 'gemini-3.7-flash',
    name: 'Gemini 3.7 Flash',
    series: '3.7',
    tier: 'flash',
    badge: 'Generasi Hibrida Tercepat',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300',
    speedText: '~0.5s (Kecepatan Puncak)',
    icon: 'speed',
    powerTitle: 'Responsif & Pemahaman Konteks Tajam',
    powerDescription: 'Evolusi terkini model Flash dengan latency ultra rendah dan penalaran adaptif untuk tanya jawab keuangan yang natural dan instan.',
    highlight: 'Responsivitas 10/10 • Adaptif',
  },
  {
    id: 'gemini-3.7-pro',
    name: 'Gemini 3.7 Pro',
    series: '3.7',
    tier: 'pro',
    badge: 'Hybrid Reasoning Engine',
    badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300',
    speedText: '~2.3s (Penalaran Adaptif)',
    icon: 'model_training',
    powerTitle: 'Penalaran Cerdas & Proyeksi Finansial',
    powerDescription: 'Model mutakhir dengan kapabilitas hybrid reasoning untuk menyusun proyeksi keuangan masa depan, simulasi KPR, dan mitigasi inflasi keluarga.',
    highlight: 'Penalaran 10/10 • Proyeksi Masa Depan',
  },

  // ── Generasi 3.8 ──
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    series: '3.8',
    tier: 'flash',
    badge: 'Ultra-Fast Intelligence',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300',
    speedText: '~0.5s (Kecepatan Puncak)',
    icon: 'flash_on',
    powerTitle: 'Kombinasi Kecepatan & Akurasi Puncak',
    powerDescription: 'Varian flash paling mutakhir generasi 3.8 dengan responsivitas ultra-cepat dan akurasi ekstraksi tinggi untuk konsultasi finansial instan.',
    highlight: 'Kecepatan 10/10 • Akurasi 9.8/10',
  },
  {
    id: 'gemini-3.8-pro',
    name: 'Gemini 3.8 Pro',
    series: '3.8',
    tier: 'pro',
    badge: 'Flagship Supreme Intelligence',
    badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300',
    speedText: '~2.4s (Penalaran Puncak)',
    icon: 'diamond',
    powerTitle: 'Puncak Kecerdasan AI Finansial',
    powerDescription: 'Model terlengkap dengan kapasitas penalaran terbaik untuk strategi kebebasan finansial (FIRE), diversifikasi pos aset, dan manajemen risiko keluarga.',
    highlight: 'Kecerdasan 10/10 • Flagship Multimodal',
  },
]

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
          model: parsed.model || 'gemini-2.5-flash',
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
    AVAILABLE_AI_MODELS,
    loadSettings,
    saveSettings,
    resetSettings,
    validateAndSaveKey,
    removeKey,
    getGeminiKey,
  }
}
