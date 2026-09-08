<script setup lang="ts">
import { computed } from 'vue'
import LottiePlayer from './LottiePlayer.vue'

const emit = defineEmits<{
  (e: 'open-sync'): void
}>()

const {
  activeTour,
  currentStepIndex,
  currentSteps,
  currentStep,
  isTourActive,
  isLastStep,
  nextStep,
  prevStep,
  skipTour,
  completeTour,
} = useWalkthrough()

function handlePrimaryClick() {
  if (!currentStep.value) return
  
  // If this step navigates to a setup screen (e.g., pos akun or kategori)
  if (currentStep.value.primaryCtaRoute) {
    const route = currentStep.value.primaryCtaRoute
    completeTour()
    navigateTo(route)
    return
  }

  // If this step is in pairing tour and it's the last step
  if (activeTour.value === 'pairing' && isLastStep.value) {
    completeTour()
    emit('open-sync')
    return
  }

  // Otherwise proceed to next step or complete
  nextStep()
}

function handleSecondaryClick() {
  nextStep()
}
</script>

<template>
  <Teleport to="body">
    <Transition name="tour-fade">
      <div
        v-if="isTourActive && currentStep"
        class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md transition-all duration-300"
      >
        <div
          class="relative w-full max-w-sm sm:max-w-md bg-surface-container-lowest rounded-3xl p-5 shadow-2xl border border-outline-variant/30 flex flex-col gap-4 max-h-[92vh] overflow-y-auto animate-scale-up"
        >
          <!-- Top Row: Badge & Skip Button -->
          <div class="flex items-center justify-between">
            <span
              class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wide shadow-xs"
              :class="[
                currentStep.badge.includes('FOKUS')
                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 animate-pulse'
                  : 'bg-primary/10 text-primary border border-primary/20'
              ]"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
              {{ currentStep.badge }}
            </span>

            <button
              type="button"
              class="text-xs font-semibold text-muted hover:text-on-surface px-2.5 py-1 rounded-lg hover:bg-surface-container transition-colors cursor-pointer"
              @click="skipTour"
            >
              Lewati
            </button>
          </div>

          <!-- Lottie Animation Container -->
          <div
            class="w-full h-44 sm:h-48 rounded-2xl bg-gradient-to-br from-primary/5 via-surface-container to-secondary/5 border border-outline-variant/20 flex items-center justify-center relative overflow-hidden shadow-inner"
          >
            <LottiePlayer
              :key="`${activeTour}-${currentStepIndex}`"
              :animation-data="currentStep.animation"
              :loop="true"
              :autoplay="true"
              class="w-full h-full p-2"
            />
          </div>

          <!-- Content: Title, Subtitle, Description -->
          <div class="flex flex-col gap-1.5 text-left">
            <h3 class="text-base sm:text-lg font-extrabold text-on-surface tracking-tight leading-snug">
              {{ currentStep.title }}
            </h3>
            <p class="text-xs font-bold text-primary">
              {{ currentStep.subtitle }}
            </p>
            <p class="text-xs text-muted leading-relaxed mt-0.5">
              {{ currentStep.description }}
            </p>
          </div>

          <!-- Step Indicators (Dots) -->
          <div class="flex items-center justify-center gap-1.5 py-1">
            <div
              v-for="(_, idx) in currentSteps"
              :key="idx"
              class="h-1.5 rounded-full transition-all duration-300"
              :class="[
                idx === currentStepIndex
                  ? 'w-6 bg-primary'
                  : 'w-1.5 bg-outline-variant/50'
              ]"
            ></div>
          </div>

          <!-- Action Buttons -->
          <div class="flex flex-col gap-2 pt-1 border-t border-outline-variant/20">
            <!-- Primary Action -->
            <button
              type="button"
              class="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-primary via-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 text-white font-bold text-xs shadow-md shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              @click="handlePrimaryClick"
            >
              <span>{{ currentStep.primaryCtaText || (isLastStep ? 'Selesai' : 'Lanjut') }}</span>
              <span class="material-symbols-outlined text-[16px]">
                {{ isLastStep ? 'check_circle' : 'arrow_forward' }}
              </span>
            </button>

            <!-- Secondary Action (if available or Prev button) -->
            <div class="flex items-center justify-between gap-2">
              <button
                v-if="currentStepIndex > 0"
                type="button"
                class="py-1.5 px-3 rounded-lg text-xs font-medium text-muted hover:text-on-surface hover:bg-surface-container transition-colors flex items-center gap-1 cursor-pointer"
                @click="prevStep"
              >
                <span class="material-symbols-outlined text-[14px]">arrow_back</span>
                <span>Kembali</span>
              </button>
              <div v-else></div>

              <button
                v-if="currentStep.secondaryCtaText"
                type="button"
                class="py-1.5 px-3 rounded-lg text-xs font-semibold text-primary hover:bg-primary/5 transition-colors cursor-pointer"
                @click="handleSecondaryClick"
              >
                {{ currentStep.secondaryCtaText }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.tour-fade-enter-active,
.tour-fade-leave-active {
  transition: opacity 0.25s ease;
}
.tour-fade-enter-from,
.tour-fade-leave-to {
  opacity: 0;
}

@keyframes scaleUp {
  from {
    transform: scale(0.95);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.animate-scale-up {
  animation: scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
</style>
