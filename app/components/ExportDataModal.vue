<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  generateTransactionsCsv,
  generateAccountsCsv,
  downloadCsvFile
} from '~/utils/exportFinancialData'

const props = defineProps<{
  open: boolean
  defaultMonth?: string // YYYY-MM
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
}>()

const { getAuthToken } = useAuth()

const filterMode = ref<'all' | 'current_month' | 'custom'>('all')
const customStartDate = ref('')
const customEndDate = ref('')
const isExporting = ref(false)
const exportSuccess = ref('')
const exportError = ref('')

function close() {
  emit('update:open', false)
  exportSuccess.value = ''
  exportError.value = ''
}

async function handleExportTransactions() {
  isExporting.value = true
  exportSuccess.value = ''
  exportError.value = ''

  try {
    const token = await getAuthToken()
    const query: Record<string, string> = { period: filterMode.value }
    if (filterMode.value === 'custom') {
      if (customStartDate.value) query.startDate = customStartDate.value
      if (customEndDate.value) query.endDate = customEndDate.value
    }

    const res = await $fetch<{
      success: boolean
      count: number
      transactions: any[]
    }>('/api/export/transactions', {
      query,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })

    if (!res.transactions || res.transactions.length === 0) {
      exportError.value = 'Tidak ada data transaksi pada periode yang dipilih.'
      return
    }

    const csvData = generateTransactionsCsv(res.transactions)
    const nowStr = new Date().toISOString().split('T')[0]
    const filename = `couplecash-transaksi-${filterMode.value}-${nowStr}.csv`
    downloadCsvFile(csvData, filename)

    exportSuccess.value = `Berhasil mengunduh ${res.count} riwayat transaksi ke format CSV/Excel!`
    setTimeout(() => {
      close()
    }, 1800)
  } catch (err: any) {
    exportError.value = err?.data?.statusMessage || err?.message || 'Gagal mengekspor data transaksi'
  } finally {
    isExporting.value = false
  }
}

