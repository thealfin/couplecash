<script setup lang="ts">
const { isOnline, showBackOnlineToast } = useNetwork()

function retrySync() {
  if (typeof window !== 'undefined') {
    if (navigator.onLine) {
      window.location.reload()
    }
  }
}
</script>

<template>
  <div class="network-status-root">
    <!-- Offline Banner -->
    <transition name="slide-down">
      <div v-if="!isOnline" class="offline-banner" role="alert">
        <div class="offline-content">
          <div class="offline-indicator-dot"></div>
          <span class="material-symbols-outlined text-[18px]">wifi_off</span>
          <span class="offline-text">Anda sedang offline — Menggunakan data lokal perangkat</span>
        </div>
        <button class="offline-retry-btn" @click="retrySync">
          <span class="material-symbols-outlined text-[14px]">refresh</span>
          Cek
        </button>
      </div>
    </transition>

    <!-- Back Online Toast Notification -->
    <transition name="toast-slide">
      <div v-if="showBackOnlineToast && isOnline" class="online-toast" role="status">
        <span class="material-symbols-outlined text-[18px]">cloud_done</span>
        <span>Koneksi internet terhubung kembali!</span>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.network-status-root {
  position: relative;
  z-index: 9999;
}

/* Offline Top Banner */
.offline-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: linear-gradient(90deg, #991b1b, #dc2626);
  color: #ffffff;
  padding: 8px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 12px;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.35);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.offline-content {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.offline-indicator-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #fca5a5;
  animation: pulseDot 1.5s infinite;
  flex-shrink: 0;
}

.offline-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.offline-retry-btn {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.4);
  color: #ffffff;
  border-radius: 8px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  transition: background 0.15s;
}

.offline-retry-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Back Online Toast */
.online-toast {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  background: #059669;
  color: #ffffff;
  padding: 10px 20px;
  border-radius: 30px;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 10px 25px rgba(5, 150, 105, 0.4);
  z-index: 10000;
  pointer-events: none;
}

/* Animations */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s;
}

.slide-down-enter-from,
.slide-down-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}

.toast-slide-enter-active,
.toast-slide-leave-active {
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s;
}

.toast-slide-enter-from,
.toast-slide-leave-to {
  transform: translate(-50%, -20px);
  opacity: 0;
}

@keyframes pulseDot {
  0% { transform: scale(0.9); opacity: 0.7; }
  50% { transform: scale(1.3); opacity: 1; }
  100% { transform: scale(0.9); opacity: 0.7; }
}
</style>
