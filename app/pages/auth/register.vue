<script setup lang="ts">
definePageMeta({ layout: 'auth' })
useHead({ title: 'Daftar Akun — CoupleCash' })

const router = useRouter()
const { register: authRegister } = useAuth()

const fullName = ref('')
const selectedRole = ref<'suami' | 'istri'>('suami')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')

async function handleRegister() {
  errorMessage.value = ''
  
  if (!password.value) {
    errorMessage.value = 'Kata sandi tidak boleh kosong'
    return
  }

  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'Konfirmasi kata sandi tidak cocok'
    return
  }

  const nameToUse = fullName.value.trim()
  const emailToUse = email.value.trim()

  if (!nameToUse || !emailToUse) {
    errorMessage.value = 'Nama lengkap dan email wajib diisi'
    return
  }

  isLoading.value = true

  try {
    const res = await authRegister(nameToUse, selectedRole.value, emailToUse, password.value)

    if (res.success) {
      router.push('/beranda').catch(() => {})
    } else {
      errorMessage.value = res.message || 'Gagal mendaftarkan akun'
    }
  } catch (err: any) {
    errorMessage.value = err?.message || 'Terjadi kesalahan sistem'
  } finally {
    isLoading.value = false
  }
}

function handleGoToLogin() {
  router.push('/auth/login').catch(() => {})
}
</script>

<template>
  <div class="auth-container animate-fade-in">

    <!-- Background Blobs -->
    <div class="bg-blob bg-blob--1"></div>
    <div class="bg-blob bg-blob--2"></div>

    <div class="auth-content">

      <!-- Hero Icon -->
      <div class="hero-illustration">
        <div class="icon-circle">
          <span class="material-symbols-outlined hero-icon">how_to_reg</span>
        </div>
      </div>

      <!-- Header Title & Subtitle -->
      <div class="auth-header">
        <h1 class="auth-title">
          Mulai Perjalanan,
          <span class="auth-gradient-text">Finansial Bersama.</span>
        </h1>
        <p class="auth-subtitle">
          Buat akun untuk mengatur keuangan berdua dengan lebih mudah.
        </p>
      </div>

      <!-- Form Box Glassmorphism -->
      <div class="form-box">
        <div v-if="errorMessage" class="error-banner">
          <span class="material-symbols-outlined text-[18px]">error</span>
          <span>{{ errorMessage }}</span>
        </div>

        <!-- Nama Lengkap -->
        <div class="input-group">
          <label class="input-label">Nama Lengkap</label>
          <div class="input-field">
            <span class="material-symbols-outlined input-icon">person</span>
            <input type="text" v-model="fullName" placeholder="Masukkan nama Anda" class="text-input" />
          </div>
        </div>

        <!-- Peran Anda -->
        <div class="input-group">
          <label class="input-label">Peran Anda</label>
          <div class="role-toggle-grid">
            <button
              type="button"
              class="role-toggle-btn role-toggle-btn--suami"
              :class="{ active: selectedRole === 'suami' }"
              @click="selectedRole = 'suami'"
            >
              <span class="material-symbols-outlined text-[18px]">face</span>
              <span>Suami</span>
            </button>
            <button
              type="button"
              class="role-toggle-btn role-toggle-btn--istri"
              :class="{ active: selectedRole === 'istri' }"
              @click="selectedRole = 'istri'"
            >
              <span class="material-symbols-outlined text-[18px]">face_3</span>
              <span>Istri</span>
            </button>
          </div>
        </div>

        <!-- Alamat Email -->
        <div class="input-group">
          <label class="input-label">Alamat Email</label>
          <div class="input-field">
            <span class="material-symbols-outlined input-icon">email</span>
            <input type="email" v-model="email" placeholder="contoh@email.com" class="text-input" />
          </div>
        </div>

        <!-- Kata Sandi -->
        <div class="input-group">
          <label class="input-label">Kata Sandi</label>
          <div class="input-field">
            <span class="material-symbols-outlined input-icon">lock</span>
            <input :type="showPassword ? 'text' : 'password'" v-model="password" placeholder="Minimal 8 karakter" class="text-input" />
            <button type="button" class="eye-toggle-btn" @click="showPassword = !showPassword" aria-label="Toggle kata sandi">
              <span class="material-symbols-outlined input-icon">{{ showPassword ? 'visibility_off' : 'visibility' }}</span>
            </button>
          </div>
        </div>

        <!-- Konfirmasi Kata Sandi -->
        <div class="input-group">
          <label class="input-label">Konfirmasi Kata Sandi</label>
          <div class="input-field">
            <span class="material-symbols-outlined input-icon">lock_reset</span>
            <input :type="showPassword ? 'text' : 'password'" v-model="confirmPassword" placeholder="Ulangi kata sandi" class="text-input" @keyup.enter="handleRegister" />
          </div>
        </div>

        <!-- Tombol Utama Daftar -->
        <button class="primary-btn" @click="handleRegister" :disabled="isLoading">
          <span v-if="!isLoading">Daftar Sekarang</span>
          <span v-else class="loading-spinner">
            <span class="material-symbols-outlined animate-spin" style="font-size:18px">refresh</span>
            Memproses pendaftaran...
          </span>
        </button>

        <!-- Tombol Sekunder ke Login -->
        <button class="secondary-btn" @click="handleGoToLogin">
          Sudah punya akun? Masuk
        </button>

      </div>

      <!-- Social Divider -->
      <div class="divider-row">
        <div class="divider-line"></div>
        <span class="divider-text">Atau daftar dengan</span>
        <div class="divider-line"></div>
      </div>

      <!-- Google Button -->
      <button class="google-btn" @click="navigateTo('/api/auth/google', { external: true })">
        <svg class="google-icon" width="20" height="20" viewBox="0 0 48 48">
          <path d="M47.532 24.5528C47.532 22.9214 47.3997 21.2811 47.1175 19.6761H24.48V28.9181H37.4434C36.9055 31.8988 35.177 34.5356 32.6461 36.2111V42.2078H40.3801C44.9217 38.0278 47.532 31.8547 47.532 24.5528Z" fill="#4285F4"/>
          <path d="M24.48 48.0016C30.9529 48.0016 36.4116 45.8764 40.3888 42.2078L32.6549 36.2111C30.5031 37.675 27.7253 38.5039 24.4888 38.5039C18.2275 38.5039 12.9187 34.2798 11.0139 28.6006H3.03296V34.7825C7.10718 42.8868 15.4056 48.0016 24.48 48.0016Z" fill="#34A853"/>
          <path d="M11.0051 28.6006C9.99973 25.6199 9.99973 22.3922 11.0051 19.4115V13.2296H3.03296C-0.371021 20.0112 -0.371021 28.0009 3.03296 34.7825L11.0051 28.6006Z" fill="#FBBC05"/>
          <path d="M24.48 9.49932C27.9016 9.44641 31.2086 10.7339 33.6866 13.0973L40.5387 6.24523C36.2 2.17101 30.4418 -0.068932 24.48 0.00161733C15.4056 0.00161733 7.10718 5.11644 3.03296 13.2296L11.0051 19.4115C12.901 13.7235 18.2187 9.49932 24.48 9.49932Z" fill="#EA4335"/>
        </svg>
        Daftar dengan Google
      </button>

    </div>

  </div>
