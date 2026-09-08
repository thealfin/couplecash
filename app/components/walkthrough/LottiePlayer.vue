<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    animationData: any
    loop?: boolean
    autoplay?: boolean
    speed?: number
  }>(),
  {
    loop: true,
    autoplay: true,
    speed: 1,
  }
)

const containerRef = ref<HTMLElement | null>(null)
let animInstance: any = null

onMounted(async () => {
  if (typeof window === 'undefined' || !containerRef.value) return
  try {
    const lottieModule = await import('lottie-web')
    const lottie = (lottieModule as any).default || lottieModule
    loadAnimation(lottie)
  } catch (err) {
    console.warn('[LottiePlayer] Error loading lottie-web:', err)
  }
})

function loadAnimation(lottie: any) {
  if (!containerRef.value || !props.animationData) return
  if (animInstance) {
    animInstance.destroy()
    animInstance = null
  }

  animInstance = lottie.loadAnimation({
    container: containerRef.value,
    renderer: 'svg',
    loop: props.loop,
    autoplay: props.autoplay,
    animationData: props.animationData,
  })

  if (props.speed && animInstance.setSpeed) {
    animInstance.setSpeed(props.speed)
  }
}

watch(
  () => props.animationData,
  async (newData) => {
    if (typeof window === 'undefined' || !newData) return
    const lottieModule = await import('lottie-web')
    const lottie = (lottieModule as any).default || lottieModule
    loadAnimation(lottie)
  },
  { deep: false }
)

onBeforeUnmount(() => {
  if (animInstance) {
    animInstance.destroy()
    animInstance = null
  }
})
</script>

<template>
  <div class="lottie-container relative flex items-center justify-center overflow-hidden pointer-events-none">
    <div ref="containerRef" class="w-full h-full flex items-center justify-center"></div>
  </div>
</template>

<style scoped>
.lottie-container {
  width: 100%;
  height: 100%;
}
</style>
