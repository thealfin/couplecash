import { ref, computed } from 'vue'
import welcomeWalletAnim from '~/assets/lottie/welcome-wallet.json'
import analyticsChartAnim from '~/assets/lottie/analytics-chart.json'
import goalsTargetAnim from '~/assets/lottie/goals-target.json'
import couplePairingAnim from '~/assets/lottie/couple-pairing.json'

export type TourName = 'beranda' | 'analitik' | 'goals' | 'pairing'

export interface TourStep {
  id: string
  tour: TourName
  badge: string
  title: string
  subtitle: string
  description: string
  animation: any
  primaryCtaText?: string
  primaryCtaRoute?: string
  primaryCtaAction?: () => void
  secondaryCtaText?: string
}

const STORAGE_KEY = 'couplecash_walkthrough_seen'

// Global state for walkthrough
const activeTour = ref<TourName | null>(null)
const currentStepIndex = ref(0)
const tourHistory = ref<Record<TourName, boolean>>({
  beranda: false,
  analitik: false,
  goals: false,
  pairing: false,
})

let isInitialized = false

function initStorage() {
  if (isInitialized || typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      tourHistory.value = {
        beranda: !!parsed.beranda,
        analitik: !!parsed.analitik,
        goals: !!parsed.goals,
        pairing: !!parsed.pairing,
      }
    }
  } catch (e) {
    console.warn('[useWalkthrough] Error reading localStorage:', e)
  }
  isInitialized = true
}

function saveHistory() {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tourHistory.value))
  } catch (e) {
    console.warn('[useWalkthrough] Error saving localStorage:', e)
  }
}

export const TOUR_STEPS: Record<TourName, TourStep[]> = {
  beranda: [
    {
      id: 'beranda-welcome',
      tour: 'beranda',
      badge: 'Langkah 1/5 • Pengenalan',
      title: 'Selamat Datang di CoupleCash! 👋',
      subtitle: 'Aplikasi Keuangan Pasangan Terintegrasi',
      description: 'Satu tempat untuk mengatur seluruh alur kas keluarga secara transparan, seimbang, dan harmonis. CoupleCash memisahkan pos pribadi dan harta bersama secara cerdas.',
      animation: welcomeWalletAnim,
      primaryCtaText: 'Lanjut Pengenalan',
    },
    {
      id: 'beranda-balance',
      tour: 'beranda',
      badge: 'Langkah 2/5 • Ringkasan Saldo',
      title: 'Total Saldo & Proporsi Pasangan 💳',
      subtitle: 'Transparansi Saldo Suami, Istri & Bersama',
      description: 'Pantau total aset bersih keluarga, pertumbuhan bulanan, dan proporsi kepemilikan aset. Anda juga dapat menyembunyikan nominal saldo kapan saja dengan tombol mata.',
      animation: welcomeWalletAnim,
      primaryCtaText: 'Lanjut ke Langkah Penting',
    },
    {
      id: 'beranda-accounts',
      tour: 'beranda',
      badge: 'Langkah 3/5 • FOKUS UTAMA!',
      title: 'Langkah 1: Buat Pos Akun Finansial 🏦',
      subtitle: 'Wajib diatur pertama kali sebelum mencatat transaksi!',
      description: 'Tambahkan rekening Bank (BCA, BRI, Mandiri), E-Wallet (GoPay, OVO), atau Kas Tunai Anda. Tanpa pos akun, saldo transaksi tidak memiliki sumber penampung dana.',
      animation: welcomeWalletAnim,
      primaryCtaText: 'Buat Pos Akun Sekarang',
      primaryCtaRoute: '/akun/kelola-akun',
      secondaryCtaText: 'Lanjut Panduan Dulu',
    },
    {
      id: 'beranda-category-bills',
      tour: 'beranda',
      badge: 'Langkah 4/5 • FOKUS PENTING!',
      title: 'Langkah 2: Kategori & Tagihan Rutin ⚡',
      subtitle: 'Atur pos anggaran & jangan sampai telat bayar',
      description: 'Sesuaikan Kategori Pemasukan & Pengeluaran keluarga, dan jadwalkan Tagihan Rutin (Listrik PLN, WiFi, BPJS) agar CoupleCash mengingatkan Anda sebelum jatuh tempo.',
      animation: welcomeWalletAnim,
      primaryCtaText: 'Atur Kategori & Tagihan',
      primaryCtaRoute: '/akun/kategori',
      secondaryCtaText: 'Lanjut Panduan',
    },
    {
      id: 'beranda-transactions',
      tour: 'beranda',
      badge: 'Langkah 5/5 • Fitur Praktis',
      title: 'Catat Cepat & Scan AI Nota Struk 📸',
      subtitle: 'Tombol floating (+) siap sedia kapan saja',
      description: 'Klik tombol bulat (+) di bawah untuk mencatat pengeluaran harian manual atau gunakan AI Scan Struk otomatis untuk membaca nota fisik dalam 2 detik!',
      animation: welcomeWalletAnim,
      primaryCtaText: 'Selesai & Mulai Eksplorasi 🎉',
    },
  ],

  analitik: [
    {
      id: 'analitik-calendar',
      tour: 'analitik',
      badge: 'Langkah 1/3 • Kalender Harian',
      title: 'Kalender Arus Kas Harian 📅',
      subtitle: 'Visualisasi pengeluaran dan pemasukan per tanggal',
      description: 'Lihat ringkasan pengeluaran harian keluarga secara visual. Klik setiap tanggal pada kalender untuk melihat rincian nota belanja yang terjadi pada hari tersebut.',
      animation: analyticsChartAnim,
      primaryCtaText: 'Lanjut Analisis',
    },
    {
      id: 'analitik-category',
      tour: 'analitik',
      badge: 'Langkah 2/3 • Distribusi Pengeluaran',
      title: 'Peta Pengeluaran per Kategori 📊',
      subtitle: 'Ketahui kemana uang keluarga mengalir',
      description: 'Analisis kategori mana yang paling banyak menyerap anggaran bulan ini (Makan, Belanja, Transportasi, dll) untuk evaluasi keuangan keluarga yang lebih sehat.',
      animation: analyticsChartAnim,
      primaryCtaText: 'Lanjut Tren Pasangan',
    },
    {
      id: 'analitik-trend',
      tour: 'analitik',
      badge: 'Langkah 3/3 • Proporsi Pasangan',
      title: 'Tren Finansial & Pembagian Kontribusi ⚖️',
      subtitle: 'Arus kas bulanan & perbandingan Suami vs Istri',
      description: 'Pantau grafik tren arus kas bulanan dan proporsi kontribusi finansial antara Suami dan Istri dalam membiayai kebutuhan rumah tangga.',
      animation: analyticsChartAnim,
      primaryCtaText: 'Paham, Siap Analisis 👍',
    },
  ],

  goals: [
    {
      id: 'goals-target',
      tour: 'goals',
      badge: 'Langkah 1/2 • Target Impian',
      title: 'Target Finansial Bersama Pasangan 🎯',
      subtitle: 'Wujudkan impian keluarga satu per satu',
      description: 'Buat target tabungan bersama seperti Rumah Idaman, Dana Darurat, Liburan Akhir Tahun, atau Tabungan Anak dengan target nominal dan tenggat waktu pencapaian.',
      animation: goalsTargetAnim,
      primaryCtaText: 'Lanjut ke Cara Nabung',
    },
    {
      id: 'goals-auto-save',
      tour: 'goals',
      badge: 'Langkah 2/2 • Alokasi Saldo',
      title: 'Nabung & Pantau Progres Tabungan 💰',
      subtitle: 'Sisihkan langsung dari pos akun finansial',
      description: 'Anda dan pasangan dapat menyetorkan tabungan dari rekening masing-masing. Progres tabungan impian akan bertambah otomatis secara real-time!',
      animation: goalsTargetAnim,
      primaryCtaText: 'Siap Buat Goals Pertama 🚀',
    },
  ],

  pairing: [
    {
      id: 'pairing-concept',
      tour: 'pairing',
      badge: 'Langkah 1/2 • Konsep Sync',
      title: 'Konsep Couple Sync & Transparansi 💍',
      subtitle: 'Privasi Tetap Terjaga, Keuangan Keluarga Terbuka',
      description: 'CoupleCash membagi aset menjadi "Pribadi" (hanya Anda yang tahu) dan "Bersama" (dikelola berdua). Anda tetap memiliki otonomi finansial pribadi sekaligus transparansi penuh untuk rumah tangga.',
      animation: couplePairingAnim,
      primaryCtaText: 'Lanjut Cara Pairing',
    },
    {
      id: 'pairing-how-to',
      tour: 'pairing',
      badge: 'Langkah 2/2 • Cara Pairing',
      title: 'Cara Menghubungkan Akun Pasangan 🔗',
      subtitle: 'Gunakan 6-Digit Kode Undangan',
      description: 'Satu pasangan membuat Household dan membagikan Kode Undangan unik. Pasangan lainnya cukup memasukkan kode tersebut untuk langsung terhubung seketika!',
      animation: couplePairingAnim,
      primaryCtaText: 'Mulai Hubungkan Pasangan Sekarang ❤️',
    },
  ],
}

