<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

definePageMeta({ layout: false })
useHead({ title: 'Scan Struk AI — CoupleCash' })

const router = useRouter()
const { uploadFile } = useStorage()
const { settings, hasKey, loadSettings, getGeminiKey } = useAiSettings()
const { saveReceiptToCache, updateReceiptInCache } = useReceiptCache()

const videoElement = ref<HTMLVideoElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const mediaStream = ref<MediaStream | null>(null)
const isCameraReady = ref(false)
const isInitializingCamera = ref(false)
const cameraError = ref('')
const availableCameras = ref<MediaDeviceInfo[]>([])
const activeFacingMode = ref<'environment' | 'user'>('environment')

const isScanning = ref(false)
const isModelSheetOpen = ref(false)
const progressValue = ref(0)
const statusText = ref('Posisikan struk dalam batas kotak. Pastikan total dan nama toko terlihat jelas.')
const errorMessage = ref('')

// Flash 3 modes: 0: off, 1: on, 2: auto
const flashMode = ref<number>(0)
const flashModes = [
  { icon: 'flash_off', label: 'Off', class: 'bg-black/40 text-white' },
  { icon: 'flash_on', label: 'On', class: 'bg-amber-500 text-black' },
  { icon: 'flash_auto', label: 'Auto', class: 'bg-indigo-600 text-white' },
]

// Laser animation
const laserPos = ref(25)
let laserDir = 1
let laserAnimId: any = null

function runLaserAnimation() {
  laserPos.value += 0.45 * laserDir
  if (laserPos.value >= 82) laserDir = -1
  else if (laserPos.value <= 18) laserDir = 1
  laserAnimId = requestAnimationFrame(runLaserAnimation)
}

function stopCamera() {
  if (mediaStream.value) {
    try {
      mediaStream.value.getTracks().forEach((track) => {
        try {
          track.stop()
        } catch {}
      })
    } catch {}
    mediaStream.value = null
  }
  if (videoElement.value) {
    try {
      videoElement.value.srcObject = null
    } catch {}
  }
  isCameraReady.value = false
}

function attachStream(stream: MediaStream) {
  mediaStream.value = stream
  if (videoElement.value) {
    const video = videoElement.value
    video.srcObject = stream
    video.setAttribute('playsinline', 'true')
    video.setAttribute('autoplay', 'true')
    video.muted = true

    const markReady = () => {
      isCameraReady.value = true
      cameraError.value = ''
    }

    video.onloadedmetadata = () => {
      video.play().then(markReady).catch(markReady)
    }
    video.oncanplay = markReady

    // Direct play call
    video.play().then(markReady).catch(() => markReady())
  }
}

// ── Hardware Camera Initialization ──
async function initCamera() {
  if (!import.meta.client) return
  if (isInitializingCamera.value) return
  isInitializingCamera.value = true
  cameraError.value = ''
  isCameraReady.value = false

  if (!navigator.mediaDevices?.getUserMedia) {
    cameraError.value = 'Browser Anda tidak mendukung akses kamera perangkat.'
    isInitializingCamera.value = false
    return
  }

  // 1. Stop any running tracks cleanly
  stopCamera()
  // Allow driver cooldown to prevent Windows Media Foundation lock
  await new Promise((r) => setTimeout(r, 200))

  try {
    // 2. Discover available video input devices
    let videoDevices: MediaDeviceInfo[] = []
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices()
      videoDevices = allDevices.filter((d) => d.kind === 'videoinput')
      availableCameras.value = videoDevices
    } catch (e) {
      console.warn('[Camera] Device enumeration note:', e)
    }

    // 3. Determine best constraints:
    // If only 1 camera exists (common on laptops/PCs or single webcams), do NOT enforce 'environment' facingMode,
    // as Windows Media Foundation will hang waiting for a rear camera and throw AbortError!
    let stream: MediaStream | null = null

    if (videoDevices.length <= 1) {
      // Single camera (laptop webcam, PC USB camera, etc.)
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        })
      } catch (e1) {
        console.warn('[Camera] Standard constraints failed, trying basic video:', e1)
        await new Promise((r) => setTimeout(r, 300))
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      }
    } else {
      // Multiple cameras available (phones, tablets, multi-cam setups)
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: activeFacingMode.value },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        })
      } catch (e2) {
        console.warn('[Camera] Ideal facing constraints failed, falling back to basic video:', e2)
        await new Promise((r) => setTimeout(r, 400))
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      }
    }

    if (stream) {
      attachStream(stream)
      // Refresh devices now that permission is granted (labels populated)
      try {
        const refreshed = await navigator.mediaDevices.enumerateDevices()
        availableCameras.value = refreshed.filter((d) => d.kind === 'videoinput')
      } catch {}
    }
  } catch (err: any) {
    console.error('[Camera] Access failed completely:', err)
    if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
      cameraError.value = 'Izin kamera ditolak. Silakan izinkan akses kamera di ikon gembok/kamera pada address bar browser Anda.'
    } else if (err?.name === 'AbortError') {
      cameraError.value = 'Kamera sibuk atau timeout. Pastikan kamera tidak sedang dipakai aplikasi lain, lalu tekan Coba Lagi.'
    } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
      cameraError.value = 'Tidak ada perangkat kamera yang ditemukan di perangkat ini.'
    } else {
      cameraError.value = 'Kamera tidak dapat diakses saat ini. Tekan Coba Lagi atau gunakan Pilih Foto.'
    }
  } finally {
    isInitializingCamera.value = false
  }
}

