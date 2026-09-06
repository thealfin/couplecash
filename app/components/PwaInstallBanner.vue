<script setup lang="ts">
const deferredPrompt = ref<any>(null)
const showModal = ref(false)
const showFloatingBanner = ref(false)
const isIos = ref(false)
const isStandalone = ref(false)

const DISMISS_KEY = 'couplecash_pwa_dismissed_at'

function checkDismissed(): boolean {
  if (typeof window === 'undefined') return false
  const dismissedAt = localStorage.getItem(DISMISS_KEY)
  if (!dismissedAt) return false
  // 24 jam cooldown
  const oneDayMs = 24 * 60 * 60 * 1000
  return (Date.now() - parseInt(dismissedAt, 10)) < oneDayMs
}

onMounted(() => {
  if (typeof window === 'undefined') return

  // 1. Check if running inside installed standalone PWA
  const isStandaloneMode =
    (window.navigator as any).standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches ||
    document.referrer.includes('android-app://')

  isStandalone.value = isStandaloneMode

  if (isStandaloneMode) {
    showModal.value = false
    showFloatingBanner.value = false
    return
  }

  // 2. Detect iOS
  const userAgent = window.navigator.userAgent || ''
  isIos.value = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream

  // 3. Catch deferredPrompt if captured early in pwa.client.ts
  if ((window as any).__deferredPwaPrompt) {
    deferredPrompt.value = (window as any).__deferredPwaPrompt
  }

  // 4. Listen for beforeinstallprompt & custom pwa-prompt-ready
  const handlePrompt = (e: any) => {
    if (e.preventDefault) e.preventDefault()
    const promptEvent = e.detail || e
    deferredPrompt.value = promptEvent
    ;(window as any).__deferredPwaPrompt = promptEvent
  }

  window.addEventListener('beforeinstallprompt', handlePrompt)
  window.addEventListener('pwa-prompt-ready', handlePrompt)

  // 5. Custom event to trigger PWA modal manually (e.g. from Akun / Pengaturan page)
  window.addEventListener('open-pwa-modal', () => {
    showModal.value = true
    showFloatingBanner.value = false
  })

  // 6. Listen for appinstalled event
  window.addEventListener('appinstalled', () => {
    showModal.value = false
    showFloatingBanner.value = false
    deferredPrompt.value = null
    ;(window as any).__deferredPwaPrompt = null
  })

  // 7. Auto display logic on load
  const isDismissed = checkDismissed()
  setTimeout(() => {
    if (!isStandalone.value) {
      if (!isDismissed) {
        showModal.value = true
      } else {
        showFloatingBanner.value = true
      }
    }
  }, 1500)
})

async function installPwa() {
  if (deferredPrompt.value) {
    try {
      deferredPrompt.value.prompt()
      const { outcome } = await deferredPrompt.value.userChoice
      if (outcome === 'accepted') {
        showModal.value = false
        showFloatingBanner.value = false
      }
      deferredPrompt.value = null
      ;(window as any).__deferredPwaPrompt = null
      return
    } catch (err) {
      console.warn('[PWA] Prompt call failed:', err)
    }
  }

  // Fallback if prompt is not available directly
  showModal.value = true
}

function dismissModal() {
  showModal.value = false
  showFloatingBanner.value = true
  if (typeof window !== 'undefined') {
    localStorage.setItem(DISMISS_KEY, Date.now().toString())
  }
}

function dismissFloatingBanner() {
  showFloatingBanner.value = false
  if (typeof window !== 'undefined') {
    localStorage.setItem(DISMISS_KEY, Date.now().toString())
  }
}
</script>

