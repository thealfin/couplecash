<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const status = ref<'synced' | 'syncing' | 'offline'>('synced')

function updateOnlineStatus() {
  if (typeof window !== 'undefined' && !navigator.onLine) {
    status.value = 'offline'
  } else {
    status.value = 'synced'
  }
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)
    updateOnlineStatus()
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('online', updateOnlineStatus)
    window.removeEventListener('offline', updateOnlineStatus)
  }
})
</script>

<template>
  <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition">
    <template v-if="status === 'synced'">
      <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
      <span class="text-slate-600 dark:text-slate-300">Tersinkronisasi</span>
    </template>
    <template v-else-if="status === 'syncing'">
      <span class="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
      <span class="text-amber-600 dark:text-amber-400">Menyinkronkan...</span>
    </template>
    <template v-else>
      <span class="w-2 h-2 rounded-full bg-slate-400"></span>
      <span class="text-slate-400">Offline</span>
    </template>
  </div>
</template>
