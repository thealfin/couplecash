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
    const roleLabel = currentUser.value?.role === 'suami' ? 'Suami' : 'Istri'
    return `${currentUser.value?.fullName || 'Pengguna'} (${roleLabel})`
  }
  return `${suamiName.value} (Suami) & ${istriName.value} (Istri)`
})

const badgeText = computed(() => {
  return hasPartner.value ? 'Household' : 'Single'
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

// ── Vault Data ──
interface VaultItem {
  id: string
  bankName: string
  name: string
  user: string
  owner: string
  secret: string
}

const { getAuthToken } = useAuth()
const vaultToken = import.meta.client ? await getAuthToken() : null
const { data } = await useFetch('/api/vault', {
  headers: vaultToken ? { Authorization: `Bearer ${vaultToken}` } : {}
})

const vaultItems = ref<VaultItem[]>(
  ((data.value as any)?.items ?? []).map((i: VaultItem) => ({
    ...i,
    masked: true,
    value: '•'.repeat(Math.min(i.secret.length, 16)),
  }))
)

function toggleVaultMask(item: any) {
  item.masked = !item.masked
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
          <div class="avatar-dual" :class="currentUser?.role === 'istri' ? 'avatar-dual--istri' : 'avatar-dual--suami'">
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
        <h3 class="menu-group-title">Pos Akun Finansial</h3>
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
          <div class="menu-divider"></div>
          <div class="menu-item">
            <div class="menu-icon">
              <span class="material-symbols-outlined">fingerprint</span>
            </div>
            <div class="menu-text">
              <span class="menu-label">Biometrik (Face ID / Sidik Jari)</span>
              <span class="menu-sub font-metadata-xs">Proteksi saat membuka aplikasi</span>
            </div>
            <label class="switch">
              <input type="checkbox" v-model="biometricsEnabled" />
              <span class="slider"></span>
            </label>
          </div>
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
        </div>
      </div>

      <!-- Logout -->
      <button class="logout-btn" style="border:none" @click="authLogout().then(() => navigateTo('/auth/login'))">
        <span class="material-symbols-outlined" style="font-size:20px">logout</span>
        Keluar dari Perangkat Ini
      </button>
      <p class="app-version">CoupleCash v2.1.0 (Build 492)</p>
    </div>

    <!-- TAB 2: VAULT KEAMANAN -->
    <div v-else-if="activeTab === 'vault'" class="tab-content animate-fade-in">
      <div class="vault-hero">
        <div class="vault-hero-icon">
          <span class="material-symbols-outlined" style="font-size:32px;color:var(--primary);font-variation-settings:'FILL' 1">shield_lock</span>
        </div>
        <h2 class="vault-title">Vault Terenkripsi</h2>
        <p class="vault-sub">Sandi platform &amp; PIN dompet tersimpan terenkripsi AES-256 at-rest.</p>
      </div>

      <div class="vault-list">
        <div v-for="item in vaultItems" :key="item.id" class="vault-card" :class="`vault-card--${item.owner}`">
          <div class="vault-card-header">
            <div class="vault-bank-icon" :class="`vault-bank-icon--${item.owner}`">
              {{ item.bankName }}
            </div>
            <div>
              <h4 class="vault-item-name">{{ item.name }}</h4>
              <p class="vault-item-user">User: {{ item.user }}</p>
            </div>
            <span class="vault-owner-badge" :class="`vault-owner-badge--${item.owner}`">
              {{ item.owner === 'suami' ? 'Suami' : item.owner === 'istri' ? 'Istri' : 'Bersama' }}
            </span>
          </div>

          <div class="vault-secret-box">
            <div>
              <span class="vault-secret-label">Kata Sandi / PIN</span>
              <div class="vault-secret-val tabular-nums" :class="{ 'vault-secret-val--blur': item.masked }">
                {{ item.masked ? item.value : item.secret }}
              </div>
            </div>
            <button class="vault-eye-btn" @click="toggleVaultMask(item)" :aria-label="item.masked ? 'Lihat sandi' : 'Sembunyikan sandi'">
              <span class="material-symbols-outlined" style="font-size:18px">
                {{ item.masked ? 'visibility' : 'visibility_off' }}
              </span>
            </button>
          </div>
        </div>
      </div>

      <button class="add-vault-btn">
        <span class="material-symbols-outlined" style="font-size:20px">add</span>
        Tambah Kredensial Platform Baru
      </button>
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
