<script setup lang="ts">
defineProps<{
  title?: string
  description?: string
}>()
</script>

<template>
  <div class="p-6 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-slate-50 to-purple-50/70 dark:from-indigo-950/30 dark:via-slate-900 dark:to-purple-950/30 border border-indigo-100/80 dark:border-indigo-900/50 text-center flex flex-col items-center justify-center my-4">
    <div class="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 shadow-inner">
      <span class="material-symbols-outlined text-3xl">auto_awesome</span>
    </div>

    <h4 class="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">
      {{ title || 'Aktifkan Asisten AI' }}
    </h4>

    <p class="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-4 leading-relaxed">
      {{ description || 'Hubungkan Gemini API Key Anda sendiri untuk mulai scan struk otomatis, tanya jawab keuangan, dan analisis cerdas secara gratis.' }}
    </p>

    <NuxtLink
      to="/akun/pengaturan/ai"
      class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition"
    >
      <span class="material-symbols-outlined text-sm">key</span>
      <span>Atur API Key Sekarang</span>
    </NuxtLink>
  </div>
</template>