async function handleExportAccounts() {
  isExporting.value = true
  exportSuccess.value = ''
  exportError.value = ''

  try {
    const token = await getAuthToken()
    const res = await $fetch<{
      success: boolean
      count: number
      accounts: any[]
    }>('/api/export/accounts', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })

    if (!res.accounts || res.accounts.length === 0) {
      exportError.value = 'Belum ada pos akun aktif untuk diekspor.'
      return
    }

    const csvData = generateAccountsCsv(res.accounts)
    const nowStr = new Date().toISOString().split('T')[0]
    const filename = `couplecash-pos-akun-${nowStr}.csv`
    downloadCsvFile(csvData, filename)

    exportSuccess.value = `Berhasil mengunduh ${res.count} ringkasan pos akun ke format CSV/Excel!`
    setTimeout(() => {
      close()
    }, 1800)
  } catch (err: any) {
    exportError.value = err?.data?.statusMessage || err?.message || 'Gagal mengekspor pos akun'
  } finally {
    isExporting.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm transition-opacity animate-fade-in"
      @click.self="close"
    >
      <div
        class="w-full max-w-[500px] bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-slide-up"
      >
        <!-- Header -->
        <div class="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <span class="material-symbols-outlined text-xl">table_view</span>
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-900 dark:text-slate-100">Ekspor ke Excel / CSV</h3>
              <p class="text-[11px] text-slate-500 dark:text-slate-400">Unduh data finansial keluarga ke spreadsheet</p>
            </div>
          </div>
          <button
            class="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            @click="close"
          >
            <span class="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <!-- Body -->
        <div class="p-5 overflow-y-auto space-y-4">
          <!-- Info Box -->
          <div class="p-3.5 rounded-2xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 flex items-start gap-2.5">
            <span class="material-symbols-outlined text-blue-600 dark:text-blue-400 text-lg shrink-0 mt-0.5">info</span>
            <p class="text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
              Berkas CSV dilengkapi proteksi <span class="font-semibold">Formula Injection</span> dan encoding UTF-8 BOM, sehingga dapat langsung dibuka rapi di Microsoft Excel atau Google Sheets.
            </p>
          </div>

          <!-- Periode Transaksi Selector -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Pilih Periode Riwayat Transaksi
            </label>
            <div class="grid grid-cols-3 gap-2">
              <button
                type="button"
                class="py-2.5 px-3 rounded-xl text-xs font-medium border transition-all text-center"
                :class="filterMode === 'all'
                  ? 'border-primary bg-primary/10 text-primary font-bold shadow-sm'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'"
                @click="filterMode = 'all'"
              >
                Semua Waktu
              </button>
              <button
                type="button"
                class="py-2.5 px-3 rounded-xl text-xs font-medium border transition-all text-center"
                :class="filterMode === 'current_month'
                  ? 'border-primary bg-primary/10 text-primary font-bold shadow-sm'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'"
                @click="filterMode = 'current_month'"
              >
                Bulan Ini
              </button>
              <button
                type="button"
                class="py-2.5 px-3 rounded-xl text-xs font-medium border transition-all text-center"
                :class="filterMode === 'custom'
                  ? 'border-primary bg-primary/10 text-primary font-bold shadow-sm'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'"
                @click="filterMode = 'custom'"
              >
                Kustom
              </button>
            </div>

            <!-- Custom date range inputs -->
            <div v-if="filterMode === 'custom'" class="grid grid-cols-2 gap-2 mt-3 animate-fade-in">
              <div>
                <label class="block text-[11px] text-slate-500 mb-1">Dari Tanggal</label>
                <input
                  v-model="customStartDate"
                  type="date"
                  class="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label class="block text-[11px] text-slate-500 mb-1">Sampai Tanggal</label>
                <input
                  v-model="customEndDate"
                  type="date"
                  class="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          <!-- Alert / Feedback -->
          <div v-if="exportError" class="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2">
            <span class="material-symbols-outlined text-base">error</span>
            <span>{{ exportError }}</span>
          </div>

          <div v-if="exportSuccess" class="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
            <span class="material-symbols-outlined text-base">check_circle</span>
            <span>{{ exportSuccess }}</span>
          </div>

          <!-- Option 1: Riwayat Transaksi -->
          <button
            type="button"
            class="w-full p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-all flex items-center justify-between text-left disabled:opacity-50"
            :disabled="isExporting"
            @click="handleExportTransactions"
          >
            <div class="flex items-center gap-3.5">
              <div class="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-2xl">receipt_long</span>
              </div>
              <div>
                <h4 class="text-xs font-bold text-slate-900 dark:text-slate-100">Ekspor Riwayat Transaksi (CSV)</h4>
                <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Termasuk tanggal, jam, nominal, pos akun, kategori, kepemilikan, dan catatan.
                </p>
              </div>
            </div>
            <span class="material-symbols-outlined text-slate-400">download</span>
          </button>

          <!-- Option 2: Ringkasan Pos Akun -->
          <button
            type="button"
            class="w-full p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-all flex items-center justify-between text-left disabled:opacity-50"
            :disabled="isExporting"
            @click="handleExportAccounts"
          >
            <div class="flex items-center gap-3.5">
              <div class="w-11 h-11 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-2xl">account_balance_wallet</span>
              </div>
              <div>
                <h4 class="text-xs font-bold text-slate-900 dark:text-slate-100">Ekspor Ringkasan Pos Akun (CSV)</h4>
                <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Daftar seluruh rekening bank, e-wallet, uang tunai, dan saldo terkini.
                </p>
              </div>
            </div>
            <span class="material-symbols-outlined text-slate-400">download</span>
          </button>

          <!-- Loading state -->
          <div v-if="isExporting" class="py-2 flex items-center justify-center gap-2 text-primary text-xs font-semibold">
            <span class="material-symbols-outlined animate-spin text-base">progress_activity</span>
            <span>Menyiapkan berkas spreadsheet...</span>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.2s ease-out;
}
.animate-slide-up {
  animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes slideUp {
  from { transform: translateY(16px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
</style>