async function switchCamera() {
  if (isInitializingCamera.value) return
  activeFacingMode.value = activeFacingMode.value === 'environment' ? 'user' : 'environment'
  await initCamera()
}

onMounted(async () => {
  await loadSettings()
  await initCamera()
  laserAnimId = requestAnimationFrame(runLaserAnimation)
})

onBeforeUnmount(() => {
  stopCamera()
  if (laserAnimId) cancelAnimationFrame(laserAnimId)
})

async function cycleFlash() {
  flashMode.value = (flashMode.value + 1) % flashModes.length
  if (!mediaStream.value) return
  const track = mediaStream.value.getVideoTracks()[0]
  if (!track) return

  const capabilities: any = track.getCapabilities ? track.getCapabilities() : {}
  if (capabilities.torch) {
    try {
      await track.applyConstraints({
        advanced: [{ torch: flashMode.value === 1 } as any],
      })
    } catch (e) {
      console.warn('Torch constraint error:', e)
    }
  }
}

// ── Capture snapshot from live camera feed ──
function capturePhoto() {
  if (isScanning.value) return
  if (!hasKey.value) {
    isModelSheetOpen.value = true
    return
  }

  // Visual screen flash & haptic feedback
  if (import.meta.client) {
    navigator.vibrate?.(40)
    const flashOverlay = document.createElement('div')
    flashOverlay.className = 'fixed inset-0 z-50 bg-white pointer-events-none transition-opacity duration-200'
    flashOverlay.style.opacity = '0.8'
    document.body.appendChild(flashOverlay)
    setTimeout(() => {
      flashOverlay.style.opacity = '0'
      setTimeout(() => flashOverlay.remove(), 250)
    }, 70)
  }

  // If live camera is not ready, trigger file picker immediately
  if (!videoElement.value || !isCameraReady.value) {
    triggerFileInput()
    return
  }

  const video = videoElement.value
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth || 1280
  canvas.height = video.videoHeight || 720

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    triggerFileInput()
    return
  }

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
  const dataUrl = canvas.toDataURL('image/jpeg', 0.9)

  canvas.toBlob((blob) => {
    const finalBlob = blob || new Blob([], { type: 'image/jpeg' })
    processReceiptSnapshot(dataUrl, finalBlob, `receipt_${Date.now()}.jpg`, 'image/jpeg')
  }, 'image/jpeg', 0.9)
}

