<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'

definePageMeta({ layout: 'app' })
useHead({ title: 'Keamanan & Biometrik — CoupleCash' })

const router = useRouter()
const { getAuthToken, currentUser } = useAuth()
const webAuthn = useWebAuthn()
const { autoLockMinutes, setAutoLockMinutes } = useVaultSecurity()

const loading = ref(false)
const devices = ref<any[]>([])
const pinConfigured = ref(false)
const biometricEnabled = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

// Device registration state
const isRegisteringDevice = ref(false)
const newDeviceName = ref('')

// PIN modal state
const showPinModal = ref(false)
const oldPinInput = ref('')
const pinInput = ref('')
const pinConfirmInput = ref('')
const isSubmittingPin = ref(false)
const pinModalError = ref('')

onMounted(async () => {
  await webAuthn.checkSupport()
  await loadSecurityStatus()
})

async function loadSecurityStatus() {
  loading.value = true
  try {
    const token = await getAuthToken()
    if (!token) return

    const res: any = await $fetch('/api/security/webauthn/devices', {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (res?.success) {
      devices.value = res.devices || []
      pinConfigured.value = !!res.pinConfigured
      biometricEnabled.value = !!res.biometricEnabled
    }
  } catch (err: any) {
    console.error('[keamanan.vue] loadSecurityStatus error:', err)
  } finally {
    loading.value = false
  }
}

async function handleRegisterBiometric() {
  errorMessage.value = ''
  successMessage.value = ''
  isRegisteringDevice.value = true

  // Auto-detect friendly device name
  let defaultName = 'Perangkat Ini'
  if (typeof navigator !== 'undefined') {
    const ua = navigator.userAgent
    if (/Android/i.test(ua)) defaultName = 'Ponsel Android'
    else if (/iPhone|iPad/i.test(ua)) defaultName = 'Apple Device (Face ID/Touch ID)'
    else if (/Windows/i.test(ua)) defaultName = 'Windows PC (Windows Hello)'
    else if (/Macintosh/i.test(ua)) defaultName = 'MacBook (Touch ID)'
  }

  try {
    const res = await webAuthn.registerBiometric(newDeviceName.value.trim() || defaultName)
    if (res?.success) {
      successMessage.value = 'Biometrik perangkat berhasil didaftarkan!'
      newDeviceName.value = ''
      await loadSecurityStatus()
      setTimeout(() => { successMessage.value = '' }, 4000)
    }
  } catch (err: any) {
    errorMessage.value = err?.message || 'Gagal mendaftarkan biometrik'
  } finally {
    isRegisteringDevice.value = false
  }
}

async function handleRevokeDevice(device: any) {
  if (!confirm(`Cabut akses biometrik untuk "${device.deviceType}"? Perangkat ini tidak akan bisa lagi membuka brankas dengan biometrik.`)) {
    return
  }

  loading.value = true
  errorMessage.value = ''
  try {
    const token = await getAuthToken()
    const res: any = await $fetch('/api/security/webauthn/devices/revoke', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: { deviceId: device.id },
    })

    if (res?.success) {
      successMessage.value = 'Akses biometrik berhasil dicabut'
      await loadSecurityStatus()
      setTimeout(() => { successMessage.value = '' }, 3000)
    }
  } catch (err: any) {
    errorMessage.value = err?.data?.statusMessage || err?.message || 'Gagal mencabut akses perangkat'
  } finally {
    loading.value = false
  }
}

function openPinModal() {
  oldPinInput.value = ''
  pinInput.value = ''
  pinConfirmInput.value = ''
  pinModalError.value = ''
  showPinModal.value = true
}

async function handleSavePin() {
  pinModalError.value = ''
  if (pinConfigured.value && !oldPinInput.value) {
    pinModalError.value = 'Masukkan PIN lama terlebih dahulu'
    return
  }
  if (!pinInput.value || pinInput.value.length < 4 || pinInput.value.length > 8) {
    pinModalError.value = 'PIN baru harus berupa 4 hingga 8 digit angka'
    return
  }
  if (pinInput.value !== pinConfirmInput.value) {
    pinModalError.value = 'Konfirmasi PIN tidak cocok'
    return
  }

  isSubmittingPin.value = true
  try {
    const token = await getAuthToken()
    const res: any = await $fetch('/api/security/pin/set', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        pin: pinInput.value,
        oldPin: pinConfigured.value ? oldPinInput.value : undefined,
      },
    })

    if (res?.success) {
      showPinModal.value = false
      pinConfigured.value = true
      successMessage.value = 'PIN keamanan berhasil disimpan!'
      setTimeout(() => { successMessage.value = '' }, 4000)
    }
  } catch (err: any) {
    pinModalError.value = err?.data?.statusMessage || err?.message || 'Gagal menyimpan PIN'
  } finally {
    isSubmittingPin.value = false
  }
}

function formatDate(d: string | null | undefined): string {
  if (!d) return '-'
  try {
    return new Date(d).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return d
  }
}
</script>

