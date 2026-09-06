<script setup lang="ts">
definePageMeta({
  middleware: [
    function () {
      return navigateTo('/akun/tagihan', { replace: true })
    }
  ]
})
</script>

<template>
  <div class="p-4 text-center text-sm text-muted">Mengalihkan ke halaman tagihan...</div>
</template>