export function useWalkthrough() {
  initStorage()

  const isTourActive = computed(() => activeTour.value !== null)

  const currentSteps = computed(() => {
    if (!activeTour.value) return []
    return TOUR_STEPS[activeTour.value] || []
  })

  const currentStep = computed<TourStep | null>(() => {
    if (!activeTour.value) return null
    return currentSteps.value[currentStepIndex.value] || null
  })

  const isLastStep = computed(() => {
    return currentStepIndex.value >= currentSteps.value.length - 1
  })

  function hasSeenTour(tour: TourName): boolean {
    initStorage()
    return !!tourHistory.value[tour]
  }

  function shouldTriggerTour(tour: TourName): boolean {
    initStorage()
    return !tourHistory.value[tour]
  }

  function startTour(tour: TourName) {
    initStorage()
    activeTour.value = tour
    currentStepIndex.value = 0
  }

  function nextStep() {
    if (!activeTour.value) return
    if (isLastStep.value) {
      completeTour()
    } else {
      currentStepIndex.value++
    }
  }

  function prevStep() {
    if (currentStepIndex.value > 0) {
      currentStepIndex.value--
    }
  }

  function completeTour() {
    if (activeTour.value) {
      tourHistory.value[activeTour.value] = true
      saveHistory()
    }
    activeTour.value = null
    currentStepIndex.value = 0
  }

  function skipTour() {
    if (activeTour.value) {
      tourHistory.value[activeTour.value] = true
      saveHistory()
    }
    activeTour.value = null
    currentStepIndex.value = 0
  }

  function resetAllTours() {
    tourHistory.value = {
      beranda: false,
      analitik: false,
      goals: false,
      pairing: false,
    }
    saveHistory()
  }

  return {
    activeTour,
    currentStepIndex,
    currentSteps,
    currentStep,
    isTourActive,
    isLastStep,
    hasSeenTour,
    shouldTriggerTour,
    startTour,
    nextStep,
    prevStep,
    completeTour,
    skipTour,
    resetAllTours,
  }
}
