<script setup lang="ts">
definePageMeta({ layout: 'app' })
useHead({ title: 'Akun — CoupleCash' })

const { currentHousehold, currentUser, hasPartner, logout: authLogout } = useAuth()
const { hasKey, loadSettings } = useAiSettings()

const activeTab = ref<'profil' | 'vault'>('profil')
const biometricsEnabled = ref(true)

const userInitial = computed(() => {
  return currentUser.value?.fullName?.charAt(0)?.toUpperCase() || (currentUser.value?.role === 'istri' ? 'I' : 'S')
})

const displayName = computed(() => {
  if (!hasPartner.value) {
    return currentUser.value?.fullName || 'Pengguna'
  }
  return currentHousehold.value?.name || 'Keluarga'
})

const displayRole = computed(() => {
  if (!hasPartner.value) {
    const roleLabel = currentUser.value?.role === 'suami' ? 'Suami' : currentUser.value?.role === 'istri' ? 'Istri' : 'Single'
    return `${currentUser.value?.fullName || 'Pengguna'} (${roleLabel})`
  }
  return `${suamiName.value} (Suami) & ${istriName.value} (Istri)`
})

const badgeText = computed(() => {
  return hasPartner.value ? 'Berpasangan' : 'Single'
})

const householdName = computed(() => currentHousehold.value?.name || 'Keluarga')
const suamiName = computed(() => currentHousehold.value?.suami?.firstName || 'Suami')
const istriName = computed(() => currentHousehold.value?.istri?.firstName || 'Istri')
const suamiInitial = computed(() => currentHousehold.value?.suami?.initial || 'S')
const istriInitial = computed(() => currentHousehold.value?.istri?.initial || 'I')

onMounted(async () => {
  await loadSettings()
})

function openPwaModal() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('open-pwa-modal'))
  }
}

// ── Secure Vault & Biometric Engine ──
const {
  items: vaultItems,
  loading: vaultLoading,
  error: vaultError,
  fetchVaultItems,
  createVaultItem,
  updateVaultItem,
  deleteVaultItem,
} = useVault()
const vaultSecurity = useVaultSecurity()
const webAuthn = useWebAuthn()
const { vaultState, secondsRemaining, revealedSecrets } = vaultSecurity

const toastMessage = ref('')
function showToast(msg: string) {
  toastMessage.value = msg
  setTimeout(() => { toastMessage.value = '' }, 3500)
}

// PIN Unlock State
const showPinModal = ref(false)
const pinInput = ref('')
const pinError = ref('')
const isUnlocking = ref(false)

// Add/Edit/Delete Vault Item State
const showAddModal = ref(false)
const showEditModal = ref(false)
const showDeleteModal = ref(false)
const selectedItem = ref<any>(null)
const formPlatformType = ref<'bank' | 'e_wallet' | 'crypto_wallet' | 'lainnya'>('bank')
const formPlatformName = ref('')
const formUsername = ref('')
const formSecret = ref('')
const formOwnerUserId = ref('')
const formShowSecret = ref(false)
const formSubmitting = ref(false)
const formError = ref('')

onMounted(async () => {
  await loadSettings()
  await webAuthn.checkSupport()
  if (activeTab.value === 'vault' && vaultState.value === 'unlocked') {
    await fetchVaultItems()
  }
})

watch([activeTab, vaultState], async ([tab, state]) => {
  if (tab === 'vault' && state === 'unlocked') {
    await fetchVaultItems()
  }
}, { immediate: true })

async function handleUnlockBiometric() {
  isUnlocking.value = true
  try {
    const ok = await vaultSecurity.unlockWithBiometric()
    if (ok) {
      await fetchVaultItems()
      showToast('Brankas berhasil dibuka dengan biometrik')
    }
  } catch (err: any) {
    const msg = err?.data?.statusMessage || err?.message || 'Biometrik gagal. Silakan gunakan PIN.'
    showToast(msg)
    if (msg.includes('Belum ada perangkat') || msg.includes('tidak terdaftar')) {
      setTimeout(() => {
        openPinUnlock()
      }, 500)
    }
  } finally {
    isUnlocking.value = false
  }
}

function openPinUnlock() {
  pinInput.value = ''
  pinError.value = ''
  showPinModal.value = true
}

async function handleUnlockWithPin() {
  if (!pinInput.value) {
    pinError.value = 'Masukkan PIN terlebih dahulu'
    return
  }
  isUnlocking.value = true
  pinError.value = ''
  try {
    const ok = await vaultSecurity.unlockWithPin(pinInput.value)
    if (ok) {
      showPinModal.value = false
      await fetchVaultItems()
      showToast('Brankas berhasil dibuka')
    }
  } catch (err: any) {
    pinError.value = err?.data?.statusMessage || err?.message || 'PIN salah. Coba lagi.'
  } finally {
    isUnlocking.value = false
  }
}

async function toggleRevealSecret(item: any) {
  if (revealedSecrets.value[item.id]) {
    vaultSecurity.hideSecret(item.id)
  } else {
    try {
      await vaultSecurity.revealSecret(item.id, item.secretEncrypted, item.secretEncryptionIv, 15)
    } catch (err: any) {
      showToast('Gagal mendekripsi: ' + (err?.message || err))
    }
  }
}

async function handleCopySecret(item: any) {
  try {
    const ok = await vaultSecurity.copySecret(item.id, item.secretEncrypted, item.secretEncryptionIv)
    if (ok) {
      showToast('Sandi berhasil disalin ke clipboard!')
    } else {
      showToast('Gagal menyalin sandi')
    }
  } catch (err: any) {
    showToast('Gagal menyalin: ' + (err?.message || err))
  }
}

