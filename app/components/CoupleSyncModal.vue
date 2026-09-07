<script setup lang="ts">
const { isSyncModalOpen, closeSyncModal, syncPartner, getAuthToken, fetchProfile, currentUser } = useAuth()

type Mode = 'options' | 'generate' | 'input'
const mode = ref<Mode>('options')

const chosenRole = ref<'suami' | 'istri'>('suami')

// Initialize chosenRole from currentUser if already set
watch(() => currentUser.value?.role, (newRole) => {
  if (newRole === 'istri') {
    chosenRole.value = 'istri'
  } else {
    chosenRole.value = 'suami'
  }
}, { immediate: true })

const generatedCode = ref<string>('')
const isGenerating = ref(false)
const copied = ref(false)

const pinDigits = ref<string[]>(['', '', '', '', '', ''])
const inputRefs = ref<HTMLInputElement[]>([])
const isVerifying = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

function handleBack() {
  if (mode.value !== 'options') {
    mode.value = 'options'
    errorMessage.value = ''
    successMessage.value = ''
  } else {
    resetModal()
  }
}

async function handleGenerateCode() {
  mode.value = 'generate'
  isGenerating.value = true
  errorMessage.value = ''
  try {
    const token = await getAuthToken()
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    const res: any = await $fetch('/api/couple/generate-code', {
      method: 'POST',
      headers,
      body: { chosenRole: chosenRole.value },
    })
    generatedCode.value = res?.code || '682941'
  } catch (err: any) {
    errorMessage.value = err?.statusMessage || err?.message || 'Gagal membuat kode undangan'
    generatedCode.value = Math.floor(100000 + Math.random() * 900000).toString()
  } finally {
    isGenerating.value = false
  }
}

