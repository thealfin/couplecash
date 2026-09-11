<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import TypingDotsIndicator from './TypingDotsIndicator.vue'
import AiPersonaModal from './AiPersonaModal.vue'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
  (e: 'request-key'): void
}>()

const { getAuthToken } = useAuth()
const { hasKey, getGeminiKey, loadSettings, settings, AVAILABLE_AI_MODELS } = useAiSettings()
const supabase = useSupabase()

const activeModelName = computed(() => {
  const found = AVAILABLE_AI_MODELS.find((m) => m.id === settings.value?.model)
  return found ? found.name : (settings.value?.model || 'Gemini 2.5 Flash')
})

interface MessageItem {
  id: string
  sessionId: string
  sender: 'user' | 'model' | 'assistant'
  message: string
  createdAt?: string
}

interface ChatSession {
  id: string
  title: string
  createdAt?: string
}

const sessions = ref<ChatSession[]>([])
const activeSession = ref<ChatSession | null>(null)
const messages = ref<MessageItem[]>([])
const inputText = ref('')
const isLoadingSession = ref(false)
const isGenerating = ref(false)
const errorMessage = ref('')
const isPersonaModalOpen = ref(false)
const expandedMessageIds = ref<Set<string>>(new Set())

const messagesScrollRef = ref<HTMLDivElement | null>(null)
let realtimeChannel: any = null

const QUICK_PROMPTS = [
  'Berapa total belanja kita bulan ini?',
  'Kategori apa paling banyak menyerap anggaran?',
  'Bagaimana status alokasi budget keluarga?',
  'Berikan tips hemat pengeluaran rumah tangga',
]

// Formatting helpers for long AI messages
function isAIMessageLong(text: string): boolean {
  if (!text) return false
  const trimmed = text.trim()
  const paragraphs = trimmed.split(/\n+/).filter((p) => p.trim().length > 0)
  return paragraphs.length > 3 || trimmed.length > 120
}

function getAIMessagePreview(text: string): string {
  if (!text) return ''
  const trimmed = text.trim()
  const paragraphs = trimmed.split(/\n+/).filter((p) => p.trim().length > 0)

  let preview = paragraphs.length > 3 ? paragraphs.slice(0, 3).join('\n\n') : trimmed
  if (preview.length > 120) {
    const sliced = preview.slice(0, 120)
    const lastSpace = sliced.lastIndexOf(' ')
    const cleanCut = lastSpace > 60 ? sliced.slice(0, lastSpace) : sliced
    return cleanCut.trim() + '...'
  }
  if (paragraphs.length > 3) {
    return preview.trim() + '...'
  }
  return preview
}

function toggleExpand(id: string) {
  if (expandedMessageIds.value.has(id)) {
    expandedMessageIds.value.delete(id)
  } else {
    expandedMessageIds.value.add(id)
  }
}

const viewportHeight = ref<number | null>(null)
const isKeyboardActive = ref(false)

function scrollToBottom(smooth = false, centerLast = false) {
  nextTick(() => {
    if (!messagesScrollRef.value) return
    if (centerLast) {
      const bubbles = messagesScrollRef.value.querySelectorAll('.chat-message-bubble')
      if (bubbles.length > 0) {
        const lastBubble = bubbles[bubbles.length - 1] as HTMLElement
        lastBubble.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'center' })
        return
      }
    }
    messagesScrollRef.value.scrollTo({
      top: messagesScrollRef.value.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto',
    })
  })
}

function handleInputFocus() {
  // WhatsApp-like auto-center: scroll latest chat message into vertical center above keyboard
  setTimeout(() => {
    scrollToBottom(true, true)
  }, 160)
  setTimeout(() => {
    scrollToBottom(true, true)
  }, 380)
}

function handleVisualViewportResize() {
  if (!import.meta.client || !window.visualViewport) return
  const vv = window.visualViewport
  viewportHeight.value = vv.height
  const kbActive = window.innerHeight - vv.height > 120
  isKeyboardActive.value = kbActive
  if (kbActive) {
    setTimeout(() => {
      scrollToBottom(true, true)
    }, 120)
  }
}

const modalContainerStyle = computed(() => {
  if (import.meta.client && viewportHeight.value && window.innerWidth < 640) {
    return {
      height: `${viewportHeight.value}px`,
      maxHeight: `${viewportHeight.value}px`,
    }
  }
  return {}
})

// ── Realtime Supabase Subscription ──
function setupRealtimeChannel(sessionId: string) {
  cleanupRealtimeChannel()

  try {
    realtimeChannel = supabase.channel(`chat_session_${sessionId}`)
      .on('broadcast', { event: 'new_message' }, ({ payload }) => {
        if (payload && payload.sessionId === sessionId) {
          const exists = messages.value.some((m) => m.id === payload.id)
          if (!exists) {
            messages.value.push(payload)
            isGenerating.value = false
            scrollToBottom()
          }
        }
      })
      .subscribe()
  } catch (err) {
    console.warn('[AiFinancialChatModal] Supabase Realtime warning:', err)
  }
}