function openAddModal() {
  formPlatformType.value = 'bank'
  formPlatformName.value = ''
  formUsername.value = ''
  formSecret.value = ''
  formOwnerUserId.value = currentUser.value?.id || ''
  formShowSecret.value = false
  formError.value = ''
  showAddModal.value = true
}

async function handleSaveNewVault() {
  if (!formPlatformName.value.trim()) {
    formError.value = 'Nama platform wajib diisi'
    return
  }
  if (!formSecret.value) {
    formError.value = 'Kata sandi / PIN wajib diisi'
    return
  }
  formSubmitting.value = true
  formError.value = ''
  try {
    await createVaultItem({
      platformType: formPlatformType.value,
      platformName: formPlatformName.value.trim(),
      usernameMasked: formUsername.value.trim() || '-',
      secretPlaintext: formSecret.value,
      ownerUserId: formOwnerUserId.value || currentUser.value?.id,
    })
    showAddModal.value = false
    showToast('Kredensial baru berhasil disimpan!')
  } catch (err: any) {
    formError.value = err?.message || 'Gagal menyimpan kredensial'
  } finally {
    formSubmitting.value = false
  }
}

function openEditModal(item: any) {
  selectedItem.value = item
  formPlatformType.value = item.platformType || 'bank'
  formPlatformName.value = item.platformName || ''
  formUsername.value = item.usernameMasked !== '-' ? item.usernameMasked : ''
  formSecret.value = '' // Leave blank so existing secret is kept unless user types new one
  formOwnerUserId.value = item.ownerUserId || currentUser.value?.id || ''
  formShowSecret.value = false
  formError.value = ''
  showEditModal.value = true
}

async function handleSaveEditVault() {
  if (!selectedItem.value) return
  if (!formPlatformName.value.trim()) {
    formError.value = 'Nama platform wajib diisi'
    return
  }
  formSubmitting.value = true
  formError.value = ''
  try {
    await updateVaultItem(selectedItem.value.id, {
      platformType: formPlatformType.value,
      platformName: formPlatformName.value.trim(),
      usernameMasked: formUsername.value.trim() || '-',
      newSecretPlaintext: formSecret.value || undefined,
      ownerUserId: formOwnerUserId.value || undefined,
    })
    showEditModal.value = false
    showToast('Kredensial berhasil diperbarui!')
  } catch (err: any) {
    formError.value = err?.message || 'Gagal memperbarui kredensial'
  } finally {
    formSubmitting.value = false
  }
}

function confirmDeleteVault(item: any) {
  selectedItem.value = item
  showDeleteModal.value = true
}

async function handleDeleteVault() {
  if (!selectedItem.value) return
  formSubmitting.value = true
  try {
    await deleteVaultItem(selectedItem.value.id)
    showDeleteModal.value = false
    showToast('Kredensial berhasil dihapus dari brankas')
  } catch (err: any) {
    showToast(err?.message || 'Gagal menghapus kredensial')
  } finally {
    formSubmitting.value = false
  }
}

