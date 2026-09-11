<script setup lang="ts">
const emit = defineEmits<{
  (e: 'open-chat'): void
  (e: 'open-key-prompt'): void
}>()

const { hasKey, loadSettings } = useAiSettings()

onMounted(async () => {
  await loadSettings()
})

function handleClick() {
  if (!hasKey.value) {
    emit('open-key-prompt')
  } else {
    emit('open-chat')
  }
}
</script>

<template>
  <div class="ai-fab-container">
    <button
      type="button"
      class="ai-fab-btn group"
      aria-label="Tanya Asisten Finansial AI CoupleCash"
      title="Tanya Asisten Finansial AI"
      @click="handleClick"
    >
      <!-- Glowing Pulse Effect -->
      <span class="ai-fab-glow"></span>

      <!-- Icon -->
      <div class="relative z-10 flex items-center justify-center">
        <span class="material-symbols-outlined ai-fab-icon" style="font-variation-settings: 'FILL' 1">
          auto_awesome
        </span>
      </div>
    </button>
  </div>
</template>

<style scoped>
.ai-fab-container {
  position: fixed;
  /* Placed directly above the 64px TabbarBottomNavigation, matching WhatsApp's new chat button */
  bottom: calc(82px + env(safe-area-inset-bottom, 0px));
  right: calc(max(18px, 50% - 240px));
  z-index: 45;
  pointer-events: auto;
}

.ai-fab-btn {
  width: 54px;
  height: 54px;
  border-radius: 18px;
  background: linear-gradient(135deg, var(--primary, #4648d4) 0%, #6366f1 100%);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  border: 2px solid rgba(255, 255, 255, 0.25);
  box-shadow: 0 8px 24px -4px rgba(70, 72, 212, 0.45), 0 4px 12px rgba(0, 0, 0, 0.12);
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  user-select: none;
}

.ai-fab-btn:hover {
  transform: translateY(-3px) scale(1.05);
  box-shadow: 0 12px 28px -4px rgba(70, 72, 212, 0.55), 0 6px 16px rgba(0, 0, 0, 0.16);
}

.ai-fab-btn:active {
  transform: scale(0.95);
}

.ai-fab-glow {
  position: absolute;
  inset: -3px;
  border-radius: 20px;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.5) 0%, transparent 70%);
  opacity: 0.6;
  animation: pulseGlow 2.5s infinite ease-in-out;
  pointer-events: none;
}

.ai-fab-icon {
  font-size: 26px;
  color: #ffffff;
  transition: transform 0.25s ease;
}

.ai-fab-btn:hover .ai-fab-icon {
  transform: rotate(12deg) scale(1.1);
}

.ai-fab-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #f59e0b;
  color: #ffffff;
  font-size: 9px;
  font-weight: 800;
  padding: 1px 5px;
  border-radius: 999px;
  border: 1.5px solid #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
  letter-spacing: 0.05em;
  z-index: 15;
}

@keyframes pulseGlow {
  0%, 100% {
    transform: scale(1);
    opacity: 0.4;
  }
  50% {
    transform: scale(1.15);
    opacity: 0.8;
  }
}
</style>