function cleanupRealtimeChannel() {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel)
    realtimeChannel = null
  }
}

// ── Sesi & Riwayat Chat ──
async function initSession() {
  isLoadingSession.value = true
  errorMessage.value = ''
  try {
    await loadSettings()
    if (!hasKey.value) {
      emit('request-key')
      isLoadingSession.value = false
      return
    }

    const token = await getAuthToken()
    const res = await $fetch<{ success: boolean; sessions: ChatSession[] }>('/api/ai/sessions', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })

    sessions.value = res.sessions || []

    if (sessions.value.length > 0) {
      activeSession.value = sessions.value[0]
      await loadSessionMessages(sessions.value[0].id)
    } else {
      await createNewSession()
    }
  } catch (err: any) {
    errorMessage.value = err?.data?.statusMessage || err?.message || 'Gagal memuat sesi chat AI'
  } finally {
    isLoadingSession.value = false
  }
}

async function loadSessionMessages(sessionId: string) {
  try {
    const token = await getAuthToken()
    const res = await $fetch<{ success: boolean; session: any }>(`/api/ai/sessions/${sessionId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })

    messages.value = res.session?.messages || []
    setupRealtimeChannel(sessionId)
    scrollToBottom()
  } catch (err: any) {
    console.warn('[loadSessionMessages] error:', err)
  }
}

async function createNewSession() {
  try {
    const token = await getAuthToken()
    const res = await $fetch<{ success: boolean; session: ChatSession }>('/api/ai/sessions', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: { title: 'Konsultasi Finansial Baru' },
    })

    if (res.session) {
      sessions.value.unshift(res.session)
      activeSession.value = res.session
      messages.value = []
      setupRealtimeChannel(res.session.id)
    }
  } catch (err: any) {
    errorMessage.value = 'Gagal membuat sesi baru: ' + (err?.message || err)
  }
}

async function handleClearHistory() {
  if (!activeSession.value) return
  if (!confirm('Hapus seluruh riwayat percakapan pada sesi ini?')) return

  try {
    const token = await getAuthToken()
    await $fetch(`/api/ai/sessions/${activeSession.value.id}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })

    messages.value = []
    expandedMessageIds.value.clear()
    await initSession()
  } catch (err: any) {
    alert('Gagal menghapus riwayat: ' + (err?.message || err))
  }
}

// ── Mengirim Pesan ──
async function handleSend(textToSend?: string) {
  const text = (textToSend || inputText.value).trim()
  if (!text || isGenerating.value) return

  if (!hasKey.value) {
    emit('request-key')
    return
  }

  const rawKey = await getGeminiKey()
  if (!rawKey) {
    emit('request-key')
    return
  }

  inputText.value = ''
  errorMessage.value = ''
  isGenerating.value = true

  // Optimistic UI message
  const tempUserMsg: MessageItem = {
    id: `temp_${Date.now()}`,
    sessionId: activeSession.value?.id || '',
    sender: 'user',
    message: text,
    createdAt: new Date().toISOString(),
  }
  messages.value.push(tempUserMsg)
  scrollToBottom()

  let attempt = 0
  const maxAttempts = 3
  let success = false

  while (attempt < maxAttempts && !success) {
    try {
      const token = await getAuthToken()
      const customPrompt = import.meta.client
        ? localStorage.getItem('couplecash_ai_persona_prompt') || undefined
        : undefined

      const res = await $fetch<any>('/api/ai/chat', {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'X-Gemini-Api-Key': rawKey,
        },
        body: {
          sessionId: activeSession.value?.id,
          message: text,
          customPersonaPrompt: customPrompt,
          model: settings.value?.model,
        },
      })

      if (res?.message) {
        const exists = messages.value.some((m) => m.id === res.message.id)
        if (!exists) {
          messages.value.push(res.message)
        }
      }

      if (res?.sessionId && (!activeSession.value || activeSession.value.id !== res.sessionId)) {
        await loadSessionMessages(res.sessionId)
      }

      success = true
      break
    } catch (err: any) {
      attempt++
      const msg = String(err?.data?.statusMessage || err?.data?.message || err?.message || '')
      const statusCode = err?.statusCode || err?.status || err?.data?.statusCode

      const isTransientDemandSpike =
        statusCode === 503 ||
        statusCode === 429 ||
        statusCode === 500 ||
        statusCode === 502 ||
        statusCode === 504 ||
        msg.includes('503') ||
        msg.includes('high demand') ||
        msg.includes('spikes in demand') ||
        msg.includes('busy') ||
        msg.includes('overloaded') ||
        msg.includes('rate limit') ||
        msg.includes('service unavailable')

      if (isTransientDemandSpike && attempt < maxAttempts) {
        console.warn(`[AiFinancialChat] Transient spike detected (${statusCode || 503}). Silently retrying with typing dots active...`)
        // Keep typing animation active without flashing error to user
        await new Promise((resolve) => setTimeout(resolve, 1000 + attempt * 500))
        continue
      }

      // Non-transient or retries exhausted
      errorMessage.value = msg || 'Terjadi kesalahan saat berkonsultasi dengan Gemini AI.'
      break
    }
  }

  isGenerating.value = false
  scrollToBottom()
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      initSession()
      if (import.meta.client && window.visualViewport) {
        window.visualViewport.addEventListener('resize', handleVisualViewportResize)
        window.visualViewport.addEventListener('scroll', handleVisualViewportResize)
        handleVisualViewportResize()
      }
    } else {
      cleanupRealtimeChannel()
      if (import.meta.client && window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleVisualViewportResize)
        window.visualViewport.removeEventListener('scroll', handleVisualViewportResize)
      }
    }
  }
)