function formatCountdown(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const { resetAllTours } = useWalkthrough()

function handleReplayTour() {
  resetAllTours()
  showToast('Panduan walkthrough diatur ulang! Membuka Beranda...')
  setTimeout(() => {
    navigateTo('/beranda')
  }, 600)
}
</script>

<template>
  <div class="akun-page animate-fade-in px-page">

    <!-- Profile Header Card -->
    <div class="profile-card">
      <div class="profile-avatar-wrap">
        <div class="profile-avatar-bg"></div>
        <div v-if="hasPartner" class="profile-avatars-dual">
          <div class="avatar-dual avatar-dual--suami">{{ suamiInitial }}</div>
          <div class="avatar-dual avatar-dual--istri">{{ istriInitial }}</div>
        </div>
        <div v-else class="profile-avatars-single">
          <div class="avatar-dual" :class="currentUser?.role === 'istri' ? 'avatar-dual--istri' : currentUser?.role === 'suami' ? 'avatar-dual--suami' : 'avatar-dual--single'">
            {{ userInitial }}
          </div>
        </div>
      </div>
      <div class="profile-info">
        <h1 class="profile-name">{{ displayName }}</h1>
        <p class="profile-role">{{ displayRole }}</p>
        <span class="profile-badge" :class="{ 'profile-badge--single': !hasPartner }">{{ badgeText }}</span>
      </div>
    </div>

    <!-- Segmented Tab Toggle -->
    <div class="tab-toggle">
      <button class="tab-btn" :class="{ 'tab-btn--active': activeTab === 'profil' }" @click="activeTab = 'profil'">
        <span class="material-symbols-outlined" style="font-size:18px">person</span>
        Profil
      </button>
      <button class="tab-btn" :class="{ 'tab-btn--active': activeTab === 'vault' }" @click="activeTab = 'vault'">
        <span class="material-symbols-outlined" style="font-size:18px">shield_lock</span>
        Vault
      </button>
    </div>

    <!-- TAB 1: PROFIL & PENGATURAN -->
    <div v-if="activeTab === 'profil'" class="tab-content animate-fade-in">
      <!-- Sync Status -->
      <div class="sync-card">
        <div>
          <p class="sync-title">Status Sinkronisasi</p>
          <SyncStatusBadge />
        </div>
        <button class="sync-btn" id="btn-sync-refresh" aria-label="Refresh Sync">
          <span class="material-symbols-outlined" style="font-size:20px">sync</span>
        </button>
      </div>

      <!-- Wallet Management -->
      <div class="menu-group">
        <h3 class="menu-group-title">Pengaturan Umum</h3>
        <div class="menu-box">
          <NuxtLink to="/akun/kelola-akun" class="menu-item">
            <div class="menu-icon menu-icon--primary">
              <span class="material-symbols-outlined">account_balance_wallet</span>
            </div>
            <div class="menu-text">
              <span class="menu-label">Kelola Akun Finansial</span>
              <span class="menu-sub font-metadata-xs">Pos Akun Terhubung</span>
            </div>
            <span class="material-symbols-outlined menu-arrow">chevron_right</span>
          </NuxtLink>
          <div class="menu-divider"></div>
          <NuxtLink to="/akun/kategori" class="menu-item">
            <div class="menu-icon menu-icon--tertiary">
              <span class="material-symbols-outlined">category</span>
            </div>
            <div class="menu-text">
              <span class="menu-label">Kategori Transaksi</span>
              <span class="menu-sub font-metadata-xs">Kustomisasi Pemasukan &amp; Pengeluaran</span>
            </div>
            <span class="material-symbols-outlined menu-arrow">chevron_right</span>
          </NuxtLink>
          <div class="menu-divider"></div>
          <NuxtLink to="/akun/tagihan" class="menu-item">
            <div class="menu-icon menu-icon--secondary">
              <span class="material-symbols-outlined">receipt_long</span>
            </div>
            <div class="menu-text">
              <span class="menu-label">Kelola Tagihan &amp; Langganan</span>
              <span class="menu-sub font-metadata-xs">Input Tagihan, Pengingat &amp; Jadwal Rutin</span>
            </div>
            <span class="material-symbols-outlined menu-arrow">chevron_right</span>
          </NuxtLink>
          <div class="menu-divider"></div>
          <NuxtLink to="/akun/harta-bersama" class="menu-item">
            <div class="menu-icon" style="background:color-mix(in srgb, var(--primary) 12%, transparent);color:var(--primary)">
              <span class="material-symbols-outlined">balance</span>
            </div>
            <div class="menu-text">
              <span class="menu-label">Harta Bersama</span>
              <span class="menu-sub font-metadata-xs">Kelola pemisahan Pos Akun dan Goals yang dimiliki bersama</span>
            </div>
            <span class="material-symbols-outlined menu-arrow">chevron_right</span>
          </NuxtLink>
        </div>
      </div>

      <!-- Application Settings -->
      <div class="menu-group">
        <h3 class="menu-group-title">Aplikasi &amp; Keamanan</h3>
        <div class="menu-box">
          <NuxtLink to="/akun/pengaturan/ai" class="menu-item">
            <div class="menu-icon menu-icon--primary">
              <span class="material-symbols-outlined text-primary">smart_toy</span>
            </div>
            <div class="menu-text">
              <span class="menu-label">Pengaturan Asisten AI (BYOK)</span>
              <span class="menu-sub font-metadata-xs">
                {{ hasKey ? '✓ Kunci Gemini Aktif & Siap Digunakan' : 'Kunci Belum Diatur (Atur Sekarang)' }}
              </span>
            </div>
            <span class="material-symbols-outlined menu-arrow">chevron_right</span>
          </NuxtLink>
          <NuxtLink to="/akun/pengaturan/keamanan" class="menu-item">
            <div class="menu-icon menu-icon--secondary">
              <span class="material-symbols-outlined">security</span>
            </div>
            <div class="menu-text">
              <span class="menu-label">Keamanan &amp; Kunci Aplikasi</span>
              <span class="menu-sub font-metadata-xs">Biometrik (WebAuthn), PIN &amp; Auto-Lock</span>
            </div>
            <span class="material-symbols-outlined menu-arrow">chevron_right</span>
          </NuxtLink>
          <div class="menu-divider"></div>
          <NuxtLink to="#" class="menu-item">
            <div class="menu-icon">
              <span class="material-symbols-outlined">palette</span>
            </div>
            <div class="menu-text">
              <span class="menu-label">Preferensi Tema</span>
              <span class="menu-sub font-metadata-xs">Terang / Gelap, Mata Uang (IDR)</span>
            </div>
            <span class="material-symbols-outlined menu-arrow">chevron_right</span>
          </NuxtLink>
          <div class="menu-divider"></div>
          <div class="menu-item cursor-pointer" @click="openPwaModal">
            <div class="menu-icon">
              <span class="material-symbols-outlined text-primary">download_for_offline</span>
            </div>
            <div class="menu-text">
              <span class="menu-label">Install Aplikasi CoupleCash</span>
              <span class="menu-sub font-metadata-xs">Tampilan layar penuh (fullscreen) tanpa bar URL</span>
            </div>
            <span class="material-symbols-outlined menu-arrow">chevron_right</span>
          </div>
          <div class="menu-divider"></div>
          <div class="menu-item cursor-pointer" @click="handleReplayTour">
            <div class="menu-icon" style="background:color-mix(in srgb, var(--primary) 12%, transparent);color:var(--primary)">
              <span class="material-symbols-outlined">help_center</span>
            </div>
            <div class="menu-text">
              <span class="menu-label">Panduan Penggunaan (Walkthrough)</span>
              <span class="menu-sub font-metadata-xs">Ulangi animasi panduan Beranda, Analitik, Goals &amp; Pairing</span>
            </div>
            <span class="material-symbols-outlined menu-arrow">chevron_right</span>
          </div>
        </div>
      </div>

      <!-- Logout -->
      <button class="logout-btn" style="border:none" @click="authLogout().then(() => navigateTo('/auth/login'))">
        <span class="material-symbols-outlined" style="font-size:20px">logout</span>
        Keluar dari Perangkat Ini
      </button>
      <p class="app-version">CoupleCash v2.1.0 (Build 492)</p>
    </div>

    <!-- Toast Notification -->
    <div v-if="toastMessage" class="fixed top-5 left-1/2 -translate-x-1/2 z-50 py-2.5 px-4 rounded-2xl bg-slate-900/90 text-white text-xs font-semibold shadow-lg backdrop-blur-md flex items-center gap-2 animate-fade-in pointer-events-none">
      <span class="material-symbols-outlined text-base text-emerald-400">check_circle</span>
      <span>{{ toastMessage }}</span>
    </div>

    <!-- TAB 2: VAULT KEAMANAN -->
    <div v-else-if="activeTab === 'vault'" class="tab-content animate-fade-in">
      
      <!-- ── A. STATE TERKUNCI (LOCKED / EXPIRED) ── -->
      <div v-if="vaultState === 'locked' || vaultState === 'expired'" class="vault-locked-card p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col items-center text-center gap-4 py-8">
        <div class="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center relative">
          <span class="material-symbols-outlined text-3xl" style="font-variation-settings:'FILL' 1">shield_lock</span>
          <span v-if="vaultState === 'expired'" class="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold">
            !
          </span>
        </div>

        <div>
          <h2 class="text-base font-bold text-slate-900 dark:text-slate-100">
            {{ vaultState === 'expired' ? 'Sesi Brankas Telah Berakhir' : 'Brankas Terkunci' }}
          </h2>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
            Informasi sandi &amp; kredensial rahasia keluarga tersimpan dengan enkripsi end-to-end AES-256-GCM.
          </p>
        </div>

        <div class="w-full flex flex-col gap-2.5 mt-2 max-w-xs">
          <!-- Primary Biometric Unlock Button -->
          <button
            v-if="webAuthn.isPlatformAvailable"
            class="w-full py-3.5 px-4 rounded-2xl bg-primary text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50"
            :disabled="isUnlocking"
            @click="handleUnlockBiometric"
          >
            <span class="material-symbols-outlined text-lg">fingerprint</span>
            <span>{{ isUnlocking ? 'Memverifikasi Biometrik...' : 'Buka dengan Biometrik' }}</span>
          </button>

          <!-- Fallback PIN Unlock Button -->
          <button
            class="w-full py-3 px-4 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
            @click="openPinUnlock"
          >
            <span class="material-symbols-outlined text-lg">pin</span>
            <span>Gunakan PIN</span>
          </button>

          <NuxtLink
            to="/akun/pengaturan/keamanan"
            class="text-[11px] text-primary font-medium hover:underline text-center mt-1"
          >
            Atur Biometrik &amp; Kunci Aplikasi
          </NuxtLink>
        </div>
      </div>

      <!-- ── B. STATE TERBUKA (UNLOCKED) ── -->
      <div v-else class="flex flex-col gap-3">
        <!-- Session Status Bar -->
        <div class="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <div>
              <span class="text-xs font-bold text-emerald-900 dark:text-emerald-200">Brankas Terbuka</span>
              <p class="text-[10px] text-emerald-700 dark:text-emerald-300">
                Kunci otomatis dalam: <span class="font-mono font-bold">{{ formatCountdown(secondsRemaining) }}</span>
              </p>
            </div>
          </div>
          <button
            class="px-2.5 py-1 rounded-xl bg-emerald-200/60 dark:bg-emerald-800/60 hover:bg-emerald-300 text-emerald-900 dark:text-emerald-100 text-[11px] font-semibold transition-colors flex items-center gap-1"
            @click="vaultSecurity.lockVault('manual')"
          >
            <span class="material-symbols-outlined text-sm">lock</span>
            Kunci
          </button>
        </div>

        <!-- Empty State -->
        <div v-if="vaultItems.length === 0 && !vaultLoading" class="py-12 px-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center flex flex-col items-center gap-2">
          <div class="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
            <span class="material-symbols-outlined text-2xl">folder_open</span>
          </div>
          <p class="text-xs font-semibold text-slate-600 dark:text-slate-300">Belum ada kredensial yang tersimpan</p>
          <p class="text-[11px] text-slate-400 max-w-xs">Tambahkan sandi mobile banking, PIN e-wallet, atau kredensial rahasia keluarga Anda.</p>
        </div>

        <!-- Vault Items List -->
        <div class="vault-list flex flex-col gap-2.5">
          <div
            v-for="item in vaultItems"
            :key="item.id"
            class="vault-card"
            :class="`vault-card--${item.owner}`"
          >
            <div class="vault-card-header flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <div class="vault-bank-icon" :class="`vault-bank-icon--${item.owner}`">
                  {{ item.bankName }}
                </div>
                <div>
                  <h4 class="vault-item-name text-xs font-bold text-slate-900 dark:text-slate-100">{{ item.platformName }}</h4>
                  <p class="vault-item-user text-[11px] text-slate-500 dark:text-slate-400">{{ item.usernameMasked }}</p>
                </div>
              </div>

              <div class="flex items-center gap-1.5">
                <span class="vault-owner-badge" :class="`vault-owner-badge--${item.owner}`">
                  {{ item.owner === 'suami' ? 'Suami' : item.owner === 'istri' ? 'Istri' : 'Bersama' }}
                </span>
                <button
                  class="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700/60 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-center"
                  title="Edit kredensial"
                  @click="openEditModal(item)"
                >
                  <span class="material-symbols-outlined text-sm">edit</span>
                </button>
                <button
                  class="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-500 hover:text-rose-700 flex items-center justify-center"
                  title="Hapus kredensial"
                  @click="confirmDeleteVault(item)"
                >
                  <span class="material-symbols-outlined text-sm">delete</span>
                </button>
              </div>
            </div>

            <!-- Secret Box with Temporary Reveal and Copy -->
            <div class="vault-secret-box flex items-center justify-between p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800">
              <div class="flex-1 min-w-0 pr-2">
                <span class="vault-secret-label text-[10px] text-slate-400 uppercase tracking-wider block">Kata Sandi / PIN</span>
                <div class="font-mono text-xs font-semibold tracking-wider truncate text-slate-900 dark:text-slate-100">
                  <span v-if="revealedSecrets[item.id]">
                    {{ revealedSecrets[item.id].secret }}
                  </span>
                  <span v-else class="text-slate-400 select-none">
                    ••••••••••••••••
                  </span>
                </div>
              </div>

              <div class="flex items-center gap-1">
                <button
                  class="px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors"
                  :class="revealedSecrets[item.id] ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'"
                  @click="toggleRevealSecret(item)"
                  :title="revealedSecrets[item.id] ? 'Sembunyikan sandi' : 'Tampilkan sandi (15 detik)'"
                >
                  <span class="material-symbols-outlined text-xs">{{ revealedSecrets[item.id] ? 'visibility_off' : 'visibility' }}</span>
                  <span>{{ revealedSecrets[item.id] ? 'Tutup' : 'Lihat' }}</span>
                </button>

                <button
                  class="px-2 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-semibold flex items-center gap-1 transition-colors"
                  @click="handleCopySecret(item)"
                  title="Salin ke clipboard"
                >
                  <span class="material-symbols-outlined text-xs">content_copy</span>
                  <span>Salin</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <button class="add-vault-btn" @click="openAddModal">
          <span class="material-symbols-outlined text-lg">add_circle</span>
          Tambah Kredensial Platform Baru
        </button>
      </div>
    </div>

    <!-- ── MODAL: PIN UNLOCK ── -->
    <div v-if="showPinModal" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" @click.self="showPinModal = false">
      <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-sm border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col gap-4 animate-fade-in relative z-10 m-auto">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-primary text-2xl">pin</span>
            <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100">Buka Brankas dengan PIN</h3>
          </div>
          <button class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500" @click="showPinModal = false">
            <span class="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        <div v-if="pinError" class="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-xs font-semibold">
          {{ pinError }}
        </div>

        <div>
          <label class="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Masukkan 4-8 Digit PIN</label>
          <input
            v-model="pinInput"
            type="password"
            maxlength="8"
            placeholder="••••••"
            autofocus
            class="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-base font-mono text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-primary"
            @keyup.enter="handleUnlockWithPin"
          />
        </div>

        <div class="flex gap-2">
          <button class="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50" @click="showPinModal = false">
            Batal
          </button>
          <button
            class="flex-1 py-3 rounded-xl bg-primary text-white text-xs font-semibold shadow-sm hover:opacity-95 disabled:opacity-50"
            :disabled="isUnlocking"
            @click="handleUnlockWithPin"
          >
            {{ isUnlocking ? 'Membuka...' : 'Buka Brankas' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ── MODAL: TAMBAH KREDENSIAL BRANKAS (CLIENT-SIDE ENCRYPTED) ── -->
    <div v-if="showAddModal" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" @click.self="showAddModal = false">
      <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-md border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col gap-3.5 max-h-[90vh] overflow-y-auto animate-fade-in relative z-10 m-auto">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-primary text-2xl">enhanced_encryption</span>
            <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100">Tambah Kredensial Brankas</h3>
          </div>
          <button class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500" @click="showAddModal = false">
            <span class="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        <div v-if="formError" class="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-xs font-semibold">
          {{ formError }}
        </div>

        <div class="flex flex-col gap-3">
          <div>
            <label class="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Jenis Platform</label>
            <select
              v-model="formPlatformType"
              class="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="bank">Bank (BCA, Mandiri, BRI, BNI, dll)</option>
              <option value="e_wallet">E-Wallet (GoPay, OVO, ShopeePay, Dana)</option>
              <option value="crypto_wallet">Crypto Wallet / Investasi</option>
              <option value="lainnya">Lainnya / Akun Layanan</option>
            </select>
          </div>

          <div>
            <label class="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Nama Platform</label>
            <input
              v-model="formPlatformName"
              type="text"
              placeholder="Contoh: BCA Mobile, GoPay, Tokopedia"
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label class="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Username / No. Rekening / Email</label>
            <input
              v-model="formUsername"
              type="text"
              placeholder="Contoh: a*****@gmail.com atau 1234567890"
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label class="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Kata Sandi / PIN Rahasia</label>
            <div class="relative">
              <input
                v-model="formSecret"
                :type="formShowSecret ? 'text' : 'password'"
                placeholder="Masukkan sandi atau PIN platform"
                class="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                @click="formShowSecret = !formShowSecret"
              >
                <span class="material-symbols-outlined text-lg">{{ formShowSecret ? 'visibility_off' : 'visibility' }}</span>
              </button>
            </div>
            <span class="text-[10px] text-slate-400 mt-1 block">
              * Dienkripsi dengan AES-256-GCM di browser sebelum dikirim ke server.
            </span>
          </div>

          <div>
            <label class="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Pemilik Akun</label>
            <select
              v-model="formOwnerUserId"
              class="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option :value="currentUser?.id">Saya Sendiri ({{ currentUser?.role === 'suami' ? 'Suami' : currentUser?.role === 'istri' ? 'Istri' : 'Pribadi' }})</option>
              <option v-if="currentHousehold?.suami && currentHousehold?.suami.id !== currentUser?.id" :value="currentHousehold?.suami.id">Suami ({{ currentHousehold?.suami.fullName }})</option>
              <option v-if="currentHousehold?.istri && currentHousehold?.istri.id !== currentUser?.id" :value="currentHousehold?.istri.id">Istri ({{ currentHousehold?.istri.fullName }})</option>
            </select>
          </div>
        </div>

        <div class="flex gap-2 pt-2">
          <button class="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50" @click="showAddModal = false">
            Batal
          </button>
          <button
            class="flex-1 py-3 rounded-xl bg-primary text-white text-xs font-semibold shadow-sm hover:opacity-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
            :disabled="formSubmitting"
            @click="handleSaveNewVault"
          >
            <span class="material-symbols-outlined text-base">lock</span>
            <span>{{ formSubmitting ? 'Mengenkripsi...' : 'Simpan Kredensial' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ── MODAL: EDIT KREDENSIAL BRANKAS ── -->
    <div v-if="showEditModal" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" @click.self="showEditModal = false">
      <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-md border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col gap-3.5 max-h-[90vh] overflow-y-auto animate-fade-in relative z-10 m-auto">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-primary text-2xl">edit_note</span>
            <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100">Edit Kredensial Brankas</h3>
          </div>
          <button class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500" @click="showEditModal = false">
            <span class="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        <div v-if="formError" class="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-xs font-semibold">
          {{ formError }}
        </div>

        <div class="flex flex-col gap-3">
          <div>
            <label class="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Nama Platform</label>
            <input
              v-model="formPlatformName"
              type="text"
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label class="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Username / No. Rekening / Email</label>
            <input
              v-model="formUsername"
              type="text"
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label class="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Kata Sandi Baru (Opsional)</label>
            <div class="relative">
              <input
                v-model="formSecret"
                :type="formShowSecret ? 'text' : 'password'"
                placeholder="Biarkan kosong jika tidak ingin mengubah sandi"
                class="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                @click="formShowSecret = !formShowSecret"
              >
                <span class="material-symbols-outlined text-lg">{{ formShowSecret ? 'visibility_off' : 'visibility' }}</span>
              </button>
            </div>
          </div>
        </div>

        <div class="flex gap-2 pt-2">
          <button class="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50" @click="showEditModal = false">
            Batal
          </button>
          <button
            class="flex-1 py-3 rounded-xl bg-primary text-white text-xs font-semibold shadow-sm hover:opacity-95 disabled:opacity-50"
            :disabled="formSubmitting"
            @click="handleSaveEditVault"
          >
            {{ formSubmitting ? 'Memperbarui...' : 'Simpan Perubahan' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ── MODAL: KONFIRMASI HAPUS KREDENSIAL ── -->
    <div v-if="showDeleteModal" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" @click.self="showDeleteModal = false">
      <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-sm border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col gap-4 text-center animate-fade-in relative z-10 m-auto">
        <div class="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
          <span class="material-symbols-outlined text-2xl">delete_forever</span>
        </div>
        <div>
          <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100">Hapus Kredensial Ini?</h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Kredensial untuk <strong>{{ selectedItem?.platformName }}</strong> akan dihapus dari brankas keluarga.
          </p>
        </div>
        <div class="flex gap-2">
          <button class="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50" @click="showDeleteModal = false">
            Batal
          </button>
          <button
            class="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold disabled:opacity-50"
            :disabled="formSubmitting"
            @click="handleDeleteVault"
          >
            {{ formSubmitting ? 'Menghapus...' : 'Ya, Hapus' }}
          </button>
        </div>
      </div>
    </div>


  </div>
</template>

<style scoped>
.akun-page { display:flex; flex-direction:column; gap:16px; padding-top:12px; padding-bottom:24px; }
.px-page { padding-left:16px; padding-right:16px; }

/* Profile Header */
.profile-card { background:var(--surface-container-low); border-radius:20px; padding:16px; display:flex; align-items:center; gap:16px; box-shadow:0 2px 8px rgba(0,0,0,0.04); }
.profile-avatar-wrap { position:relative; width:60px; height:60px; }
.profile-avatars-dual { display:flex; position:relative; z-index:1; }
.avatar-dual { width:38px; height:38px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:700; color:white; border:3px solid var(--surface-container-low); }
.avatar-dual--suami { background:var(--suami); margin-right:-16px; z-index:1; }
.avatar-dual--istri { background:var(--istri); }
.avatar-dual--single { background:var(--primary); }
.profile-info { flex:1; }
.profile-name { margin:0 0 2px; font-size:18px; font-weight:700; color:var(--on-surface); }
.profile-role { margin:0 0 6px; font-size:12px; color:var(--muted); }
.profile-badge { display:inline-block; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; padding:2px 8px; border-radius:12px; background:color-mix(in srgb, var(--primary) 15%, transparent); color:var(--primary); }
.profile-badge--single { background:var(--surface-container-highest); color:var(--on-surface-variant); }

/* Tab Toggle */
.tab-toggle { display:flex; background:var(--surface-container-high); padding:4px; border-radius:14px; }
.tab-btn { flex:1; display:flex; align-items:center; justify-content:center; gap:6px; padding:10px; border-radius:10px; border:none; background:transparent; font-size:13px; font-weight:600; color:var(--on-surface-variant); cursor:pointer; transition:all 0.15s; }
.tab-btn--active { background:var(--surface-container-lowest); color:var(--primary); box-shadow:0 1px 4px rgba(0,0,0,0.08); }

.tab-content { display:flex; flex-direction:column; gap:16px; }

/* Sync Card */
.sync-card { background:var(--surface-container-low); border-radius:16px; padding:14px; display:flex; justify-content:space-between; align-items:center; }
.sync-title { margin:0 0 4px; font-size:12px; color:var(--muted); }
.sync-btn { width:36px; height:36px; border-radius:50%; background:var(--surface-container-highest); border:none; color:var(--on-surface); display:flex; align-items:center; justify-content:center; cursor:pointer; }
.sync-btn:active { transform:rotate(180deg); transition:transform 0.4s ease; }

/* Menu Groups */
.menu-group { display:flex; flex-direction:column; gap:8px; }
.menu-group-title { margin:0; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--primary); padding-left:4px; }
.menu-box { background:var(--surface-container-lowest); border-radius:16px; overflow:hidden; box-shadow:0 1px 4px rgba(0,0,0,0.05); }
.menu-item { display:flex; align-items:center; padding:14px; text-decoration:none; color:inherit; gap:12px; }
.menu-item:active { background:var(--surface-container-low); }
.menu-icon { width:36px; height:36px; border-radius:10px; background:var(--surface-container); color:var(--on-surface-variant); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.menu-icon--primary { color:var(--primary); }
.menu-icon--tertiary { color:var(--tertiary); }
.menu-text { flex:1; display:flex; flex-direction:column; }
.menu-label { font-size:14px; font-weight:500; color:var(--on-surface); }
.menu-sub { font-size:11px; color:var(--muted); }
.menu-arrow { color:var(--muted); }
.menu-divider { height:1px; background:color-mix(in srgb, var(--outline-variant) 40%, transparent); margin-left:62px; }

/* Switch Toggle */
.switch { position:relative; display:inline-block; width:44px; height:24px; }
.switch input { opacity:0; width:0; height:0; }
.slider { position:absolute; cursor:pointer; inset:0; background-color:var(--surface-container-highest); transition:.3s; border-radius:24px; }
.slider:before { position:absolute; content:""; height:18px; width:18px; left:3px; bottom:3px; background-color:white; transition:.3s; border-radius:50%; }
input:checked + .slider { background-color:var(--primary); }
input:checked + .slider:before { transform:translateX(20px); }

/* Logout button */
.logout-btn { display:flex; align-items:center; justify-content:center; gap:8px; padding:14px; border-radius:14px; background:var(--error-container); color:var(--on-error-container); text-decoration:none; font-size:14px; font-weight:600; margin-top:8px; cursor:pointer; }
.logout-btn:active { opacity:0.9; }
.app-version { text-align:center; font-size:11px; color:var(--muted); margin:4px 0 0; }

/* Vault Tab */
.vault-hero { text-align:center; display:flex; flex-direction:column; align-items:center; gap:4px; padding:8px 0; }
.vault-hero-icon { width:56px; height:56px; border-radius:50%; background:var(--primary-fixed); display:flex; align-items:center; justify-content:center; margin-bottom:4px; }
.vault-title { margin:0; font-size:18px; font-weight:700; color:var(--on-surface); }
.vault-sub { margin:0; font-size:12px; color:var(--muted); max-width:280px; }

.vault-list { display:flex; flex-direction:column; gap:10px; }
.vault-card { background:var(--surface-container); border-radius:16px; padding:14px; display:flex; flex-direction:column; gap:10px; position:relative; overflow:hidden; border-left:4px solid var(--primary); }
.vault-card--suami { border-left-color:var(--suami); }
.vault-card--istri { border-left-color:var(--istri); }
.vault-card--bersama { border-left-color:var(--primary); }

.vault-card-header { display:flex; align-items:center; gap:10px; }
.vault-bank-icon { width:36px; height:36px; border-radius:10px; background:white; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:12px; box-shadow:0 1px 4px rgba(0,0,0,0.08); flex-shrink:0; }
.vault-bank-icon--suami { color:var(--suami); }
.vault-bank-icon--istri { color:var(--istri); }
.vault-bank-icon--bersama { color:var(--primary); }

.vault-item-name { margin:0; font-size:13px; font-weight:600; color:var(--on-surface); }
.vault-item-user { margin:0; font-size:11px; color:var(--muted); }
.vault-owner-badge { margin-left:auto; font-size:9px; font-weight:700; text-transform:uppercase; padding:3px 8px; border-radius:10px; }
.vault-owner-badge--suami { background:color-mix(in srgb, var(--suami) 15%, transparent); color:var(--suami); }
.vault-owner-badge--istri { background:color-mix(in srgb, var(--istri) 15%, transparent); color:var(--istri); }
.vault-owner-badge--bersama { background:color-mix(in srgb, var(--primary) 15%, transparent); color:var(--primary); }

.vault-secret-box { background:var(--surface-container-high); border-radius:10px; padding:10px 12px; display:flex; justify-content:space-between; align-items:center; }
.vault-secret-label { font-size:10px; color:var(--muted); text-transform:uppercase; letter-spacing:0.05em; display:block; margin-bottom:2px; }
.vault-secret-val { font-size:14px; font-weight:600; color:var(--on-surface); letter-spacing:0.15em; }
.vault-secret-val--blur { filter:blur(4px); user-select:none; }
.vault-eye-btn { width:32px; height:32px; border-radius:50%; background:var(--surface-container-highest); border:none; color:var(--on-surface-variant); display:flex; align-items:center; justify-content:center; cursor:pointer; }

.add-vault-btn { width:100%; padding:14px; border-radius:14px; background:var(--surface-container-high); color:var(--primary); font-size:13px; font-weight:600; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; }

/* ── AI TAB ── */
.ai-hero-banner {
  position: relative;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%);
  border-radius: 20px;
  padding: 20px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(15, 52, 96, 0.45);
}

.ai-hero-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(50px);
  pointer-events: none;
}
.ai-hero-glow:first-child { width: 180px; height: 180px; background: rgba(99, 102, 241, 0.4); top: -40px; right: -40px; }
.ai-hero-glow--2 { width: 120px; height: 120px; background: rgba(16, 185, 129, 0.2); bottom: -20px; left: 20px; }

.ai-hero-content {
  display: flex;
  align-items: center;
  gap: 14px;
  position: relative;
  z-index: 1;
  margin-bottom: 14px;
}

.ai-hero-icon-wrap {
  width: 52px; height: 52px;
  border-radius: 50%;
  background: rgba(99, 102, 241, 0.25);
  border: 1.5px solid rgba(99, 102, 241, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 0 20px rgba(99, 102, 241, 0.4);
}
.ai-hero-icon {
  font-size: 28px;
  color: #818cf8;
  font-variation-settings: 'FILL' 1;
}
.ai-hero-title {
  margin: 0 0 3px;
  font-size: 17px;
  font-weight: 700;
  color: white;
  letter-spacing: -0.01em;
}
.ai-hero-sub {
  margin: 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.ai-feature-chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  position: relative;
  z-index: 1;
}
.ai-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 12px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.85);
  font-size: 11px;
  font-weight: 600;
  backdrop-filter: blur(8px);
}

/* Status Card */
.ai-status-card {
  border-radius: 16px;
  padding: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1.5px solid transparent;
  transition: all 0.2s;
}
.ai-status-card--active {
  background: color-mix(in srgb, var(--income) 8%, var(--surface-container-lowest));
  border-color: color-mix(in srgb, var(--income) 30%, transparent);
}
.ai-status-card--inactive {
  background: var(--surface-container-low);
  border-color: var(--outline-variant);
}

.ai-status-left { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }

.ai-status-dot {
  width: 10px; height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.ai-status-dot--active {
  background: var(--income);
  box-shadow: 0 0 8px var(--income);
  animation: pulse-dot 2s ease-in-out infinite;
}
.ai-status-dot--inactive {
  background: var(--muted);
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; box-shadow: 0 0 8px var(--income); }
  50% { opacity: 0.6; box-shadow: 0 0 14px var(--income); }
}

.ai-status-label {
  margin: 0 0 2px;
  font-size: 13px;
  font-weight: 600;
  color: var(--on-surface);
}
.ai-status-key-preview {
  margin: 0;
  font-size: 11px;
  color: var(--muted);
  font-family: monospace;
  letter-spacing: 0.04em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ai-status-desc {
  margin: 0;
  font-size: 11px;
  color: var(--muted);
}

/* Info Card */
.ai-info-card {
  background: color-mix(in srgb, var(--primary) 6%, var(--surface-container-lowest));
  border-radius: 14px;
  padding: 14px;
  display: flex;
  gap: 12px;
  align-items: flex-start;
  border: 1px solid color-mix(in srgb, var(--primary) 20%, transparent);
}
.ai-info-icon {
  width: 32px; height: 32px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--primary) 15%, transparent);
  color: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.ai-info-text { flex: 1; }
.ai-info-title { margin: 0 0 4px; font-size: 13px; font-weight: 700; color: var(--on-surface); }
.ai-info-desc { margin: 0; font-size: 12px; color: var(--on-surface-variant); line-height: 1.5; }

/* Key Form Card */
.ai-key-form-card {
  background: var(--surface-container-lowest);
  border-radius: 20px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  border: 1px solid var(--outline-variant);
}
.ai-key-form-header {
  display: flex;
  align-items: center;
  gap: 10px;
}
.ai-key-form-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--on-surface);
}
.ai-key-form-hint {
  margin: 0;
  font-size: 12px;
  color: var(--on-surface-variant);
}
.ai-key-link {
  color: var(--primary);
  text-decoration: none;
  font-weight: 600;
}
.ai-key-link:hover { text-decoration: underline; }

.ai-key-input-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--surface-container-low);
  border-radius: 14px;
  padding: 12px 14px;
  border: 1.5px solid transparent;
  transition: border-color 0.15s;
}
.ai-key-input-wrap:focus-within { border-color: var(--primary); }
.ai-key-input-wrap--error { border-color: var(--error) !important; }