function copyCode() {
  if (!generatedCode.value) return
  if (navigator.clipboard) {
    navigator.clipboard.writeText(generatedCode.value)
  }
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

function openInputMode() {
  mode.value = 'input'
  errorMessage.value = ''
  successMessage.value = ''
  nextTick(() => {
    inputRefs.value[0]?.focus()
  })
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
    errorMessage.value = 'Masukkan 6 digit kode undangan lengkap'
    return
  }

  isVerifying.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const token = await getAuthToken()
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    const res: any = await $fetch('/api/couple/verify-code', {
      method: 'POST',
      headers,
      body: { code: pin, myRole: chosenRole.value },
    })

    if (res?.success) {
      successMessage.value = res.message || 'Berhasil terhubung dengan pasangan!'
      if (token) {
        await fetchProfile(token)
      }
      setTimeout(() => {
        syncPartner(pin)
        resetModal()
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('couple-synced'))
        }
      }, 1500)
    } else {
      errorMessage.value = res?.message || 'Kode undangan tidak valid'
    }
  } catch (err: any) {
    errorMessage.value = err?.data?.statusMessage || err?.statusMessage || err?.message || 'Kode undangan salah atau sudah tidak berlaku'
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
      <div v-if="isSyncModalOpen" class="sync-fullscreen-page">
        <div class="page-container">

          <!-- Standalone Header with Back Button (like budget.vue) -->
          <header class="sync-header">
            <div class="header-left">
              <button
                @click="handleBack"
                class="header-back-btn"
                aria-label="Kembali"
              >
                <span class="material-symbols-outlined text-[20px]">arrow_back</span>
              </button>
              <div>
                <h1 class="header-title">
                  {{ mode === 'options' ? 'Sinkronisasi Pasangan' : mode === 'generate' ? 'Kode Undangan' : 'Masukkan Kode' }}
                </h1>
                <p class="header-subtitle">
                  {{ mode === 'options' ? 'Kelola keuangan berdua dalam satu household' : mode === 'generate' ? 'Bagikan kode 6 digit ini ke pasangan' : 'Gabung ke akun household pasangan Anda' }}
                </p>
              </div>
            </div>

            <button
              @click="resetModal"
              class="header-close-btn"
              aria-label="Tutup"
            >
              <span class="material-symbols-outlined text-[18px]">close</span>
            </button>
          </header>

          <!-- CONTENT AREA -->
          <main class="sync-content animate-fade-in">

            <!-- MODE 1: OPTIONS -->
            <section v-if="mode === 'options'" class="mode-section">
              <!-- Illustration Circle -->
              <div class="hero-illustration">
                <div class="hero-circle">
                  <div class="avatars-overlap">
                    <div class="avatar-badge avatar-suami">
                      <span class="material-symbols-outlined text-[28px]">face</span>
                    </div>
                    <div class="link-badge">
                      <span class="material-symbols-outlined text-[16px]">favorite</span>
                    </div>
                    <div class="avatar-badge avatar-istri">
                      <span class="material-symbols-outlined text-[28px]">face_3</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="text-center mb-6">
                <h2 class="section-title">Satu Visi, Finansial Bahagia</h2>
                <p class="section-desc">
                  Hubungkan akun dengan pasangan Anda untuk transparansi keuangan, anggaran bersama, dan pantauan tabungan impian.
                </p>
              </div>

              <!-- Options Selection Cards -->
              <div class="options-list">
                <button class="action-card action-card--primary" @click="handleGenerateCode">
                  <div class="card-icon-box card-icon--primary">
                    <span class="material-symbols-outlined text-[24px]">qr_code_2</span>
                  </div>
                  <div class="card-text-box">
                    <h3 class="card-title">Buat Kode Undangan</h3>
                    <p class="card-desc">Jika Anda yang pertama kali mengatur household dan ingin mengundang pasangan.</p>
                  </div>
                  <span class="material-symbols-outlined card-arrow">chevron_right</span>
                </button>

                <button class="action-card action-card--secondary" @click="openInputMode">
                  <div class="card-icon-box card-icon--secondary">
                    <span class="material-symbols-outlined text-[24px]">key</span>
                  </div>
                  <div class="card-text-box">
                    <h3 class="card-title">Masukkan Kode Pasangan</h3>
                    <p class="card-desc">Jika pasangan Anda sudah membuat kode undangan terlebih dahulu.</p>
                  </div>
                  <span class="material-symbols-outlined card-arrow">chevron_right</span>
                </button>
              </div>

              <!-- Info Card -->
              <div class="info-tip-card">
                <span class="material-symbols-outlined tip-icon">security</span>
                <p class="tip-text">
                  Data rekening pribadi Anda tetap terjaga. Saldo dan transaksi bersama akan otomatis tersinkronisasi secara real-time.
                </p>
              </div>
            </section>

            <!-- MODE 2: GENERATE CODE -->
            <section v-else-if="mode === 'generate'" class="mode-section">
              <div class="mode-badge-wrap">
                <span class="material-symbols-outlined mode-badge-icon text-primary">share</span>
              </div>

              <div class="text-center mb-6">
                <h2 class="section-title">Bagikan Kode Undangan</h2>
                <p class="section-desc">Minta pasangan Anda membuka menu Sinkronisasi dan memilih "Masukkan Kode Pasangan".</p>
              </div>

              <div v-if="errorMessage" class="alert-box alert-box--error">
                <span class="material-symbols-outlined text-[18px]">error</span>
                <span>{{ errorMessage }}</span>
              </div>

              <!-- Role Selector for Generator -->
              <div class="role-selection-box mb-4">
                <p class="role-selection-label">Peran Anda dalam Keluarga:</p>
                <div class="role-selector-pills">
                  <button
                    type="button"
                    class="role-pill-btn"
                    :class="{ 'role-pill-btn--active-suami': chosenRole === 'suami' }"
                    @click="chosenRole = 'suami'; handleGenerateCode()"
                  >
                    <span class="material-symbols-outlined text-[18px]">face</span>
                    <span>Suami</span>
                  </button>
                  <button
                    type="button"
                    class="role-pill-btn"
                    :class="{ 'role-pill-btn--active-istri': chosenRole === 'istri' }"
                    @click="chosenRole = 'istri'; handleGenerateCode()"
                  >
                    <span class="material-symbols-outlined text-[18px]">face_3</span>
                    <span>Istri</span>
                  </button>
                </div>
              </div>

              <!-- Big OTP Display Box -->
              <div class="otp-card">
                <div v-if="isGenerating" class="flex items-center justify-center gap-2 py-4 text-[var(--muted)]">
                  <span class="material-symbols-outlined animate-spin text-[24px]">refresh</span>
                  <span class="text-sm font-medium">Membuat kode unik...</span>
                </div>
                <div v-else class="otp-display">
                  <span class="otp-digits">{{ generatedCode }}</span>
                  <span class="otp-expiry">Berlaku selama 60 menit</span>
                </div>
              </div>

              <div class="action-buttons-group">
                <button class="btn-cta btn-cta--primary" @click="copyCode" :disabled="isGenerating">
                  <span class="material-symbols-outlined text-[20px]">{{ copied ? 'check' : 'content_copy' }}</span>
                  <span>{{ copied ? 'Kode Berhasil Disalin!' : 'Salin Kode Undangan' }}</span>
                </button>

                <button class="btn-cta btn-cta--outline" @click="mode = 'options'">
                  <span>Pilih Opsi Lain</span>
                </button>
              </div>
            </section>

            <!-- MODE 3: INPUT CODE -->
            <section v-else-if="mode === 'input'" class="mode-section">
              <div class="mode-badge-wrap">
                <span class="material-symbols-outlined mode-badge-icon text-secondary">pin</span>
              </div>

              <div class="text-center mb-6">
                <h2 class="section-title">Ketik Kode Undangan</h2>
                <p class="section-desc">Ketik 6 digit angka yang diberikan oleh pasangan Anda.</p>
              </div>

              <div v-if="errorMessage" class="alert-box alert-box--error">
                <span class="material-symbols-outlined text-[18px]">error</span>
                <span>{{ errorMessage }}</span>
              </div>

              <div v-if="successMessage" class="alert-box alert-box--success">
                <span class="material-symbols-outlined text-[18px]">check_circle</span>
                <span>{{ successMessage }}</span>
              </div>

              <!-- Role Selector for Inputter -->
              <div class="role-selection-box mb-4">
                <p class="role-selection-label">Pilih Peran Anda:</p>
                <div class="role-selector-pills">
                  <button
                    type="button"
                    class="role-pill-btn"
                    :class="{ 'role-pill-btn--active-suami': chosenRole === 'suami' }"
                    @click="chosenRole = 'suami'"
                  >
                    <span class="material-symbols-outlined text-[18px]">face</span>
                    <span>Suami</span>
                  </button>
                  <button
                    type="button"
                    class="role-pill-btn"
                    :class="{ 'role-pill-btn--active-istri': chosenRole === 'istri' }"
                    @click="chosenRole = 'istri'"
                  >
                    <span class="material-symbols-outlined text-[18px]">face_3</span>
                    <span>Istri</span>
                  </button>
                </div>
              </div>

              <!-- 6 Digit PIN Boxes -->
              <div class="pin-group">
                <div class="pin-inputs-row">
                  <input
                    v-for="i in 3"
                    :key="i - 1"
                    :ref="(el) => { if (el) inputRefs[i - 1] = el as HTMLInputElement }"
                    v-model="pinDigits[i - 1]"
                    class="pin-digit-box"
                    maxlength="1"
                    type="text"
                    inputmode="numeric"
                    pattern="[0-9]*"
                    aria-label="Digit PIN"
                    @input="onInput(i - 1, $event)"
                    @keydown="onKeyDown(i - 1, $event)"
                  />
                  <span class="pin-separator">-</span>
                  <input
                    v-for="i in 3"
                    :key="i + 2"
                    :ref="(el) => { if (el) inputRefs[i + 2] = el as HTMLInputElement }"
                    v-model="pinDigits[i + 2]"
                    class="pin-digit-box"
                    maxlength="1"
                    type="text"
                    inputmode="numeric"
                    pattern="[0-9]*"
                    aria-label="Digit PIN"
                    @input="onInput(i + 2, $event)"
                    @keydown="onKeyDown(i + 2, $event)"
                  />
                </div>
              </div>

              <div class="action-buttons-group mt-6">
                <button class="btn-cta btn-cta--primary" @click="handleVerifySync" :disabled="isVerifying">
                  <span v-if="!isVerifying" class="material-symbols-outlined text-[20px]">link</span>
                  <span v-else class="material-symbols-outlined animate-spin text-[20px]">refresh</span>
                  <span>{{ isVerifying ? 'Memverifikasi...' : 'Hubungkan dengan Pasangan' }}</span>
                </button>

                <button class="btn-cta btn-cta--outline" @click="mode = 'options'">
                  <span>Kembali</span>
                </button>
              </div>
            </section>

          </main>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sync-fullscreen-page {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: var(--background, #f8fafc);
  overflow-y: auto;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}

.page-container {
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  flex: 1;
}

/* Header matching budget.vue */
.sync-header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding: 10px 0 10px;
  background: var(--background, #f8fafc);
  backdrop-filter: blur(8px);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-back-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--surface-container-low, #f1f5f9);
  border: 1px solid var(--outline-variant, #e2e8f0);
  color: var(--on-surface-variant, #475569);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  transition: transform 0.15s, background 0.15s;
}
.header-back-btn:active {
  transform: scale(0.95);
}

.header-title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: var(--on-surface, #0f172a);
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.header-subtitle {
  margin: 2px 0 0;
  font-size: 11px;
  color: var(--muted, #64748b);
  line-height: 1.3;
}

.header-close-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--surface-container-low, #f1f5f9);
  border: none;
  color: var(--on-surface-variant, #475569);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s;
}
.header-close-btn:hover {
  background: var(--surface-container, #e2e8f0);
}

/* Content Area */
.sync-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.mode-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

/* Hero Illustration */
.hero-illustration {
  margin: 8px 0 20px;
}

.hero-circle {
  width: 108px;
  height: 108px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(96,99,238,0.12) 0%, rgba(236,72,153,0.12) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px rgba(96,99,238,0.1);
}

.avatars-overlap {
  display: flex;
  align-items: center;
  position: relative;
}

.avatar-badge {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid #ffffff;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}
.avatar-suami {
  background: #eff6ff;
  color: #2563eb;
  z-index: 1;
}
.avatar-istri {
  background: #fdf2f8;
  color: #db2777;
  margin-left: -14px;
  z-index: 1;
}

.link-badge {
  position: absolute;
  top: -6px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #ef4444;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(239,68,68,0.3);
}

.section-title {
  margin: 0 0 6px;
  font-size: 21px;
  font-weight: 800;
  color: var(--on-surface, #0f172a);
  letter-spacing: -0.02em;
}

.section-desc {
  margin: 0 auto;
  font-size: 13px;
  color: var(--muted, #64748b);
  line-height: 1.5;
  max-width: 380px;
}

/* Options Selection List */
.options-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  margin-bottom: 20px;
}

.action-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border-radius: 20px;
  background: var(--surface-container-lowest, #ffffff);
  border: 1px solid var(--outline-variant, #e2e8f0);
  box-shadow: 0 4px 16px rgba(0,0,0,0.04);
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
}
.action-card:hover {
  border-color: var(--primary, #6063ee);
  box-shadow: 0 6px 20px rgba(96,99,238,0.12);
  transform: translateY(-1px);
}
.action-card:active {
  transform: scale(0.99);
}

.card-icon-box {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.card-icon--primary {
  background: rgba(96,99,238,0.1);
  color: var(--primary, #6063ee);
}
.card-icon--secondary {
  background: rgba(236,72,153,0.1);
  color: var(--istri, #ec4899);
}

.card-text-box {
  flex: 1;
}
.card-title {
  margin: 0 0 3px;
  font-size: 15px;
  font-weight: 700;
  color: var(--on-surface, #0f172a);
}
.card-desc {
  margin: 0;
  font-size: 12px;
  color: var(--muted, #64748b);
  line-height: 1.4;
}
.card-arrow {
  color: var(--muted, #94a3b8);
  font-size: 22px;
}

.info-tip-card {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(96,99,238,0.06);
  border: 1px dashed rgba(96,99,238,0.3);
  width: 100%;
}
.tip-icon {
  font-size: 20px;
  color: var(--primary, #6063ee);
  flex-shrink: 0;
  margin-top: 1px;
}
.tip-text {
  margin: 0;
  font-size: 12px;
  color: var(--on-surface-variant, #334155);
  line-height: 1.5;
}

/* Mode Headers */
.mode-badge-wrap {
  width: 56px;
  height: 56px;
  border-radius: 18px;
  background: var(--surface-container-low, #f1f5f9);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}
.mode-badge-icon {
  font-size: 30px;
}

/* OTP Display Box */
.otp-card {
  width: 100%;
  background: var(--surface-container-lowest, #ffffff);
  border-radius: 20px;
  padding: 24px;
  border: 1px solid var(--outline-variant, #e2e8f0);
  box-shadow: 0 6px 24px rgba(0,0,0,0.05);
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 24px;
}
.otp-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.otp-digits {
  font-size: 36px;
  font-weight: 800;
  letter-spacing: 0.28em;
  color: var(--primary, #6063ee);
  font-family: monospace, system-ui;
  text-indent: 0.28em;
}
.otp-expiry {
  font-size: 12px;
  color: var(--muted, #64748b);
}

/* PIN Inputs */
.pin-group {
  width: 100%;
  display: flex;
  justify-content: center;
  margin: 16px 0;
}
.pin-inputs-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.pin-digit-box {
  width: 44px;
  height: 52px;
  text-align: center;
  font-size: 22px;
  font-weight: 800;
  border-radius: 14px;
  border: 1.5px solid var(--outline-variant, #cbd5e1);
  background: var(--surface-container-lowest, #ffffff);
  color: var(--on-surface, #0f172a);
  outline: none;
  transition: all 0.15s ease;
}
.pin-digit-box:focus {
  border-color: var(--primary, #6063ee);
  box-shadow: 0 0 0 3px rgba(96,99,238,0.15);
}
.pin-separator {
  font-size: 20px;
  font-weight: 700;
  color: var(--muted, #94a3b8);
}

/* Buttons */
.action-buttons-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}
.btn-cta {
  width: 100%;
  padding: 14px;
  border-radius: 16px;
  font-size: 14px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.15s ease;
}
.btn-cta--primary {
  background: linear-gradient(90deg, var(--primary, #6063ee), var(--secondary, #ec4899));
  color: white;
  box-shadow: 0 4px 14px rgba(96,99,238,0.3);
}
.btn-cta--primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.btn-cta--primary:active {
  transform: scale(0.98);
}
.btn-cta--outline {
  background: transparent;
  border: 1px solid var(--outline-variant, #cbd5e1);
  color: var(--on-surface-variant, #475569);
}
.btn-cta--outline:hover {
  background: var(--surface-container-low, #f1f5f9);
}

/* Alerts */
.alert-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 14px;
  font-size: 13px;
  font-weight: 500;
  width: 100%;
  margin-bottom: 16px;
}
.alert-box--error {
  background: #fee2e2;
  color: #991b1b;
}
.alert-box--success {
  background: #dcfce7;
  color: #166534;
}

/* Role Pills */
.role-selection-box {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.role-selection-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--on-surface, #0f172a);
  margin: 0;
}
.role-selector-pills {
  display: flex;
  gap: 10px;
  width: 100%;
  max-width: 320px;
}
.role-pill-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 14px;
  border-radius: 14px;
  border: 1.5px solid var(--outline-variant, #cbd5e1);
  background: var(--surface-container-lowest, #ffffff);
  color: var(--on-surface-variant, #475569);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}
.role-pill-btn--active-suami {
  border-color: #2563eb !important;
  background: #eff6ff !important;
  color: #2563eb !important;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.25);
}
.role-pill-btn--active-istri {
  border-color: #ec4899 !important;
  background: #fdf2f8 !important;
  color: #ec4899 !important;
  box-shadow: 0 0 0 2px rgba(236, 72, 153, 0.25);
}

/* Animations */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
