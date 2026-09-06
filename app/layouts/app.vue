<script setup lang="ts">
const { currentUser, hasPartner, openSyncModal, openHouseholdDetail } = useAuth()

const userInitial = computed(() => currentUser.value?.avatarInitial || 'B')
const userRole = computed(() => currentUser.value?.role || 'suami')

const route = useRoute()
const hideBottomNav = useState('hideBottomNav', () => false)

const showBottomNav = computed(() => {
  if (hideBottomNav.value) return false
  const fullScreenPrefixes = [
    '/budget',
    '/anggaran',
    '/input/transaksi',
    '/input/kamera',
    '/input/review',
    '/akun/kelola-akun',
    '/akun/kategori',
    '/akun/tagihan'
  ]
  return !fullScreenPrefixes.some((p) => route.path.startsWith(p))
})
</script>

<template>
  <div class="app-shell">
    <!-- Fixed Header -->
    <header class="app-header">
      <div class="header-inner">
        <div class="header-logo cursor-pointer" @click="navigateTo('/beranda')">
          <img
            src="/pwa-icon.svg"
            alt="CoupleCash Logo"
            class="logo-image"
            width="32"
            height="32"
            @error="($event.target as HTMLImageElement).src = '/pwa-icon.png'"
          />
          <span class="logo-text">CoupleCash</span>
        </div>
        <div
          class="header-avatars cursor-pointer"
          @click="hasPartner ? openHouseholdDetail() : openSyncModal()"
          :title="hasPartner ? 'Detail Keluarga' : 'Singkronkan Pasangan'"
        >
          <!-- User avatar -->
          <div :class="userRole === 'suami' ? 'avatar-suami' : 'avatar-istri'">
            {{ userInitial }}
          </div>

          <!-- Partner avatar or + sync button -->
          <div v-if="hasPartner" :class="userRole === 'suami' ? 'avatar-istri' : 'avatar-suami'">
            {{ userRole === 'suami' ? 'S' : 'B' }}
          </div>
          <button
            v-else
            class="avatar-add-partner"
            @click.stop="openSyncModal"
            title="Singkronkan pasangan"
            aria-label="Singkronkan pasangan"
          >
            <span class="material-symbols-outlined text-[16px]">add</span>
          </button>
        </div>
      </div>
    </header>

    <!-- Couple Synchronization Modal (When Single) -->
    <CoupleSyncModal />

    <!-- Connected Household Modals -->
    <HouseholdDetailModal />
    <HouseholdEditModal />
    <HouseholdUnlinkModal />

    <!-- Main Content -->
    <main class="app-main" :class="{ 'app-main--no-nav': !showBottomNav }">
      <slot />
    </main>

    <!-- Embedded Concave Bottom Navigation with Action Center -->
    <TabbarBottomNavigation v-if="showBottomNav" />
  </div>
</template>

<style scoped>
/* ── App Shell ── */
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  background: var(--background);
  position: relative;
}

/* ── Header ── */
.app-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  background: color-mix(in srgb, var(--surface) 85%, transparent);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid color-mix(in srgb, var(--outline-variant) 40%, transparent);
  padding-top: env(safe-area-inset-top, 0);
}

.header-inner {
  height: 64px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 520px;
  margin: 0 auto;
  width: 100%;
}

.header-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.logo-image {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  object-fit: cover;
  display: block;
  box-shadow: 0 2px 8px rgba(70, 72, 212, 0.22);
  transition: transform 0.15s ease;
}

.header-logo:active .logo-image {
  transform: scale(0.95);
}

.logo-text {
  font-size: 18px;
  font-weight: 700;
  color: var(--primary);
  letter-spacing: -0.02em;
}

.header-avatars {
  display: flex;
  align-items: center;
}

.avatar-suami, .avatar-istri, .avatar-add-partner {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: white;
  border: 2px solid var(--surface);
}

.avatar-suami {
  background: var(--suami);
  margin-right: -8px;
  z-index: 1;
}

.avatar-istri {
  background: var(--istri);
  z-index: 2;
}

.avatar-add-partner {
  background: var(--surface-container);
  color: var(--primary);
  border: 2px stroke var(--primary);
  cursor: pointer;
  z-index: 2;
  transition: transform 0.15s, background 0.15s;
}
.avatar-add-partner:hover {
  background: color-mix(in srgb, var(--primary) 15%, transparent);
}
.avatar-add-partner:active {
  transform: scale(0.92);
}

/* ── Main ── */
.app-main {
  flex: 1;
  padding-top: 64px;
  padding-bottom: 96px;
  min-height: 100dvh;
}

.app-main--no-nav {
  padding-bottom: 24px;
}
</style>
