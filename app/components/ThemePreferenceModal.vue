<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'close'): void
}>()

const { themeMode, isDark, setTheme, toggleTheme } = useTheme()

function handleClose() {
  emit('update:open', false)
  emit('close')
}

const themeOptions = [
  {
    mode: 'light' as const,
    title: 'Mode Terang',
    desc: 'Tampilan cerah, kontras tinggi dan segar untuk penggunaan siang hari.',
    icon: 'light_mode',
    iconColor: 'text-amber-500 bg-amber-100 dark:bg-amber-950/60',
  },
  {
    mode: 'dark' as const,
    title: 'Mode Gelap',
    desc: 'Nyaman di mata saat malam hari, mengurangi silau dan hemat daya layar OLED.',
    icon: 'dark_mode',
    iconColor: 'text-indigo-500 bg-indigo-100 dark:bg-indigo-950/60',
  },
  {
    mode: 'system' as const,
    title: 'Ikuti Sistem Perangkat',
    desc: 'Tema menyesuaikan otomatis dengan setelan gelap/terang sistem operasi Anda.',
    icon: 'settings_brightness',
    iconColor: 'text-sky-500 bg-sky-100 dark:bg-sky-950/60',
  },
]
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 animate-fade-in"
      @click.self="handleClose"
    >
      <div
        class="w-full max-w-lg bg-surface-container-lowest rounded-t-[28px] sm:rounded-3xl shadow-2xl pb-6 flex flex-col max-h-[90vh] overflow-y-auto animate-slide-up border border-outline-variant/20"
      >
        <!-- Grabber & Header -->
        <div class="flex flex-col items-center pt-3 pb-3 px-5 sticky top-0 bg-surface-container-lowest z-10 border-b border-outline-variant/10">
          <div class="w-12 h-1.5 rounded-full bg-surface-container-highest mb-3 sm:hidden"></div>
          <div class="w-full flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-[22px]">palette</span>
              </div>
              <div>
                <h2 class="text-base font-bold text-on-surface">Preferensi Tema</h2>
                <p class="text-xs text-muted">Sesuaikan tampilan visual CoupleCash</p>
              </div>
            </div>
            <button
              aria-label="Tutup preferensi tema"
              class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant active:scale-90 transition-transform cursor-pointer"
              type="button"
              @click="handleClose"
            >
              <span class="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        <!-- Content -->
        <div class="flex flex-col px-5 gap-4 mt-4">
          <!-- Quick Toggle Hero Card -->
          <div class="w-full bg-surface-container-low rounded-2xl p-4 flex items-center justify-between border border-outline-variant/30">
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
                :class="isDark ? 'bg-indigo-950 text-indigo-300' : 'bg-amber-100 text-amber-600'"
              >
                <span class="material-symbols-outlined text-[22px]">
                  {{ isDark ? 'dark_mode' : 'light_mode' }}
                </span>
              </div>
              <div>
                <span class="text-xs font-bold text-on-surface block">
                  {{ isDark ? 'Mode Gelap Aktif' : 'Mode Terang Aktif' }}
                </span>
                <span class="text-[11px] text-muted">
                  {{ themeMode === 'system' ? 'Mengikuti preferensi sistem perangkat' : 'Pilihan kustom manual' }}
                </span>
              </div>
            </div>

            <!-- Animated Toggle Switch with Sun & Moon Icons -->
            <button
              type="button"
              role="switch"
              :aria-checked="isDark"
              @click="toggleTheme"
              class="relative w-16 h-9 rounded-full p-1 transition-colors duration-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40"
              :class="isDark ? 'bg-indigo-600' : 'bg-amber-400'"
              title="Beralih Terang / Gelap"
            >
              <!-- Sliding Thumb -->
              <div
                class="w-7 h-7 rounded-full bg-white shadow-md flex items-center justify-center transition-transform duration-300 ease-out"
                :class="isDark ? 'translate-x-7' : 'translate-x-0'"
              >
                <span
                  class="material-symbols-outlined text-[16px] select-none"
                  :class="isDark ? 'text-indigo-600' : 'text-amber-500'"
                >
                  {{ isDark ? 'dark_mode' : 'light_mode' }}
                </span>
              </div>
            </button>
          </div>

          <!-- Mode Options Selection -->
          <div class="flex flex-col gap-2.5">
            <span class="text-xs font-bold text-on-surface uppercase tracking-wider text-[11px] px-1">
              Pilihan Mode Tampilan
            </span>

            <div class="flex flex-col gap-2">
              <button
                v-for="opt in themeOptions"
                :key="opt.mode"
                type="button"
                class="w-full p-3.5 rounded-2xl border text-left flex items-start gap-3.5 transition-all cursor-pointer"
                :class="themeMode === opt.mode
                  ? 'border-primary bg-primary/5 shadow-xs'
                  : 'border-outline-variant/30 bg-surface-container-lowest hover:bg-surface-container-low'"
                @click="setTheme(opt.mode)"
              >
                <div
                  class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  :class="opt.iconColor"
                >
                  <span class="material-symbols-outlined text-[20px]">{{ opt.icon }}</span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-on-surface">{{ opt.title }}</span>
                    <span
                      v-if="themeMode === opt.mode"
                      class="material-symbols-outlined text-[18px] text-primary shrink-0"
                    >
                      check_circle
                    </span>
                    <span
                      v-else
                      class="material-symbols-outlined text-[18px] text-muted/40 shrink-0"
                    >
                      radio_button_unchecked
                    </span>
                  </div>
                  <p class="text-[11px] text-muted mt-0.5 line-clamp-2 leading-relaxed">
                    {{ opt.desc }}
                  </p>
                </div>
              </button>
            </div>
          </div>

          <!-- Currency Setting Info (Rupiah IDR) -->
          <div class="w-full bg-surface-container-low rounded-2xl p-3.5 flex items-center justify-between border border-outline-variant/20">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-income flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-[20px]">payments</span>
              </div>
              <div>
                <span class="text-xs font-bold text-on-surface block">Mata Uang Format</span>
                <span class="text-[11px] text-muted">Rupiah Indonesia (IDR — Rp)</span>
              </div>
            </div>
            <span class="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/70 text-income border border-emerald-200 dark:border-emerald-800">
              Default
            </span>
          </div>

          <!-- Bottom Action Button -->
          <button
            type="button"
            class="w-full mt-2 py-3 px-4 rounded-2xl bg-primary text-white text-xs font-bold flex items-center justify-center gap-2 active:scale-98 transition shadow-md shadow-primary/20 cursor-pointer"
            @click="handleClose"
          >
            <span class="material-symbols-outlined text-[18px]">check</span>
            <span>Simpan &amp; Terapkan</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