onMounted(() => {
  if (import.meta.client && props.open && window.visualViewport) {
    window.visualViewport.addEventListener('resize', handleVisualViewportResize)
    window.visualViewport.addEventListener('scroll', handleVisualViewportResize)
    handleVisualViewportResize()
  }
})

onUnmounted(() => {
  cleanupRealtimeChannel()
  if (import.meta.client && window.visualViewport) {
    window.visualViewport.removeEventListener('resize', handleVisualViewportResize)
    window.visualViewport.removeEventListener('scroll', handleVisualViewportResize)
  }
})

function close() {
  emit('update:open', false)
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/65 backdrop-blur-sm transition-opacity animate-fade-in"
      @click.self="close"
    >
      <div
        class="w-full max-w-[540px] h-[92dvh] sm:h-[84vh] bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col transition-[height] duration-150 animate-slide-up"
        :style="modalContainerStyle"
      >
        <!-- Header Chat -->
        <div class="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white/90 dark:bg-slate-900/90 backdrop-blur-md z-10 shrink-0">
          <div class="flex items-center gap-3">
            <div class="relative w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary to-indigo-500 text-white flex items-center justify-center shadow-sm">
              <span class="material-symbols-outlined text-xl" style="font-variation-settings: 'FILL' 1">auto_awesome</span>
              <span class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900"></span>
            </div>
            <div>
              <div class="flex items-center gap-1.5">
                <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100">CoupleCash AI</h3>
                <span class="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-bold">BYOK</span>
              </div>
              <p class="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <span>Penasihat Finansial</span>
                <span>•</span>
                <NuxtLink
                  to="/akun/pengaturan/ai"
                  @click="close"
                  class="text-primary hover:underline font-semibold flex items-center gap-0.5"
                  title="Ganti model di Pengaturan AI"
                >
                  <span>{{ activeModelName }}</span>
                  <span class="material-symbols-outlined text-[11px]">tune</span>
                </NuxtLink>
              </p>
            </div>
          </div>

          <div class="flex items-center gap-1">
            <!-- New Chat Session Button -->
            <button
              class="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Obrolan Baru"
              @click="createNewSession"
            >
              <span class="material-symbols-outlined text-lg">add_comment</span>
            </button>

            <!-- Persona Tuning -->
            <button
              class="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Pengaturan Gaya Bahasa AI"
              @click="isPersonaModalOpen = true"
            >
              <span class="material-symbols-outlined text-lg">tune</span>
            </button>

            <!-- Clear History -->
            <button
              v-if="messages.length > 0"
              class="w-8 h-8 rounded-xl flex items-center justify-center text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              title="Hapus Riwayat Obrolan"
              @click="handleClearHistory"
            >
              <span class="material-symbols-outlined text-lg">delete_sweep</span>
            </button>

            <!-- Close -->
            <button
              class="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              @click="close"
            >
              <span class="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
        </div>

        <!-- Chat Body -->
        <div
          ref="messagesScrollRef"
          class="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50 dark:bg-slate-950/30"
        >
          <!-- Empty State & Quick Prompts -->
          <div v-if="messages.length === 0 && !isLoadingSession" class="py-6 flex flex-col items-center text-center gap-3">
            <div class="w-14 h-14 rounded-3xl bg-primary/10 text-primary flex items-center justify-center">
              <span class="material-symbols-outlined text-3xl">chat_bubble_outline</span>
            </div>
            <div>
              <h4 class="text-sm font-bold text-slate-900 dark:text-slate-100">Hai, ada yang bisa saya bantu?</h4>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                Tanyakan seputar pengeluaran, perbandingan saldo, alokasi anggaran, atau rencana keuangan keluarga.
              </p>
            </div>

            <!-- Quick prompts list -->
            <div class="w-full flex flex-col gap-2 mt-2 max-w-sm">
              <button
                v-for="(prompt, idx) in QUICK_PROMPTS"
                :key="idx"
                type="button"
                class="w-full py-2.5 px-3.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-primary/50 text-left text-xs text-slate-700 dark:text-slate-300 font-medium transition-all shadow-sm flex items-center justify-between group"
                @click="handleSend(prompt)"
              >
                <span>{{ prompt }}</span>
                <span class="material-symbols-outlined text-sm text-slate-400 group-hover:text-primary transition-colors">arrow_forward</span>
              </button>
            </div>
          </div>

          <!-- Message Bubbles -->
          <div
            v-for="msg in messages"
            :key="msg.id"
            class="chat-message-bubble flex flex-col"
            :class="msg.sender === 'user' ? 'items-end' : 'items-start'"
          >
            <!-- User message -->
            <div
              v-if="msg.sender === 'user'"
              class="max-w-[85%] py-2.5 px-4 rounded-2xl rounded-br-xs bg-primary text-white text-xs leading-relaxed shadow-sm break-words whitespace-pre-wrap"
            >
              {{ msg.message }}
            </div>

            <!-- Assistant message -->
            <div
              v-else
              class="max-w-[90%] flex items-start gap-2.5"
            >
              <div class="w-7 h-7 rounded-full bg-gradient-to-tr from-primary to-indigo-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                <span class="material-symbols-outlined text-xs">auto_awesome</span>
              </div>
              <div class="flex-1">
                <div class="p-3.5 rounded-2xl rounded-tl-xs bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-100 text-xs leading-relaxed shadow-xs break-words whitespace-pre-wrap">
                  <template v-if="isAIMessageLong(msg.message) && !expandedMessageIds.has(msg.id)">
                    {{ getAIMessagePreview(msg.message) }}
                    <button
                      type="button"
                      class="block mt-2 font-bold text-primary hover:underline text-[11px]"
                      @click="toggleExpand(msg.id)"
                    >
                      Selengkapnya ▼
                    </button>
                  </template>
                  <template v-else>
                    {{ msg.message }}
                    <button
                      v-if="isAIMessageLong(msg.message) && expandedMessageIds.has(msg.id)"
                      type="button"
                      class="block mt-2 font-bold text-slate-400 hover:text-slate-600 text-[11px]"
                      @click="toggleExpand(msg.id)"
                    >
                      Sembunyikan ▲
                    </button>
                  </template>
                </div>
              </div>
            </div>
          </div>

          <!-- Typing Indicator while generating or retrying in background -->
          <div v-if="isGenerating" class="chat-message-bubble flex items-start gap-2.5 animate-fade-in">
            <div class="w-7 h-7 rounded-full bg-gradient-to-tr from-primary to-indigo-500 text-white flex items-center justify-center shrink-0 mt-0.5">
              <span class="material-symbols-outlined text-xs">auto_awesome</span>
            </div>
            <div>
              <TypingDotsIndicator />
              <p class="text-[10px] text-slate-400 mt-1 italic">Menyusun analisis keuangan...</p>
            </div>
          </div>

          <!-- Error notice -->
          <div v-if="errorMessage" class="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2">
            <span class="material-symbols-outlined text-base shrink-0">error</span>
            <span class="flex-1">{{ errorMessage }}</span>
          </div>
        </div>

        <!-- Input Bar -->
        <div class="p-3.5 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <form class="flex items-center gap-2.5" autocomplete="off" @submit.prevent="handleSend()">
            <input
              id="ai-chat-prompt-input"
              name="chat_message_prompt"
              v-model="inputText"
              type="text"
              autocomplete="off"
              autocorrect="off"
              autocapitalize="sentences"
              spellcheck="false"
              data-form-type="other"
              data-lpignore="true"
              data-1p-ignore="true"
              enterkeyhint="send"
              placeholder="Tanyakan analisis keuangan keluarga Anda..."
              class="flex-1 h-12 px-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-slate-400 placeholder:text-xs sm:placeholder:text-sm transition-all shadow-inner"
              :disabled="isGenerating"
              @focus="handleInputFocus"
            />
            <button
              type="submit"
              class="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shrink-0 shadow-md shadow-primary/25 hover:opacity-95 active:scale-95 transition-all disabled:opacity-40 disabled:scale-100"
              :disabled="!inputText.trim() || isGenerating"
              title="Kirim Pertanyaan"
            >
              <span class="material-symbols-outlined text-xl">send</span>
            </button>
          </form>
        </div>
      </div>
    </div>

    <!-- Sub-modal Persona Settings -->
    <AiPersonaModal v-model:open="isPersonaModalOpen" />
  </Teleport>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.18s ease-out; }
.animate-slide-up { animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { transform: translateY(18px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
</style>
