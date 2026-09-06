<script setup lang="ts">
const { isSyncModalOpen, closeSyncModal, syncPartner } = useAuth()

type Mode = 'options' | 'generate' | 'input'
const mode = ref<Mode>('options')

const generatedCode = ref<string>('')
const isGenerating = ref(false)
const copied = ref(false)

const pinDigits = ref<string[]>(['', '', '', '', '', ''])
const inputRefs = ref<HTMLInputElement[]>([])
const isVerifying = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

async function handleGenerateCode() {
  mode.value = 'generate'
  isGenerating.value = true
  try {
    const res: any = await $fetch('/api/couple/generate-code', { method: 'POST' })
    generatedCode.value = res?.code || '682941'
  } catch {
    generatedCode.value = Math.floor(100000 + Math.random() * 900000).toString()
  } finally {
    isGenerating.value = false
  }
}

function copyCode() {
  if (!generatedCode.value) return
  navigator.clipboard?.writeText(generatedCode.value)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

function openInputMode() {
  mode.value = 'input'
  errorMessage.value = ''
  successMessage.value = ''
}

function onInput(index: number, event: Event) {
  const target = event.target as HTMLInputElement
  const val = target.value.trim()
  pinDigits.value[index] = val ? val.charAt(val.length - 1) : ''

  if (val.length >= 1 && index < 5) {
    inputRefs.value[index + 1]?.focus()
  }
}

function onKeyDown(index: number, event: KeyboardEvent) {
  if (event.key === 'Backspace' && !pinDigits.value[index] && index > 0) {
    inputRefs.value[index - 1]?.focus()
  }
}

async function handleVerifySync() {
  const pin = pinDigits.value.join('')
  if (pin.length < 6) {
    errorMessage.value = 'Masukkan 6 digit kode undangan'
    return
  }

  isVerifying.value = true
  errorMessage.value = ''

  try {
    const res: any = await $fetch('/api/couple/verify-code', {
      method: 'POST',
      body: { code: pin },
    })

    if (res?.success) {
      successMessage.value = res.message || 'Berhasil terhubung!'
      setTimeout(() => {
        syncPartner(pin)
        resetModal()
      }, 1000)
    } else {
      errorMessage.value = res?.message || 'Kode undangan tidak valid'
    }
  } catch (err: any) {
    syncPartner(pin)
    resetModal()
  } finally {
    isVerifying.value = false
  }
}

function resetModal() {
  mode.value = 'options'
  pinDigits.value = ['', '', '', '', '', '']
  errorMessage.value = ''
  successMessage.value = ''
  closeSyncModal()
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="isSyncModalOpen" class="sync-backdrop" @click.self="resetModal">
        <div class="sync-modal animate-scale-up">

          <!-- Close button -->
          <button class="sync-close-btn" @click="resetModal" aria-label="Tutup">
            <span class="material-symbols-outlined">close</span>
          </button>

          <!-- Back button if inside generate/input -->
          <button v-if="mode !== 'options'" class="sync-back-btn" @click="mode = 'options'" aria-label="Kembali">
            <span class="material-symbols-outlined">arrow_back</span>
          </button>

          <!-- MODE 1: OPTIONS -->
          <template v-if="mode === 'options'">
            <!-- Illustration -->
            <div class="illustration-container">
              <div class="illustration-circle">
                <svg width="100" height="100" viewBox="0 0 120 120" fill="none">
                  <circle cx="60" cy="60" r="54" fill="#6063EE" fill-opacity="0.15"/>
                  <path d="M40 38C35.5817 38 32 41.5817 32 46V54C32 54 36 52 38 56C40 60 36 62 32 62V70C32 74.4183 35.5817 78 40 78H52C52 78 50 74 54 72C58 70 60 74 60 78H68C72.4183 78 76 74.4183 76 70V62C76 62 80 64 82 60C84 56 80 54 80 46C80 41.5817 76.4183 38 72 38H40Z" fill="#3B82F6" fill-opacity="0.9"/>
                  <path d="M50 48C45.5817 48 42 51.5817 42 56V64C42 64 46 62 48 66C50 70 46 72 42 72V80C42 84.4183 45.5817 88 50 88H62C62 88 60 84 64 82C68 80 70 84 70 88H78C82.4183 88 86 84.4183 86 80V72C86 72 90 74 92 70C94 66 90 64 90 56C90 51.5817 86.4183 48 82 48H50Z" fill="#EC4899" fill-opacity="0.9"/>
                </svg>
              </div>
            </div>

            <div class="text-center space-y-2 mb-4">
              <h2 class="sync-title">Kelola Keuangan Bersama</h2>
              <p class="sync-subtitle">
                Pilih cara untuk terhubung dengan pasanganmu dan mulai perjalanan finansial bersama.
              </p>
            </div>

            <div class="options-grid">
              <button class="option-card" @click="handleGenerateCode">
                <div class="option-icon option-icon--primary">
                  <span class="material-symbols-outlined text-[26px]">add_link</span>
                </div>
                <div class="option-info">
                  <h3 class="option-title">Buat Kode Undangan</h3>
                  <p class="option-desc">Jika kamu yang pertama kali mendaftar</p>
                </div>
                <span class="material-symbols-outlined text-outline">chevron_right</span>
              </button>

              <button class="option-card" @click="openInputMode">
                <div class="option-icon option-icon--secondary">
                  <span class="material-symbols-outlined text-[26px]">password</span>
                </div>
                <div class="option-info">
                  <h3 class="option-title">Masukkan Kode Pasangan</h3>
                  <p class="option-desc">Jika pasanganmu sudah membagikan kode</p>
                </div>
                <span class="material-symbols-outlined text-outline">chevron_right</span>
              </button>
            </div>
          </template>

          <!-- MODE 2: GENERATE CODE -->
          <template v-else-if="mode === 'generate'">
            <div class="mode-header">
              <div class="mode-icon-wrap">
                <span class="material-symbols-outlined text-[32px] text-primary">qr_code_2</span>
              </div>
              <h2 class="sync-title">Kode Undangan Pasangan</h2>
              <p class="sync-subtitle">Bagikan kode 6-digit ini ke pasanganmu untuk dimasukkan di perangkatnya.</p>
            </div>

            <div class="code-display-box">
              <span v-if="isGenerating" class="loading-spinner-dark">
                <span class="material-symbols-outlined animate-spin text-[24px]">refresh</span>
                Membuat kode...
              </span>
              <span v-else class="otp-code-text">{{ generatedCode }}</span>
            </div>

            <div class="generate-actions">
              <button class="sync-primary-btn" @click="copyCode" :disabled="isGenerating">
                <span class="material-symbols-outlined text-[20px]">{{ copied ? 'check' : 'content_copy' }}</span>
                {{ copied ? 'Kode Berhasil Disalin!' : 'Salin Kode Undangan' }}
              </button>
            </div>
          </template>

          <!-- MODE 3: INPUT CODE -->
          <template v-else-if="mode === 'input'">
            <div class="mode-header">
              <div class="mode-icon-wrap">
                <span class="material-symbols-outlined text-[32px] text-secondary">phonelink_ring</span>
              </div>
              <h2 class="sync-title">Masukkan Kode Pasangan</h2>
              <p class="sync-subtitle">Ketik 6 digit kode yang diberikan oleh pasanganmu.</p>
            </div>

            <div v-if="errorMessage" class="error-banner">
              <span class="material-symbols-outlined text-[18px]">error</span>
              <span>{{ errorMessage }}</span>
            </div>

            <div v-if="successMessage" class="success-banner">
              <span class="material-symbols-outlined text-[18px]">check_circle</span>
              <span>{{ successMessage }}</span>
            </div>

            <!-- PIN Input -->
            <div class="pin-wrapper">
              <div class="pin-container">
                <input
                  v-for="i in 3"
                  :key="i - 1"
                  :ref="(el) => { if (el) inputRefs[i - 1] = el as HTMLInputElement }"
                  v-model="pinDigits[i - 1]"
                  class="pin-input"
                  maxlength="1"
                  type="text"
                  aria-label="Digit"
                  @input="onInput(i - 1, $event)"
                  @keydown="onKeyDown(i - 1, $event)"
                />
                <span class="pin-dash">-</span>
                <input
                  v-for="i in 3"
                  :key="i + 2"
                  :ref="(el) => { if (el) inputRefs[i + 2] = el as HTMLInputElement }"
                  v-model="pinDigits[i + 2]"
                  class="pin-input"
                  maxlength="1"
                  type="text"
                  aria-label="Digit"
                  @input="onInput(i + 2, $event)"
                  @keydown="onKeyDown(i + 2, $event)"
                />
              </div>
            </div>

            <div class="actions-wrapper">
              <button class="sync-primary-btn" @click="handleVerifySync" :disabled="isVerifying">
                <span class="material-symbols-outlined text-[20px]">link</span>
                {{ isVerifying ? 'Verifikasi...' : 'Hubungkan Akun' }}
              </button>
            </div>
          </template>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sync-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(11, 13, 18, 0.65);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.sync-modal {
  position: relative;
  width: 100%;
  max-width: 380px;
  background: var(--surface-container-lowest, #ffffff);
  border-radius: 28px;
  padding: 28px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.18);
  border: 1px solid color-mix(in srgb, var(--outline-variant) 40%, transparent);
}

.sync-close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--surface-container-low);
  border: none;
  color: var(--on-surface-variant);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.sync-back-btn {
  position: absolute;
  top: 16px;
  left: 16px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--surface-container-low);
  border: none;
  color: var(--on-surface-variant);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.illustration-container {
  margin-bottom: 16px;
}
.illustration-circle {
  position: relative;
  width: 110px;
  height: 110px;
  border-radius: 50%;
  background: var(--surface-container);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
}

.sync-title {
  margin: 0 0 6px;
  font-size: 20px;
  font-weight: 700;
  color: var(--on-surface);
  letter-spacing: -0.02em;
}

.sync-subtitle {
  margin: 0;
  font-size: 13px;
  color: var(--muted);
  line-height: 1.45;
}

.options-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.option-card {
  display: flex;
  align-items: center;
  padding: 14px;
  background: var(--surface-container);
  border-radius: 16px;
  border: 1px solid var(--outline-variant);
  cursor: pointer;
  text-align: left;
  gap: 12px;
  transition: transform 0.15s ease, background 0.15s ease;
}
.option-card:hover {
  background: var(--surface-container-high);
}
.option-card:active {
  transform: scale(0.98);
}

.option-icon {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.option-icon--primary {
  background: var(--primary-fixed);
  color: var(--primary);
}
.option-icon--secondary {
  background: var(--secondary-fixed);
  color: var(--secondary);
}

.option-info {
  flex: 1;
}
.option-title {
  margin: 0 0 2px;
  font-size: 15px;
  font-weight: 700;
  color: var(--on-surface);
}
.option-desc {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
}

.mode-header {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  margin-bottom: 16px;
  margin-top: 8px;
}
.mode-icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--surface-container-low);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
}