<template>
  <div>
    <!-- Floating Bottom Banner (non-intrusive) -->
    <div
      v-if="showFloatingBanner && !showModal && !isStandalone"
      class="pwa-floating-banner animate-slide-up"
    >
      <div class="banner-content" @click="showModal = true">
        <div class="banner-icon-glow">
          <img src="/pwa-icon.png" alt="CoupleCash PWA Icon" class="banner-app-logo" />
        </div>
        <div class="banner-text">
          <span class="banner-title">Install Aplikasi CoupleCash</span>
          <span class="banner-sub">Akses instan &amp; layar penuh tanpa bar browser</span>
        </div>
      </div>
      <div class="banner-actions">
        <button class="banner-install-btn" @click="installPwa">
          <span class="material-symbols-outlined text-[16px]">download</span>
          Install
        </button>
        <button
          class="banner-close-btn"
          @click="dismissFloatingBanner"
          aria-label="Tutup Banner"
        >
          <span class="material-symbols-outlined text-[16px]">close</span>
        </button>
      </div>
    </div>

    <!-- Modal Dialog Pop-up -->
    <div v-if="showModal && !isStandalone" class="pwa-modal-backdrop animate-fade-in">
      <div class="pwa-modal-backdrop-click" @click="dismissModal"></div>

      <div class="pwa-modal-card animate-zoom-in">
        <!-- Top Close Button -->
        <button class="pwa-close-btn" @click="dismissModal" aria-label="Tutup">
          <span class="material-symbols-outlined text-[20px]">close</span>
        </button>

        <!-- App Header & Glow Icon -->
        <div class="pwa-header-area">
          <div class="pwa-icon-glow-ring">
            <img src="/pwa-icon.png" alt="CoupleCash PWA Icon" class="pwa-app-logo" />
          </div>
          <h3 class="pwa-title">Install Aplikasi CoupleCash</h3>
          <p class="pwa-sub">
            Nikmati pengalaman aplikasi native layar penuh (fullscreen) tanpa bar URL &amp; performa lebih cepat.
          </p>
        </div>

        <!-- Benefits Checklist -->
        <div class="pwa-benefits-list">
          <div class="benefit-item">
            <span class="material-symbols-outlined benefit-icon">fullscreen</span>
            <div>
              <span class="benefit-title">Tampilan Fullscreen Tanpa Bar Browser</span>
              <span class="benefit-desc">Antarmuka bersih, responsif, dan leluasa seperti aplikasi native.</span>
            </div>
          </div>
          <div class="benefit-item">
            <span class="material-symbols-outlined benefit-icon">bolt</span>
            <div>
              <span class="benefit-title">Akses Cepat dari Home Screen</span>
              <span class="benefit-desc">Ikon CoupleCash langsung ada di layar utama smartphone atau desktop Anda.</span>
            </div>
          </div>
          <div class="benefit-item">
            <span class="material-symbols-outlined benefit-icon">offline_bolt</span>
            <div>
              <span class="benefit-title">Mode Offline &amp; Cache Cepat</span>
              <span class="benefit-desc">Buka instan meski tanpa sinyal dan auto-sinkronisasi saat online.</span>
            </div>
          </div>
        </div>

        <!-- Actions for Android / Desktop (1-Click prompt ready) -->
        <div v-if="deferredPrompt" class="pwa-actions-area">
          <button class="pwa-install-primary-btn" @click="installPwa">
            <span class="material-symbols-outlined text-[20px]">download_for_offline</span>
            <span>Install Sekarang (1-Klik)</span>
          </button>
          <button class="pwa-dismiss-btn" @click="dismissModal">
            Nanti Saja
          </button>
        </div>

        <!-- Actions & Guide for iOS Safari -->
        <div v-else-if="isIos" class="pwa-ios-guide-box">
          <p class="ios-guide-header">
            <span class="material-symbols-outlined text-[18px]">apple</span>
            Cara Install di iPhone / iPad (Safari):
          </p>
          <ol class="ios-steps">
            <li>
              Ketuk tombol <b>Bagikan</b>
              <span class="material-symbols-outlined inline-icon text-primary">ios_share</span>
              di bilah bawah Safari.
            </li>
            <li>
              Gulir ke bawah lalu pilih
              <b>"Tambah ke Layar Utama"</b>
              <span class="material-symbols-outlined inline-icon text-primary">add_box</span>.
            </li>
          </ol>
          <button class="pwa-install-primary-btn mt-2" @click="dismissModal">
            Saya Mengerti
          </button>
        </div>

        <!-- Fallback generic install guidance (Android / Chrome menu) -->
        <div v-else class="pwa-actions-area">
          <div class="pwa-menu-guide-box">
            <p class="guide-title">
              <span class="material-symbols-outlined text-[18px] text-primary">info</span>
              Cara Install Manual dari Browser:
            </p>
            <ol class="guide-steps">
              <li>
                Ketuk <b>Menu Browser</b> (titik tiga
                <span class="material-symbols-outlined inline-icon">more_vert</span> di kanan atas).
              </li>
              <li>
                Pilih <b>"Install aplikasi"</b> atau <b>"Tambahkan ke Layar Utama"</b>.
              </li>
            </ol>
          </div>
          <button class="pwa-install-primary-btn mt-1" @click="dismissModal">
            Saya Mengerti
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Floating Bottom Banner ── */
.pwa-floating-banner {
  position: fixed;
  bottom: 80px;
  left: 16px;
  right: 16px;
  max-width: 480px;
  margin: 0 auto;
  z-index: 999;
  background: color-mix(in srgb, var(--surface-container-lowest) 92%, transparent);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid color-mix(in srgb, var(--primary) 30%, var(--outline-variant));
  border-radius: 20px;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
}

