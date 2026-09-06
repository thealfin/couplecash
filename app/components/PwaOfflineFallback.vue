<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    title?: string
    message?: string
    showRetry?: boolean
  }>(),
  {
    title: 'Tidak Ada Koneksi Internet',
    message: 'Halaman atau data ini memerlukan koneksi internet. Silakan periksa jaringan Anda atau coba kembali.',
    showRetry: true
  }
)

const emit = defineEmits<{
  (e: 'retry'): void
}>()

function onRetry() {
  if (navigator.onLine) {
    emit('retry')
  } else {
    window.location.reload()
  }
}
</script>

<template>
  <div class="offline-fallback-card">
    <div class="offline-icon-wrap">
      <span class="material-symbols-outlined text-[36px] text-amber-500">cloud_off</span>
    </div>
    <h3 class="fallback-title">{{ title }}</h3>
    <p class="fallback-desc">{{ message }}</p>

    <div class="fallback-actions" v-if="showRetry">
      <button class="btn-retry" @click="onRetry">
        <span class="material-symbols-outlined text-[18px]">refresh</span>
        Coba Lagi
      </button>
      <NuxtLink to="/beranda" class="btn-home">
        Kembali ke Beranda
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.offline-fallback-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 32px 20px;
  background: var(--surface-container-lowest);
  border: 1px solid var(--outline-variant);
  border-radius: 24px;
  margin: 20px 0;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
}

.offline-icon-wrap {
  width: 64px;
  height: 64px;
  border-radius: 20px;
  background: color-mix(in srgb, var(--warning) 15%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.fallback-title {
  font-size: 18px;
  font-weight: 800;
  color: var(--on-surface);
  margin-bottom: 6px;
}

.fallback-desc {
  font-size: 13px;
  color: var(--muted);
  line-height: 1.5;
  max-width: 320px;
  margin-bottom: 20px;
}

.fallback-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  max-width: 260px;
}

.btn-retry {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: var(--primary);
  color: var(--on-primary);
  font-size: 13px;
  font-weight: 700;
  padding: 12px;
  border-radius: 14px;
  border: none;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(70, 72, 212, 0.25);
  transition: transform 0.15s;
}

.btn-retry:active {
  transform: scale(0.97);
}

.btn-home {
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
  text-decoration: none;
  padding: 8px;
  text-align: center;
}

.btn-home:hover {
  color: var(--on-surface);
}
</style>
