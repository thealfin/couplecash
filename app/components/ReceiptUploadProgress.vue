<script setup lang="ts">
defineProps<{
  progress: number
  statusText: string
  errorText?: string
}>()
</script>

<template>
  <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 my-3">
    <div class="flex items-center justify-between text-xs font-semibold mb-2">
      <span class="text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
        <span class="material-symbols-outlined text-sm animate-spin text-indigo-600 dark:text-indigo-400" v-if="progress < 100 && !errorText">
          sync
        </span>
        <span>{{ statusText }}</span>
      </span>
      <span class="text-indigo-600 dark:text-indigo-400 font-bold" v-if="!errorText">
        {{ progress }}%
      </span>
    </div>

    <!-- Progress bar -->
    <div v-if="!errorText" class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
      <div
        class="bg-indigo-600 dark:bg-indigo-500 h-2 rounded-full transition-all duration-300 ease-out"
        :style="{ width: `${Math.min(100, Math.max(0, progress))}%` }"
      ></div>
    </div>

    <!-- Error State -->
    <div v-if="errorText" class="mt-2 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1">
      <span class="material-symbols-outlined text-sm">error</span>
      <span>{{ errorText }}</span>
    </div>
  </div>
</template>