// ── Main Pipeline: Local Cache → Immediate AI Analysis + Background Cloudflare R2 Backup ──
async function processReceiptSnapshot(
  dataUrl: string,
  fileOrBlob: File | Blob,
  fileName: string,
  fileType: string
) {
  isScanning.value = true
  errorMessage.value = ''
  progressValue.value = 15
  statusText.value = 'Menyimpan di cache lokal & menganalisis...'

  try {
    const key = await getGeminiKey()
    if (!key) {
      hasKey.value = false
      isScanning.value = false
      isModelSheetOpen.value = true
      return
    }

    // 1. Save to local cache
    const cachedRecord = await saveReceiptToCache(dataUrl, fileType, fileName)
    progressValue.value = 35

    // 2. Extract raw base64 string for Gemini API
    const base64Only = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl

    // 3. Trigger Background Cloudflare R2 Backup asynchronously (won't block AI analysis)
    updateReceiptInCache(cachedRecord.id, { r2Status: 'uploading' })
    const r2Promise = uploadFile(fileOrBlob, fileName, fileType, 'receipts')
      .then((presign) => {
        console.log('[R2 Backup] Berhasil diunggah ke Cloudflare R2:', presign.objectKey)
        updateReceiptInCache(cachedRecord.id, {
          r2ObjectKey: presign.objectKey,
          r2Status: 'completed',
        })
        return presign.objectKey
      })
      .catch((r2Err) => {
        console.warn('[R2 Backup Warning] Upload background R2 gagal (tetap lanjutkan lokal):', r2Err)
        updateReceiptInCache(cachedRecord.id, { r2Status: 'failed' })
        return null
      })

    // 4. Call AI Vision Analyzer directly using cached local base64
    progressValue.value = 65
    statusText.value = `Membaca nota dengan ${settings.value.model === 'gemini-2.5-pro' ? 'Gemini 2.5 Pro' : 'Gemini 2.5 Flash'}...`

    const result: any = await $fetch('/api/ai/analyze-receipt', {
      method: 'POST',
      headers: { 'X-Gemini-Api-Key': key },
      body: {
        imageBase64: base64Only,
        fileType,
        preferredModel: settings.value.model,
      },
    })

    progressValue.value = 95
    statusText.value = 'Selesai! Menyiapkan pratinjau...'

    // Wait briefly or check if R2 finished
    const r2Key = await Promise.race([
      r2Promise,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 1000)),
    ])

    if (result.success && result.data) {
      // Update cache with AI result
      await updateReceiptInCache(cachedRecord.id, {
        aiStatus: 'completed',
        aiData: result.data,
      })

      progressValue.value = 100

      setTimeout(() => {
        router.push({
          path: '/input/review',
          query: {
            receiptId: cachedRecord.id,
            merchant: result.data.merchant || '',
            amount: result.data.amount ? String(result.data.amount) : '',
            subtotal: result.data.subtotal ? String(result.data.subtotal) : '',
            discount: result.data.discount ? String(result.data.discount) : '',
            taxAmount: result.data.tax_amount ? String(result.data.tax_amount) : '0',
            serviceCharge: result.data.service_charge ? String(result.data.service_charge) : '',
            paymentMethod: result.data.payment_method || '',
            category: result.data.suggested_category || '',
            date: result.data.date || '',
            objectKey: r2Key || cachedRecord.r2ObjectKey || '',
          },
        })
      }, 400)
    } else {
      throw new Error(result?.message || 'Gagal mengekstrak data dari struk')
    }
  } catch (err: any) {
    console.error('Scan process failed:', err)
    errorMessage.value = err?.data?.message || err?.message || 'Gagal memindai struk, silakan coba lagi'
  } finally {
    isScanning.value = false
  }
}

// ── Handle Gallery / File Attachment Picking ──
function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    const file = target.files[0]
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      if (dataUrl) {
        processReceiptSnapshot(dataUrl, file, file.name, file.type)
      }
    }
    reader.readAsDataURL(file)
  }
}

function triggerFileInput() {
  fileInput.value?.click()
}
</script>