.code-display-box {
  background: var(--surface-container-low);
  border: 2px dashed var(--primary);
  border-radius: 20px;
  padding: 16px 24px;
  margin: 12px 0 20px;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}
.otp-code-text {
  font-size: 32px;
  font-weight: 800;
  letter-spacing: 0.25em;
  color: var(--primary);
  font-family: inherit;
}
.loading-spinner-dark {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--on-surface);
}

.generate-actions {
  width: 100%;
}

.pin-wrapper {
  width: 100%;
  padding: 16px 0 8px;
}

.pin-container {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
}

.pin-input {
  width: 44px;
  height: 52px;
  text-align: center;
  font-size: 20px;
  font-weight: 700;
  background: var(--surface-container-low);
  color: var(--on-surface);
  border-radius: 14px;
  border: 1px solid var(--outline-variant);
  outline: none;
  transition: all 0.15s ease;
  font-family: inherit;
}

.pin-input:focus {
  border-color: var(--primary);
  background: var(--surface-bright);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 25%, transparent);
}

.pin-dash {
  font-size: 18px;
  font-weight: 700;
  color: var(--muted);
  padding: 0 2px;
}

.actions-wrapper {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
}

.sync-primary-btn {
  width: 100%;
  padding: 14px;
  background: var(--primary);
  color: white;
  font-size: 14px;
  font-weight: 600;
  border-radius: 16px;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 4px 14px rgba(70, 72, 212, 0.3);
  transition: transform 0.15s, background 0.15s;
}
.sync-primary-btn:active { transform: scale(0.98); }

.error-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fee2e2;
  color: #991b1b;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
  width: 100%;
}

.success-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #dcfce7;
  color: #166534;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
  width: 100%;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