<template>
  <div class="keamanan-page animate-fade-in px-4 py-4 max-w-xl mx-auto flex flex-col gap-4 pb-24">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <NuxtLink
        to="/akun"
        class="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors"
      >
        <span class="material-symbols-outlined text-xl">arrow_back</span>
      </NuxtLink>
      <div>
        <h1 class="text-xl font-bold text-slate-900 dark:text-slate-100">Keamanan &amp; Kunci Aplikasi</h1>
        <p class="text-xs text-slate-500 dark:text-slate-400">Proteksi Biometrik (WebAuthn), PIN &amp; Brankas Terenkripsi</p>
      </div>
    </div>

    <!-- Toast Notifications -->
    <div v-if="successMessage" class="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fade-in">
      <span class="material-symbols-outlined text-base">check_circle</span>
      <span>{{ successMessage }}</span>
    </div>

    <div v-if="errorMessage" class="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center gap-2 animate-fade-in">
      <span class="material-symbols-outlined text-base">error</span>
      <span>{{ errorMessage }}</span>
    </div>

    <!-- 1. BIOMETRICS HERO CARD -->
    <div class="card bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col gap-4">
      <div class="flex items-start justify-between">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <span class="material-symbols-outlined text-2xl" style="font-variation-settings:'FILL' 1">fingerprint</span>
          </div>
          <div>
            <h2 class="text-sm font-bold text-slate-900 dark:text-slate-100">Autentikasi Biometrik</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              Buka aplikasi dan Brankas menggunakan Sidik Jari, Face ID, atau Windows Hello.
            </p>
          </div>
        </div>
      </div>

      <!-- Support status badge -->
      <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs">
        <span class="text-slate-600 dark:text-slate-300 font-medium">Dukungan Perangkat Ini:</span>
        <span v-if="webAuthn.isPlatformAvailable" class="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
          <span class="material-symbols-outlined text-sm">verified</span>
          Tersedia (Platform Authenticator)
        </span>
        <span v-else class="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
          <span class="material-symbols-outlined text-sm">info</span>
          Belum Didukung Peramban
        </span>
      </div>

      <!-- Register button -->
      <button
        v-if="webAuthn.isPlatformAvailable"
        class="w-full py-3 px-4 rounded-xl bg-primary text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50"
        :disabled="isRegisteringDevice"
        @click="handleRegisterBiometric"
      >
        <span class="material-symbols-outlined text-lg">{{ isRegisteringDevice ? 'progress_activity' : 'add_moderator' }}</span>
        <span>{{ isRegisteringDevice ? 'Memproses Pendaftaran...' : 'Daftarkan Biometrik Perangkat Ini' }}</span>
      </button>
      <div v-else class="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs">
        Perangkat atau peramban ini belum mendukung WebAuthn Platform Authenticator. Anda tetap dapat menggunakan <strong>PIN Keamanan</strong> untuk membuka Brankas.
      </div>
    </div>

    <!-- 2. REGISTERED DEVICES (MULTI-DEVICE) -->
    <div class="card bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Perangkat Biometrik Terdaftar ({{ devices.filter(d => !d.isRevoked).length }})
        </h3>
        <button
          class="text-xs text-primary font-semibold flex items-center gap-1"
          @click="loadSecurityStatus"
          aria-label="Refresh status"
        >
          <span class="material-symbols-outlined text-sm">refresh</span>
          Segarkan
        </button>
      </div>

      <div v-if="devices.length === 0" class="py-6 text-center text-xs text-slate-400">
        Belum ada perangkat biometrik yang didaftarkan.
      </div>

      <div v-else class="flex flex-col gap-2">
        <div
          v-for="d in devices"
          :key="d.id"
          class="p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors"
          :class="d.isRevoked ? 'bg-slate-50 dark:bg-slate-800/30 border-slate-200/50 dark:border-slate-800 opacity-60' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'"
        >
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300">
              <span class="material-symbols-outlined text-lg">devices</span>
            </div>
            <div>
              <p class="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                {{ d.deviceType }}
                <span v-if="d.isRevoked" class="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 font-semibold">
                  Dicabut
                </span>
              </p>
              <p class="text-[11px] text-slate-500 dark:text-slate-400">
                Terdaftar: {{ formatDate(d.createdAt) }} • Digunakan: {{ formatDate(d.lastUsedAt) }}
              </p>
            </div>
          </div>

          <button
            v-if="!d.isRevoked"
            class="px-2.5 py-1.5 rounded-lg text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 text-[11px] font-semibold transition-colors"
            @click="handleRevokeDevice(d)"
          >
            Cabut Akses
          </button>
        </div>
      </div>
    </div>

    <!-- 3. PIN KEAMANAN (FALLBACK) -->
    <div class="card bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <span class="material-symbols-outlined text-xl">pin</span>
          </div>
          <div>
            <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100">PIN Aplikasi &amp; Brankas</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              {{ pinConfigured ? '✓ PIN aktif sebagai proteksi cadangan' : 'PIN belum diatur' }}
            </p>
          </div>
        </div>
        <button
          class="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          @click="openPinModal"
        >
          {{ pinConfigured ? 'Ubah PIN' : 'Atur PIN' }}
        </button>
      </div>
    </div>

    <!-- 4. AUTO-LOCK DURATION -->
    <div class="card bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col gap-3">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
          <span class="material-symbols-outlined text-xl">timer</span>
        </div>
        <div>
          <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100">Kunci Otomatis (Auto-Lock)</h3>
          <p class="text-xs text-slate-500 dark:text-slate-400">
            Kunci Brankas otomatis saat aplikasi tidak aktif atau tab berpindah.
          </p>
        </div>
      </div>

      <div class="grid grid-cols-3 sm:grid-cols-5 gap-2 pt-2">
        <button
          v-for="opt in [
            { label: 'Segera', val: 0 },
            { label: '1 Menit', val: 1 },
            { label: '5 Menit', val: 5 },
            { label: '15 Menit', val: 15 },
            { label: '30 Menit', val: 30 },
          ]"
          :key="opt.val"
          class="py-2 px-1 text-center rounded-xl text-xs font-semibold border transition-all"
          :class="autoLockMinutes === opt.val
            ? 'bg-primary text-white border-primary shadow-sm'
            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'"
          @click="setAutoLockMinutes(opt.val)"
        >
          {{ opt.label }}
        </button>
      </div>
      <p class="text-[11px] text-slate-400 italic">
        * Brankas juga akan otomatis terkunci saat jendela aplikasi diminimize atau tab peramban disembunyikan untuk privasi.
      </p>
    </div>

    <!-- 5. ZERO KNOWLEDGE ARCHITECTURE EXPLANATION -->
    <div class="p-5 sm:p-6 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/50 dark:border-indigo-900/40 text-indigo-900 dark:text-indigo-200 text-xs flex flex-col gap-2">
      <div class="flex items-center gap-2 font-bold text-xs text-indigo-700 dark:text-indigo-300">
        <span class="material-symbols-outlined text-base">verified_user</span>
        <span>Prinsip Keamanan CoupleCash</span>
      </div>
      <p class="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
        1. <strong>Enkripsi Sisi Klien (AES-256-GCM)</strong>: Sandi Brankas dienkripsi di peramban Anda sebelum dikirim ke server.<br/>
        2. <strong>Zero Biometric Storage</strong>: Server tidak pernah menerima atau menyimpan citra atau template sidik jari Anda.<br/>
        3. <strong>PIN Hashing Kuat</strong>: PIN disimpan dengan hash PBKDF2 100.000 putaran bergaram (salted).
      </p>
    </div>

    <!-- PIN SETUP / CHANGE MODAL -->
    <div v-if="showPinModal" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" @click.self="showPinModal = false">
      <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-md border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col gap-4 animate-fade-in relative z-10 m-auto">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-primary text-2xl">lock</span>
            <h3 class="text-base font-bold text-slate-900 dark:text-slate-100">
              {{ pinConfigured ? 'Ubah PIN Keamanan' : 'Atur PIN Keamanan Baru' }}
            </h3>
          </div>
          <button
            class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800"
            @click="showPinModal = false"
          >
            <span class="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        <div v-if="pinModalError" class="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-xs font-semibold">
          {{ pinModalError }}
        </div>

        <div class="flex flex-col gap-3">
          <div v-if="pinConfigured">
            <label class="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">PIN Lama</label>
            <input
              v-model="oldPinInput"
              type="password"
              maxlength="8"
              placeholder="Masukkan PIN lama"
              class="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary text-center tracking-widest"
            />
          </div>

          <div>
            <label class="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">PIN Baru (4-8 Digit)</label>
            <input
              v-model="pinInput"
              type="password"
              maxlength="8"
              placeholder="••••••"
              class="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary text-center tracking-widest font-mono text-base"
            />
          </div>

          <div>
            <label class="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Konfirmasi PIN Baru</label>
            <input
              v-model="pinConfirmInput"
              type="password"
              maxlength="8"
              placeholder="••••••"
              class="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary text-center tracking-widest font-mono text-base"
            />
          </div>
        </div>

        <div class="flex gap-2 pt-2">
          <button
            class="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            @click="showPinModal = false"
          >
            Batal
          </button>
          <button
            class="flex-1 py-3 rounded-xl bg-primary text-white text-xs font-semibold shadow-sm hover:opacity-95 disabled:opacity-50"
            :disabled="isSubmittingPin"
            @click="handleSavePin"
          >
            {{ isSubmittingPin ? 'Menyimpan...' : 'Simpan PIN' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.keamanan-page {
  font-family: 'Plus Jakarta Sans', sans-serif;
}
.card {
  padding: 1.25rem;
}
@media (min-width: 640px) {
  .card {
    padding: 1.5rem;
  }
}
</style>
