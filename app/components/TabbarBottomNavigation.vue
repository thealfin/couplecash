<script setup lang="ts">
const props = withDefaults(defineProps<{
  activeTab?: string
  disabled?: boolean
}>(), {
  activeTab: '',
  disabled: false,
})

const route = useRoute()
const router = useRouter()

const currentActive = computed(() => props.activeTab || route.path)

const isActionMenuOpen = ref(false)

function toggleActionMenu() {
  if (props.disabled) return
  isActionMenuOpen.value = !isActionMenuOpen.value
}

function closeActionMenu() {
  isActionMenuOpen.value = false
}

function navigateToAction(path: string) {
  if (props.disabled) return
  closeActionMenu()
  router.push(path)
}

// Watch route changes to automatically close action center
watch(() => route.path, () => {
  closeActionMenu()
})
</script>

<template>
  <div class="fixed inset-x-0 bottom-0 z-50 pointer-events-none pb-safe">
    <!-- Action Menu Backdrop & Radial Items -->
    <div
      class="fixed inset-0 z-40 transition-all duration-300 pointer-events-auto"
      :class="isActionMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'"
      @click="closeActionMenu"
    >
      <!-- Blur backdrop -->
      <div class="absolute inset-0 bg-black/40 backdrop-blur-[3px]"></div>

      <!-- Floating Radial Actions Container -->
      <div class="relative w-full max-w-md mx-auto h-full flex justify-center items-end pb-[92px] pointer-events-none">
        <div
          class="relative w-full flex justify-center items-center transition-all duration-300"
          :class="isActionMenuOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-90 opacity-0 translate-y-6'"
        >
          <!-- 1. Catat Manual -->
          <button
            type="button"
            class="absolute -translate-x-[82px] -translate-y-[44px] flex flex-col items-center gap-1.5 cursor-pointer active:scale-95 transition-transform pointer-events-auto focus:outline-none"
            @click.stop="navigateToAction('/input/transaksi')"
          >
            <div class="w-[52px] h-[52px] rounded-full bg-white dark:bg-[#1e2029] shadow-2xl flex items-center justify-center text-primary dark:text-[#a5b4fc] border border-surface-container-high dark:border-[#2e313d] hover:scale-105 transition-all">
              <span class="material-symbols-outlined text-[24px]">edit_note</span>
            </div>
            <span class="text-[11px] font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-wide">Catat Manual</span>
          </button>

          <!-- 2. Kamera AI -->
          <button
            type="button"
            class="absolute -translate-y-[98px] flex flex-col items-center gap-1.5 cursor-pointer active:scale-95 transition-transform pointer-events-auto focus:outline-none"
            @click.stop="navigateToAction('/input/kamera')"
          >
            <div class="relative w-[54px] h-[54px] rounded-full bg-white dark:bg-[#1e2029] shadow-2xl flex items-center justify-center text-primary dark:text-[#a5b4fc] border border-surface-container-high dark:border-[#2e313d] hover:scale-105 transition-all">
              <span class="material-symbols-outlined text-[26px]">camera</span>
              <span class="material-symbols-outlined text-[13px] absolute top-2 right-2 text-secondary animate-pulse" style="font-variation-settings: 'FILL' 1;">auto_awesome</span>
            </div>
            <span class="text-[11px] font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-wide">Kamera AI</span>
          </button>

          <!-- 3. Budget -->
          <button
            type="button"
            class="absolute translate-x-[82px] -translate-y-[44px] flex flex-col items-center gap-1.5 cursor-pointer active:scale-95 transition-transform pointer-events-auto focus:outline-none"
            @click.stop="navigateToAction('/budget')"
          >
            <div class="w-[52px] h-[52px] rounded-full bg-white dark:bg-[#1e2029] shadow-2xl flex items-center justify-center text-primary dark:text-[#a5b4fc] border border-surface-container-high dark:border-[#2e313d] hover:scale-105 transition-all">
              <span class="material-symbols-outlined text-[24px]">savings</span>
            </div>
            <span class="text-[11px] font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-wide">Budget</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Concave SVG Navbar -->
    <nav
      class="relative w-full pointer-events-auto select-none z-50 transition-opacity duration-200"
      :class="{ 'opacity-50 pointer-events-none': disabled }"
    >
      <!-- Background Concave SVG Shape -->
      <div class="absolute inset-x-0 bottom-0 top-0 overflow-hidden pointer-events-none drop-shadow-[0_-6px_20px_rgba(0,0,0,0.07)] dark:drop-shadow-[0_-6px_20px_rgba(0,0,0,0.5)]">
        <svg class="w-full h-full" fill="none" preserveAspectRatio="none" viewBox="0 0 390 86">
          <path
            d="M0 16C0 16 70 16 136 16C147 16 153 17 159 23C168 32 173 57 195 57C217 57 222 32 231 23C237 17 243 16 254 16C320 16 390 16 390 16V86H0V16Z"
            class="fill-white dark:fill-[#15171e] transition-colors"
          />
        </svg>
      </div>

      <!-- Navigation Content Grid -->
      <div class="relative w-full max-w-md mx-auto flex items-end justify-between px-3 h-[78px] pb-3">
        <!-- 1. Beranda -->
        <NuxtLink
          to="/beranda"
          class="flex flex-col items-center justify-center gap-1 w-14 transition-all duration-150 active:scale-90"
          :class="currentActive === '/beranda' ? 'text-primary' : 'text-muted hover:text-on-surface'"
        >
          <span class="material-symbols-outlined text-[32px]" :style="currentActive === '/beranda' ? 'font-variation-settings: \'FILL\' 1;' : ''">dashboard</span>
          <span class="text-[11px] tracking-tight" :class="currentActive === '/beranda' ? 'font-bold' : 'font-medium'"></span>
        </NuxtLink>

        <!-- 2. Analitik -->
        <NuxtLink
          to="/analitik"
          class="flex flex-col items-center justify-center gap-1 w-14 transition-all duration-150 active:scale-90"
          :class="currentActive === '/analitik' ? 'text-primary' : 'text-muted hover:text-on-surface'"
        >
          <span class="material-symbols-outlined text-[32px]" :style="currentActive === '/analitik' ? 'font-variation-settings: \'FILL\' 1;' : ''">bar_chart</span>
          <span class="text-[11px] tracking-tight" :class="currentActive === '/analitik' ? 'font-bold' : 'font-medium'"></span>
        </NuxtLink>

        <!-- Center: Elevated Circular Action Center Button (+) -->
        <div class="relative -top-4 flex justify-center items-center w-[78px]">
          <button
            type="button"
            class="w-[72px] h-[72px] rounded-full bg-gradient-to-br from-[#6366f1] via-[#4f46e5] to-[#4338ca] shadow-[0_8px_24px_rgba(79,70,229,0.45)] flex items-center justify-center text-white active:scale-95 transition-all duration-300 ring-4 ring-white dark:ring-[#15171e] focus:outline-none"
            id="fab-action-btn"
            :disabled="disabled"
            @click="toggleActionMenu"
            aria-label="Action Center"
          >
            <span
              class="material-symbols-outlined text-[28px] leading-none transition-transform duration-300 select-none"
              :class="{ 'rotate-45': isActionMenuOpen }"
            >
              add_2
            </span>
          </button>
        </div>

        <!-- 4. Goals -->
        <NuxtLink
          to="/goals"
          class="flex flex-col items-center justify-center gap-1 w-14 transition-all duration-150 active:scale-90"
          :class="currentActive === '/goals' ? 'text-primary' : 'text-muted hover:text-on-surface'"
        >
          <span class="material-symbols-outlined text-[32px]" :style="currentActive === '/goals' ? 'font-variation-settings: \'FILL\' 1;' : ''">track_changes</span>
          <span class="text-[11px] tracking-tight" :class="currentActive === '/goals' ? 'font-bold' : 'font-medium'"></span>
        </NuxtLink>

        <!-- 5. Akun -->
        <NuxtLink
          to="/akun"
          class="flex flex-col items-center justify-center gap-1 w-14 transition-all duration-150 active:scale-90"
          :class="currentActive.startsWith('/akun') ? 'text-primary' : 'text-muted hover:text-on-surface'"
        >
          <span class="material-symbols-outlined text-[32px]" :style="currentActive.startsWith('/akun') ? 'font-variation-settings: \'FILL\' 1;' : ''">account_circle</span>
          <span class="text-[11px] tracking-tight" :class="currentActive.startsWith('/akun') ? 'font-bold' : 'font-medium'"></span>
        </NuxtLink>
      </div>
    </nav>
  </div>
</template>
