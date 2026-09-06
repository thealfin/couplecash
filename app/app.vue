<script setup lang="ts">
const { initializeAuth } = useAuth()

onMounted(() => {
  initializeAuth()
})
</script>

<template>
  <div>
    <NetworkStatusIndicator />
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <PwaInstallBanner />
  </div>
</template>
