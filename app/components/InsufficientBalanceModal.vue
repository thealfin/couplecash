<script setup lang="ts">
import { ref, computed } from 'vue'

interface AccountItem {
  id: string
  name: string
  balance: number
  balanceText: string
}

const props = defineProps<{
  isOpen: boolean
  accountName: string
  currentBalance: number
  expenseAmount: number
  availableAccounts: AccountItem[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'switchAccount', targetName: string): void
  (e: 'proceedAnyway'): void
}>()

// Calculate resulting deficit
const resultingBalance = computed(() => props.currentBalance - props.expenseAmount)

// Filter alternative accounts that have enough balance
const sufficientAccounts = computed(() => {
  return props.availableAccounts.filter(
    (a) => a.name !== props.accountName && a.balance >= props.expenseAmount
  )
})

const selectedAlternative = ref<string>(
  sufficientAccounts.value.length > 0 ? sufficientAccounts.value[0].name : ''
)

watch(
  () => props.isOpen,
  (open) => {
    if (open && sufficientAccounts.value.length > 0) {
      selectedAlternative.value = sufficientAccounts.value[0].name
    }
  }
)

function fmtRupiah(n: number): string {
  const num = Number(n) || 0
  if (num < 0) return '-Rp ' + Math.abs(num).toLocaleString('id-ID')
  return 'Rp ' + num.toLocaleString('id-ID')
}

function handleSwitch() {
  if (selectedAlternative.value) {
    emit('switchAccount', selectedAlternative.value)
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="isOpen" class="modal-backdrop" @click.self="emit('close')">
        <div class="modal-card animate-scale-up">

          <!-- Close button -->
          <button class="modal-close-btn" @click="emit('close')" aria-label="Tutup">
            <span class="material-symbols-outlined">close</span>
          </button>

          <!-- Warning Illustration Badge -->
          <div class="illustration-container">
            <div class="illustration-circle">
              <span class="material-symbols-outlined illustration-icon">warning</span>
            </div>
          </div>

          <!-- Header -->
          <div class="text-center mb-4">
            <h2 class="modal-title">Saldo Tidak Mencukupi</h2>
            <p class="modal-subtitle">
              Nominal pengeluaran ini melebihi sisa saldo yang tersedia di <b>{{ accountName }}</b>.
            </p>
          </div>

          <!-- Balance Breakdown Card -->
          <div class="deficit-card">
            <div class="deficit-row">
              <span class="deficit-label">Saldo Saat Ini</span>
              <span class="deficit-val tabular-nums font-semibold">{{ fmtRupiah(currentBalance) }}</span>
            </div>
            <div class="deficit-row">
              <span class="deficit-label">Nominal Pengeluaran</span>
              <span class="deficit-val deficit-val--expense tabular-nums font-semibold">{{ fmtRupiah(-expenseAmount) }}</span>
            </div>
            <div class="deficit-divider"></div>
            <div class="deficit-row deficit-row--total">
              <span class="deficit-label-total">Estimasi Saldo Baru</span>
              <span class="deficit-val-total tabular-nums">{{ fmtRupiah(resultingBalance) }}</span>
            </div>
          </div>

          <!-- Alternative Account Switcher (if available) -->
          <div v-if="sufficientAccounts.length > 0" class="switch-box">
            <label class="switch-label">Gunakan rekening lain dengan saldo cukup:</label>
            <div class="select-wrap">
              <span class="material-symbols-outlined text-[18px] text-primary">account_balance_wallet</span>
              <select v-model="selectedAlternative" class="select-input">
                <option v-for="acc in sufficientAccounts" :key="acc.id" :value="acc.name">
                  {{ acc.name }} ({{ fmtRupiah(acc.balance) }})
                </option>
              </select>
            </div>
            <button class="switch-action-btn" @click="handleSwitch">
              <span class="material-symbols-outlined text-[16px]">swap_horiz</span>
              Pindahkan ke {{ selectedAlternative }}
            </button>
          </div>

          <!-- Actions Group -->
          <div class="actions-wrapper">
            <button class="proceed-btn" @click="emit('proceedAnyway')">
              <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
              <span>Tetap Lanjutkan (Catat Saldo Minus)</span>
            </button>

            <button class="cancel-btn" @click="emit('close')">
              Batalkan Transaksi
            </button>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 17, 26, 0.7);
  backdrop-filter: blur(8px);
  z-index: 2500;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.modal-card {
  position: relative;
  background: var(--surface-container-lowest);
  border-radius: 28px;
  max-width: 380px;
  width: 100%;
  padding: 26px 20px 22px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.modal-close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--surface-container);
  border: none;
  color: var(--on-surface-variant);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
}

.illustration-container {
  margin-bottom: 14px;
}
.illustration-circle {
  width: 68px;
  height: 68px;
  border-radius: 50%;
  background: #fee2e2;
  border: 2px solid #fca5a5;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 20px rgba(239, 68, 68, 0.25);
}
.illustration-icon {
  font-size: 34px;
  color: #dc2626;
}

.modal-title {
  margin: 0 0 4px;
  font-size: 18px;
  font-weight: 700;
  color: var(--on-surface);
}

.modal-subtitle {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.45;
  padding: 0 6px;
}

.deficit-card {
  width: 100%;
  background: var(--surface-container-low);
  border-radius: 18px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 14px;
}

.deficit-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
}

.deficit-label {
  color: var(--muted);
}
.deficit-val {
  color: var(--on-surface);
}
.deficit-val--expense {
  color: var(--expense);
}

.deficit-divider {
  height: 1px;
  background: var(--outline-variant);
  margin: 2px 0;
}

.deficit-row--total {
  padding-top: 2px;
}
.deficit-label-total {
  font-size: 12px;
  font-weight: 700;
  color: #991b1b;
}
.deficit-val-total {
  font-size: 15px;
  font-weight: 800;
  color: #dc2626;
}

.switch-box {
  width: 100%;
  background: color-mix(in srgb, var(--primary) 8%, var(--surface-container-lowest));
  border: 1px dashed color-mix(in srgb, var(--primary) 35%, transparent);
  border-radius: 16px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 14px;
}

.switch-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--primary);
}

.select-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--surface-container-lowest);
  border: 1px solid var(--outline-variant);
  border-radius: 12px;
  padding: 8px 12px;
}

.select-input {
  border: none;
  outline: none;
  background: transparent;
  font-size: 12px;
  font-weight: 600;
  color: var(--on-surface);
  width: 100%;
  font-family: inherit;
  cursor: pointer;
}

.switch-action-btn {
  width: 100%;
  padding: 10px;
  border-radius: 12px;
  background: var(--primary);
  color: white;
  font-size: 12px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.actions-wrapper {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.proceed-btn {
  width: 100%;
  padding: 13px;
  background: #dc2626;
  color: white;
  font-size: 13px;
  font-weight: 700;
  border-radius: 18px;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 4px 14px rgba(220, 38, 38, 0.35);
  transition: transform 0.15s;
}
.proceed-btn:active { transform: scale(0.98); }

.cancel-btn {
  width: 100%;
  padding: 10px;
  background: transparent;
  color: var(--muted);
  font-size: 13px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  text-align: center;
}
.cancel-btn:hover { color: var(--on-surface); }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