</template>

<style scoped>
.auth-container {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  position: relative;
  overflow: hidden;
  background: var(--background);
}

.bg-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  pointer-events: none;
  opacity: 0.35;
}
.bg-blob--1 { width: 260px; height: 260px; background: var(--primary); top: -40px; left: -40px; }
.bg-blob--2 { width: 220px; height: 220px; background: var(--istri); bottom: 40px; right: -40px; }

.auth-content {
  max-width: 400px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 1;
}

.hero-illustration { margin-bottom: 20px; }
.icon-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: var(--primary-fixed);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px rgba(70, 72, 212, 0.2);
}
.hero-icon { font-size: 40px; color: var(--primary); font-variation-settings: 'FILL' 1; }

.auth-header { text-align: center; margin-bottom: 20px; }
.auth-title {
  margin: 0 0 8px;
  font-size: 26px;
  font-weight: 800;
  color: var(--on-background);
  line-height: 1.25;
  letter-spacing: -0.02em;
}
.auth-gradient-text {
  background: linear-gradient(90deg, var(--primary) 0%, var(--secondary) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.auth-subtitle {
  margin: 0 auto;
  font-size: 13px;
  color: var(--on-surface-variant);
  max-width: 280px;
  line-height: 1.5;
}

.form-box {
  width: 100%;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  padding: 20px;
  border-radius: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.6);
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 20px;
}

.input-group { display: flex; flex-direction: column; gap: 6px; }
.input-label { font-size: 12px; font-weight: 600; color: var(--on-surface-variant); padding-left: 2px; }
.input-field { display: flex; align-items: center; gap: 10px; background: var(--surface-container-low); padding: 12px 14px; border-radius: 14px; }
.input-icon { color: var(--muted); font-size: 20px; }
.text-input { flex: 1; border: none; background: transparent; font-size: 14px; color: var(--on-surface); outline: none; font-family: inherit; }

.role-toggle-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.role-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px;
  border-radius: 14px;
  border: 1px solid var(--outline-variant);
  background: var(--surface-container-low);
  color: var(--on-surface-variant);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.role-toggle-btn--suami.active {
  background: color-mix(in srgb, var(--suami) 15%, transparent);
  color: var(--suami);
  border-color: var(--suami);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--suami) 30%, transparent);
}

.role-toggle-btn--istri.active {
  background: color-mix(in srgb, var(--istri) 15%, transparent);
  color: var(--istri);
  border-color: var(--istri);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--istri) 30%, transparent);
}

.eye-toggle-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  color: var(--muted);
}
.eye-toggle-btn:hover { color: var(--on-surface); }

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
}

.primary-btn {
  width: 100%;
  padding: 14px;
  border-radius: 14px;
  background: linear-gradient(90deg, var(--primary), var(--secondary));
  color: white;
  font-size: 15px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 4px 14px rgba(70, 72, 212, 0.3);
  transition: transform 0.15s ease;
  margin-top: 4px;
}
.primary-btn:active { transform: scale(0.98); }
.primary-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.secondary-btn {
  width: 100%;
  padding: 12px;
  border-radius: 14px;
  background: var(--surface-container-low);
  color: var(--on-surface);
  font-size: 14px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: background 0.15s;
}
.secondary-btn:hover { background: var(--surface-container); }

.divider-row { display: flex; align-items: center; gap: 12px; width: 100%; margin-bottom: 16px; }
.divider-line { flex: 1; height: 1px; background: var(--outline-variant); }
.divider-text { font-size: 11px; text-transform: uppercase; color: var(--muted); letter-spacing: 0.06em; }

.google-btn {
  width: 100%;
  padding: 14px;
  border-radius: 14px;
  background: white;
  color: #3c4043;
  font-size: 14px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.12);
  transition: transform 0.15s ease;
}
.google-btn:active { transform: scale(0.98); }

.loading-spinner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  color: white;
  font-size: 14px;
}
</style>
