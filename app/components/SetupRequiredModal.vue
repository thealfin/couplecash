<script setup lang="ts">
const props = defineProps<{
  isOpen: boolean
  hasAccounts: boolean
  hasCategories: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const router = useRouter()

function goToAccounts() {
  emit('close')
  router.push('/akun/kelola-akun')
}

function goToCategories() {
  emit('close')
  router.push('/akun/kategori')
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

          <!-- Glowing Illustration Badge -->
          <div class="illustration-container">
            <div class="illustration-circle">
              <span class="material-symbols-outlined illustration-icon">account_balance_wallet</span>
            </div>
          </div>

          <!-- Header -->
          <div class="text-center mb-5">
            <h2 class="modal-title">Setup Akun &amp; Kategori</h2>
            <p class="modal-subtitle">
              Kamu perlu menambahkan setidaknya satu akun keuangan dan kategori untuk mulai mencatat transaksi.
            </p>
          </div>

          <!-- Status Checklist Box -->
          <div class="status-box">
            <div class="status-row" :class="{ 'status-row--ready': hasAccounts }">
              <div class="status-icon-wrap" :class="hasAccounts ? 'status-icon-wrap--ready' : 'status-icon-wrap--pending'">
                <span class="material-symbols-outlined text-[18px]">
                  {{ hasAccounts ? 'check_circle' : 'warning' }}
                </span>
              </div>
              <div class="status-text">
                <span class="status-label">Akun Rekening / Dompet</span>
                <span class="status-sub">
                  {{ hasAccounts ? 'Sudah ditambahkan' : 'Belum ada akun keuangan terdaftar' }}
                </span>
              </div>
              <button v-if="!hasAccounts" class="status-action-btn" @click="goToAccounts">
                Tambah
              </button>
            </div>

            <div class="status-row" :class="{ 'status-row--ready': hasCategories }">
              <div class="status-icon-wrap" :class="hasCategories ? 'status-icon-wrap--ready' : 'status-icon-wrap--pending'">
                <span class="material-symbols-outlined text-[18px]">
                  {{ hasCategories ? 'check_circle' : 'warning' }}
                </span>
              </div>
              <div class="status-text">
                <span class="status-label">Kategori Transaksi</span>
                <span class="status-sub">
                  {{ hasCategories ? 'Sudah ditambahkan' : 'Belum ada kategori pemasukan/pengeluaran' }}
                </span>
              </div>
              <button v-if="!hasCategories" class="status-action-btn" @click="goToCategories">
                Tambah
              </button>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="actions-wrapper">
            <button v-if="!hasAccounts" class="primary-btn" @click="goToAccounts">
              <span class="material-symbols-outlined text-[18px]">add_card</span>
              <span>Tambah Akun Keuangan</span>
            </button>

            <button v-else-if="!hasCategories" class="primary-btn" @click="goToCategories">
              <span class="material-symbols-outlined text-[18px]">category</span>
              <span>Kelola Kategori Transaksi</span>
            </button>

            <button class="secondary-btn" @click="emit('close')">
              Nanti Saja
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
  padding: 28px 20px 24px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.2);
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
.modal-close-btn:hover {
  background: var(--surface-container-high);
  color: var(--on-surface);
}

.illustration-container {
  margin-bottom: 16px;
}
.illustration-circle {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--primary) 12%, var(--surface-container-lowest));
  border: 2px solid color-mix(in srgb, var(--primary) 25%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px color-mix(in srgb, var(--primary) 20%, transparent);
}
.illustration-icon {
  font-size: 36px;
  color: var(--primary);
}

.modal-title {
  margin: 0 0 6px;
  font-size: 18px;
  font-weight: 700;
  color: var(--on-surface);
}

.modal-subtitle {
  margin: 0;
  font-size: 13px;
  color: var(--muted);
  line-height: 1.45;
  padding: 0 8px;
}

.status-box {
  width: 100%;
  background: var(--surface-container-low);
  border-radius: 18px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 12px;
  background: var(--surface-container-lowest);
  border: 1px solid var(--outline-variant);
}

.status-row--ready {
  border-color: color-mix(in srgb, var(--income) 30%, transparent);
}

.status-icon-wrap {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.status-icon-wrap--ready {
  background: color-mix(in srgb, var(--income) 15%, transparent);
  color: var(--income);
}
.status-icon-wrap--pending {
  background: color-mix(in srgb, var(--error) 15%, transparent);
  color: var(--error);
}

.status-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.status-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--on-surface);
}

.status-sub {
  font-size: 11px;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-action-btn {
  padding: 5px 12px;
  border-radius: 10px;
  background: var(--primary);
  color: white;
  font-size: 11px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  flex-shrink: 0;
}

.actions-wrapper {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.primary-btn {
  width: 100%;
  padding: 14px;
  background: var(--primary);
  color: white;
  font-size: 14px;
  font-weight: 700;
  border-radius: 20px;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 4px 14px rgba(70, 72, 212, 0.3);
  transition: transform 0.15s;
}
.primary-btn:active { transform: scale(0.98); }

.secondary-btn {
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
.secondary-btn:hover { color: var(--on-surface); }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