.banner-content {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  cursor: pointer;
  min-width: 0;
}

.banner-icon-glow {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  padding: 2px;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(70, 72, 212, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
}

.banner-app-logo {
  width: 100%;
  height: 100%;
  border-radius: 10px;
  object-fit: cover;
}

.banner-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.banner-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--on-surface);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.banner-sub {
  font-size: 11px;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.banner-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.banner-install-btn {
  padding: 8px 14px;
  border-radius: 12px;
  background: var(--primary);
  color: var(--on-primary);
  font-size: 12px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  box-shadow: 0 4px 12px rgba(70, 72, 212, 0.3);
  transition: transform 0.15s;
}
.banner-install-btn:active { transform: scale(0.95); }

.banner-close-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--surface-container);
  color: var(--muted);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

/* ── Modal Backdrop & Card ── */
.pwa-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.pwa-modal-backdrop-click {
  position: absolute;
  inset: 0;
  background: rgba(15, 16, 21, 0.65);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.pwa-modal-card {
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: 400px;
  background: var(--surface-container-lowest);
  border-radius: 28px;
  padding: 24px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  gap: 16px;
  border: 1px solid var(--outline-variant);
}

.pwa-close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--surface-container);
  color: var(--on-surface-variant);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s;
}
.pwa-close-btn:hover { background: var(--surface-container-high); }

.pwa-header-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.pwa-icon-glow-ring {
  width: 76px;
  height: 76px;
  border-radius: 22px;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  padding: 4px;
  box-shadow: 0 8px 24px rgba(70, 72, 212, 0.35);
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pwa-app-logo {
  width: 100%;
  height: 100%;
  border-radius: 18px;
  object-fit: cover;
}

.pwa-title {
  margin: 0 0 4px;
  font-size: 18px;
  font-weight: 800;
  color: var(--on-surface);
}

.pwa-sub {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.4;
}

.pwa-benefits-list {
  background: var(--surface-container-low);
  border-radius: 18px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.benefit-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.benefit-icon {
  font-size: 20px;
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 15%, transparent);
  padding: 6px;
  border-radius: 10px;
  flex-shrink: 0;
}

.benefit-title {
  display: block;
  font-size: 12px;
  font-weight: 700;
  color: var(--on-surface);
}

.benefit-desc {
  display: block;
  font-size: 11px;
  color: var(--muted);
  line-height: 1.3;
}

.pwa-actions-area {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pwa-install-primary-btn {
  width: 100%;
  padding: 14px;
  border-radius: 16px;
  background: linear-gradient(90deg, var(--primary), var(--secondary-container));
  color: var(--on-primary);
  font-size: 14px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 6px 20px rgba(70, 72, 212, 0.35);
  transition: transform 0.15s, opacity 0.15s;
}
.pwa-install-primary-btn:active { transform: scale(0.98); }

.pwa-dismiss-btn {
  background: transparent;
  border: none;
  color: var(--muted);
  font-size: 12px;
  font-weight: 600;
  padding: 6px;
  cursor: pointer;
  text-align: center;
}
.pwa-dismiss-btn:hover { color: var(--on-surface); }

/* iOS & Menu Guide Box */
.pwa-ios-guide-box,
.pwa-menu-guide-box {
  background: color-mix(in srgb, var(--primary) 8%, var(--surface-container-low));
  border: 1px solid color-mix(in srgb, var(--primary) 20%, transparent);
  border-radius: 18px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ios-guide-header,
.guide-title {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  color: var(--on-surface);
  display: flex;
  align-items: center;
  gap: 6px;
}

.ios-steps,
.guide-steps {
  margin: 0;
  padding-left: 20px;
  font-size: 12px;
  color: var(--on-surface-variant);
  display: flex;
  flex-direction: column;
  gap: 6px;
  line-height: 1.4;
}

.inline-icon {
  font-size: 16px;
  vertical-align: middle;
  margin: 0 2px;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes zoomIn {
  from { opacity: 0; transform: scale(0.92); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
.animate-zoom-in { animation: zoomIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
.animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
</style>