.ai-key-input-icon { color: var(--muted); font-size: 20px; flex-shrink: 0; }

.ai-key-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 14px;
  color: var(--on-surface);
  outline: none;
  font-family: monospace;
  letter-spacing: 0.04em;
}
.ai-key-input::placeholder { font-family: inherit; letter-spacing: 0; color: var(--muted); }

.ai-key-eye-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--muted);
  display: flex;
  align-items: center;
  padding: 2px;
  flex-shrink: 0;
}
.ai-key-eye-btn:hover { color: var(--on-surface); }

.ai-key-error {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--error);
  font-size: 12px;
  font-weight: 500;
  padding: 8px 12px;
  background: color-mix(in srgb, var(--error) 10%, transparent);
  border-radius: 10px;
}

.ai-key-save-btn {
  width: 100%;
  padding: 14px;
  border-radius: 14px;
  background: linear-gradient(90deg, #6366f1, #8b5cf6);
  color: white;
  font-size: 14px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);
  transition: transform 0.15s, opacity 0.15s;
}
.ai-key-save-btn:not(:disabled):active { transform: scale(0.98); }
.ai-key-save-btn:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }

.ai-key-remove-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 11px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--error) 10%, transparent);
  color: var(--error);
  font-size: 13px;
  font-weight: 600;
  border: 1px solid color-mix(in srgb, var(--error) 25%, transparent);
  cursor: pointer;
  transition: all 0.15s;
}
.ai-key-remove-btn:hover { background: color-mix(in srgb, var(--error) 15%, transparent); }
.ai-key-remove-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Security card */
.ai-security-card {
  background: var(--surface-container-low);
  border-radius: 16px;
  padding: 16px;
}
.ai-security-title {
  margin: 0 0 12px;
  font-size: 13px;
  font-weight: 700;
  color: var(--on-surface);
  display: flex;
  align-items: center;
  gap: 6px;
}
.ai-security-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ai-security-list li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  color: var(--on-surface-variant);
  line-height: 1.4;
}
.ai-security-check {
  font-size: 16px !important;
  color: var(--income);
  flex-shrink: 0;
  font-variation-settings: 'FILL' 1;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.animate-spin { animation: spin 1s linear infinite; display: inline-block; }
</style>
