import { ref, computed } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'system'

const THEME_STORAGE_KEY = 'couplecash-theme'

// Shared reactive state across components
const themeMode = ref<ThemeMode>('system')
const isDark = ref(false)
let isInitialized = false
let mediaQueryList: MediaQueryList | null = null

function updateDomTheme(dark: boolean) {
  if (typeof document === 'undefined') return
  const html = document.documentElement
  if (dark) {
    html.classList.add('dark')
    html.setAttribute('data-theme', 'dark')
  } else {
    html.classList.remove('dark')
    html.setAttribute('data-theme', 'light')
  }
}

function computeIsDark(mode: ThemeMode): boolean {
  if (mode === 'dark') return true
  if (mode === 'light') return false
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  return false
}

function applyTheme(mode: ThemeMode) {
  themeMode.value = mode
  const dark = computeIsDark(mode)
  isDark.value = dark
  updateDomTheme(dark)

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode)
    } catch {}
  }
}

export function useTheme() {
  function initTheme() {
    if (typeof window === 'undefined') return

    let savedMode: ThemeMode = 'system'
    try {
      const item = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null
      if (item === 'light' || item === 'dark' || item === 'system') {
        savedMode = item
      }
    } catch {}

    applyTheme(savedMode)

    if (!isInitialized) {
      isInitialized = true
      if (window.matchMedia) {
        mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)')
        mediaQueryList.addEventListener('change', (e) => {
          if (themeMode.value === 'system') {
            isDark.value = e.matches
            updateDomTheme(e.matches)
          }
        })
      }
    }
  }

  function setTheme(mode: ThemeMode) {
    applyTheme(mode)
  }

  function toggleTheme() {
    const next = isDark.value ? 'light' : 'dark'
    setTheme(next)
  }

  return {
    themeMode,
    isDark,
    setTheme,
    toggleTheme,
    initTheme,
  }
}