<template>
  <div class="kamera-root select-none overflow-hidden bg-black text-white w-full h-[100dvh] relative flex flex-col justify-between">
    <!-- 0. Dark Viewfinder Backdrop (Clean black with connecting spinner) -->
    <div class="absolute inset-0 z-0 bg-[#07070a] flex flex-col items-center justify-center pointer-events-none">
      <div v-if="!isCameraReady && !cameraError" class="flex flex-col items-center gap-3 text-white/60 animate-pulse">
        <div class="w-10 h-10 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin"></div>
        <span class="text-xs font-medium tracking-wide text-white/70">Menghubungkan ke kamera...</span>
      </div>
    </div>

    <!-- 1. Live Hardware Video Feed -->
    <video
      ref="videoElement"
      class="camera-feed transition-opacity duration-300"
      autoplay
      playsinline
      muted
      :class="isCameraReady ? 'opacity-100' : 'opacity-0'"
    ></video>

    <!-- Immersive Dark Vignette Overlays -->
    <div class="absolute inset-0 bg-gradient-to-b from-black/75 via-transparent to-black/85 pointer-events-none z-10"></div>
    <div class="absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.6)] pointer-events-none z-10"></div>

    <!-- Hidden Native File Picker -->
    <input
      type="file"
      ref="fileInput"
      accept="image/*"
      class="hidden"
      @change="handleFileSelect"
    />

    <!-- 2. Floating Top Navigation Bar (Header) -->
    <header class="relative z-30 pt-safe px-5 pt-3 flex items-center justify-between">
      <!-- Close Button (X) -->
      <button
        aria-label="Tutup Pemindai"
        class="w-11 h-11 rounded-full bg-black/40 backdrop-blur-xl border border-white/15 text-white flex items-center justify-center active:scale-90 transition-all shadow-lg hover:bg-black/60 cursor-pointer"
        type="button"
        @click="router.back()"
      >
        <span class="material-symbols-outlined text-[22px]">close</span>
      </button>

      <!-- AI Live Status Badge -->
      <div
        class="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/45 backdrop-blur-xl border border-white/15 text-white shadow-lg cursor-pointer active:scale-95 transition"
        @click="isModelSheetOpen = true"
        title="Buka Pengaturan Model AI"
      >
        <span class="material-symbols-outlined text-[18px] text-indigo-400 animate-pulse">auto_awesome</span>
        <div class="flex items-center gap-1.5 font-medium text-xs tracking-wide">
          <span class="font-semibold text-white">
            {{ settings.model === 'gemini-2.5-pro' ? 'Gemini 2.5 Pro' : 'Gemini 2.5 Flash' }}
          </span>
          <span class="w-1.5 h-1.5 rounded-full" :class="hasKey ? 'bg-emerald-400' : 'bg-rose-400'"></span>
          <span :class="hasKey ? 'text-emerald-400' : 'text-rose-400'" class="font-medium text-[10px]">
            {{ hasKey ? 'Live OCR' : 'Kunci Belum Diatur' }}
          </span>
        </div>
      </div>

      <!-- Action Buttons on Right: Flip Camera (if available) & Flash Toggle -->
      <div class="flex items-center gap-2">
        <!-- Switch Camera Button (Visible if device has multiple cameras) -->
        <button
          v-if="availableCameras.length > 1"
          aria-label="Ganti Kamera"
          class="w-11 h-11 rounded-full bg-black/40 backdrop-blur-xl border border-white/15 text-white flex items-center justify-center active:scale-90 transition-all shadow-lg hover:bg-black/60 cursor-pointer"
          type="button"
          @click="switchCamera"
          title="Ganti Kamera Depan / Belakang"
        >
          <span class="material-symbols-outlined text-[20px]">flip_camera_ios</span>
        </button>

        <!-- Flash Toggle Button -->
        <button
          aria-label="Toggle Flash"
          class="w-11 h-11 rounded-full backdrop-blur-xl border border-white/15 flex items-center justify-center active:scale-90 transition-all shadow-lg cursor-pointer"
          :class="flashModes[flashMode].class"
          type="button"
          @click="cycleFlash"
        >
          <span class="material-symbols-outlined text-[22px]">{{ flashModes[flashMode].icon }}</span>
        </button>
      </div>
    </header>

    <!-- Compact Floating Key Warning (Non-obtrusive, does not block reticle) -->
    <div
      v-if="!hasKey && !isScanning"
      class="absolute top-16 inset-x-4 z-30 flex justify-center cursor-pointer animate-fade-in"
      @click="isModelSheetOpen = true"
    >
      <div class="px-3.5 py-1 rounded-full bg-rose-600/90 hover:bg-rose-600 backdrop-blur-xl border border-white/20 text-white text-[11px] font-semibold flex items-center gap-1.5 shadow-lg active:scale-95 transition">
        <span class="material-symbols-outlined text-[14px]">key</span>
        <span>Kunci Gemini belum diatur • Ketuk untuk konfigurasi</span>
        <span class="material-symbols-outlined text-[14px]">chevron_right</span>
      </div>
    </div>

    <!-- 3. Live Scanner Viewfinder Frame Area with Corner Brackets & Laser -->
    <main class="relative z-20 flex-1 flex flex-col items-center justify-center px-6 py-2">
      <div class="relative w-full max-w-[340px] aspect-[3/4] max-h-[56vh] flex flex-col justify-between items-center">
        <!-- Corner Bracket Scanning Guides (SVG Glowing Brackets) -->
        <svg class="absolute inset-0 w-full h-full text-indigo-400 pointer-events-none drop-shadow-[0_0_12px_rgba(99,102,241,0.75)]" fill="none" viewBox="0 0 320 400">
          <!-- Top Left -->
          <path d="M 6 42 L 6 16 A 10 10 0 0 1 16 6 L 42 6" stroke="currentColor" stroke-linecap="round" stroke-width="4"></path>
          <!-- Top Right -->
          <path d="M 278 6 L 304 6 A 10 10 0 0 1 314 16 L 314 42" stroke="currentColor" stroke-linecap="round" stroke-width="4"></path>
          <!-- Bottom Left -->
          <path d="M 6 358 L 6 384 A 10 10 0 0 0 16 394 L 42 394" stroke="currentColor" stroke-linecap="round" stroke-width="4"></path>
          <!-- Bottom Right -->
          <path d="M 278 394 L 304 394 A 10 10 0 0 0 314 384 L 314 358" stroke="currentColor" stroke-linecap="round" stroke-width="4"></path>
        </svg>

        <!-- Animated Scanning Laser Beam -->
        <div
          class="absolute left-2 right-2 h-[2px] bg-gradient-to-r from-transparent via-indigo-400 to-transparent opacity-90 shadow-[0_0_18px_6px_rgba(99,102,241,0.85)] z-20 pointer-events-none transition-transform duration-75"
          :style="{ top: laserPos + '%' }"
        ></div>

        <!-- Real-time Detected Pills / Live Status inside scanner frame -->
        <div class="w-full flex flex-col gap-2 p-3 pt-3.5 z-20">
          <div class="flex flex-wrap items-center gap-1.5">
            <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600/90 backdrop-blur-md text-white font-medium text-[11px] shadow-md border border-white/20">
              <span class="material-symbols-outlined text-[13px]">document_scanner</span>
              <span>Pindai Nota / Struk</span>
            </div>
            <div v-if="isScanning" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-600/90 backdrop-blur-md text-white font-medium text-[11px] shadow-md border border-white/20 animate-pulse">
              <span class="material-symbols-outlined text-[13px]">psychology</span>
              <span>Mengekstrak AI...</span>
            </div>
          </div>
        </div>

        <!-- Center Notification when camera fails or is connecting -->
        <div v-if="cameraError" class="z-20 p-3 rounded-2xl bg-black/75 backdrop-blur-xl border border-white/15 flex flex-col items-center gap-2 max-w-[280px] text-center">
          <span class="material-symbols-outlined text-rose-400 text-2xl">videocam_off</span>
          <p class="text-[11px] text-white/90 leading-snug">{{ cameraError }}</p>
          <div class="flex items-center gap-2 pt-1">
            <button
              type="button"
              @click="initCamera"
              class="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold active:scale-95 transition"
            >
              Coba Lagi
            </button>
            <button
              type="button"
              @click="triggerFileInput"
              class="px-3 py-1 rounded-xl bg-white/20 hover:bg-white/30 text-white text-[11px] font-semibold active:scale-95 transition"
            >
              Pilih Foto
            </button>
          </div>
        </div>

        <!-- Center Dynamic Helper Text Tooltip (When camera is fine) -->
        <div v-else class="z-20 mb-3 px-4 py-2 rounded-xl bg-black/65 backdrop-blur-xl border border-white/10 text-center text-white/90 shadow-xl max-w-[280px]">
          <p class="text-xs leading-relaxed font-normal">
            {{ statusText }}
          </p>
        </div>
      </div>

      <!-- Live Lens Indicators (Auto-Focus & Auto-Deskew) -->
      <div class="mt-2 flex items-center justify-center gap-4 text-white/70 text-[11px] tracking-wide">
        <div class="flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span>
          <span>Auto-Focus AI</span>
        </div>
        <span>•</span>
        <div class="flex items-center gap-1">
          <span class="material-symbols-outlined text-[14px]">crop_free</span>
          <span>Auto-Deskew {{ settings.autoDeskew ? 'Aktif' : 'Nonaktif' }}</span>
        </div>
      </div>
    </main>

    <!-- Scan Progress Overlay -->
    <div v-if="isScanning || errorMessage" class="absolute inset-x-4 top-20 z-40 flex justify-center">
      <div class="w-full max-w-xs">
        <ReceiptUploadProgress
          :progress="progressValue"
          :status-text="statusText"
          :error-text="errorMessage"
        />
      </div>
    </div>

    <!-- 4. Bottom Glassmorphic Camera Controls & Status Bar -->
    <footer class="relative z-30 pb-safe pb-4 px-6 flex flex-col items-center gap-3">
      <!-- Camera Controls Bar: Galeri, Giant Shutter, Model AI -->
      <div class="w-full max-w-sm flex items-center justify-between px-4">
        <!-- Gallery Picker Button -->
        <button
          aria-label="Buka Galeri"
          class="flex flex-col items-center gap-1 text-white/80 active:scale-90 transition-transform cursor-pointer group"
          type="button"
          @click="triggerFileInput"
        >
          <div class="w-12 h-12 rounded-full bg-white/15 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-lg group-hover:bg-white/25">
            <span class="material-symbols-outlined text-[24px] text-white">photo_library</span>
          </div>
          <span class="text-[11px] font-medium tracking-tight text-white/90">Galeri</span>
        </button>

        <!-- Thumb-friendly Giant Shutter Button -->
        <button
          aria-label="Ambil Foto Struk"
          class="relative group flex items-center justify-center active:scale-95 transition-transform duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          type="button"
          @click="capturePhoto"
          :disabled="isScanning"
        >
          <!-- Ambient Glowing Aura -->
          <div class="absolute inset-0 rounded-full bg-indigo-500 blur-xl opacity-75 group-hover:opacity-100 transition-opacity"></div>
          <!-- Outer Glowing Ring -->
          <div class="w-20 h-20 rounded-full p-1 border-2 border-white/80 backdrop-blur-sm flex items-center justify-center shadow-2xl">
            <!-- Inner Pure White Shutter Disk -->
            <div class="w-full h-full rounded-full bg-white text-indigo-600 flex items-center justify-center shadow-inner active:scale-90 transition-transform">
              <span class="material-symbols-outlined text-[30px] text-indigo-600">photo_camera</span>
            </div>
          </div>
        </button>

        <!-- AI Mode / Model Switcher Button -->
        <button
          aria-label="Pengaturan Model AI"
          class="flex flex-col items-center gap-1 text-white/80 active:scale-90 transition-transform cursor-pointer group"
          type="button"
          @click="isModelSheetOpen = true"
        >
          <div class="w-12 h-12 rounded-full bg-white/15 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-lg group-hover:bg-white/25">
            <span class="material-symbols-outlined text-[24px] text-white">tune</span>
          </div>
          <span class="text-[11px] font-medium tracking-tight text-white/90">Model AI</span>
        </button>
      </div>

      <!-- Quick Pill Security Status at Very Bottom -->
      <div class="flex items-center gap-2 px-3 py-1 rounded-full bg-black/45 backdrop-blur-md border border-white/10 text-white/75 text-[11px] font-medium tracking-wide">
        <span class="w-1.5 h-1.5 rounded-full" :class="hasKey ? 'bg-emerald-400' : 'bg-rose-400'"></span>
        <span>{{ hasKey ? 'BYOK Aktif' : 'API Key Belum Diatur' }}</span>
        <span class="text-white/30">•</span>
        <span class="flex items-center gap-1">
          <span class="material-symbols-outlined text-[12px] text-indigo-300">lock</span>
          <span>Enkripsi AES-256</span>
        </span>
      </div>
    </footer>

    <!-- AI Model Settings Bottom Sheet -->
    <AiModelSettingsSheet
      :is-open="isModelSheetOpen"
      @close="isModelSheetOpen = false"
    />
  </div>
</template>

<style scoped>
.kamera-root {
  height: 100dvh;
  width: 100vw;
  background-color: #000000;
  position: relative;
  overflow: hidden;
}

.camera-feed {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 1;
}
</style>
