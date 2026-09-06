<template>
  <div class="auth-shell">
    <slot />
  </div>
</template>

<style scoped>
.auth-shell {
  min-height: 100dvh;
  background: var(--background);
  display: flex;
  flex-direction: column;
}
</style>
