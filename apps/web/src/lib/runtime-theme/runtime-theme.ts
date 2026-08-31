import { applyPersonalFontPreference } from '@/lib/personal-font'
import type { ThemeMode, ThemeStyles } from '@/lib/theme-builder/default-theme'
import { THEME_STYLE_KEYS } from '@/lib/theme-builder/default-theme'

export const THEME_CACHE_VERSION = 'v2.2.0'
export const THEME_VERSION_STORAGE_KEY = 'theme-cache-version'
export const RUNTIME_THEME_STORAGE_KEY = 'runtime-theme:admin'
export const ADMIN_RUNTIME_THEME_STORAGE_KEY = 'runtime-theme:admin'
export const PERSONAL_THEME_COLOR_STORAGE_KEY = 'theme-color'
export const WHITE_LABEL_ACTIVE_STORAGE_KEY = 'active-white-label:admin'

export type RuntimeTheme = {
  id: string
  styles: ThemeStyles
  updatedAt?: string
}

export function isRuntimeTheme(value: unknown): value is RuntimeTheme {
  if (!value || typeof value !== 'object') return false

  const theme = value as RuntimeTheme

  return ['light', 'dark'].every((mode) => {
    const styles = theme.styles?.[mode as ThemeMode]

    return (
      !!styles &&
      typeof styles === 'object' &&
      THEME_STYLE_KEYS.every(
        (key) => typeof styles[key] === 'string' && styles[key].length > 0
      )
    )
  })
}

export function ensureThemeCacheVersion() {
  try {
    const currentVersion = localStorage.getItem(THEME_VERSION_STORAGE_KEY)
    if (currentVersion !== THEME_CACHE_VERSION) {
      localStorage.removeItem(ADMIN_RUNTIME_THEME_STORAGE_KEY)
      localStorage.removeItem('runtime-theme:current')
      localStorage.removeItem(WHITE_LABEL_ACTIVE_STORAGE_KEY)
      localStorage.removeItem('active-white-label')
      localStorage.setItem(THEME_VERSION_STORAGE_KEY, THEME_CACHE_VERSION)
    }
  } catch {
    // Ignore localStorage access errors gracefully in private mode
    void 0
  }
}

function extractFontFamily(fontFamilyValue: string) {
  const firstFont = fontFamilyValue.split(',')[0]?.trim().replace(/['"]/g, '')
  if (!firstFont) return null

  const systemFonts = [
    'ui-sans-serif',
    'ui-serif',
    'ui-monospace',
    'system-ui',
    'sans-serif',
    'serif',
    'monospace',
    'cursive',
    'fantasy',
  ]

  return systemFonts.includes(firstFont.toLowerCase()) ? null : firstFont
}

function loadGoogleFont(fontFamily: string) {
  const family = extractFontFamily(fontFamily)
  if (!family) return

  const href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
    family
  )}:wght@400;500;600;700&display=swap`

  if (document.querySelector(`link[href="${href}"]`)) return

  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = href
  document.head.appendChild(link)
}

function loadThemeFonts(styles: ThemeStyles, mode: ThemeMode) {
  ;(['font-sans', 'font-serif', 'font-mono'] as const).forEach((key) => {
    loadGoogleFont(styles[mode][key])
  })
}

export function getCachedRuntimeTheme(): RuntimeTheme | null {
  ensureThemeCacheVersion()
  try {
    const raw = localStorage.getItem(ADMIN_RUNTIME_THEME_STORAGE_KEY)
    const theme = raw ? JSON.parse(raw) : null

    if (!theme) return null
    if (isRuntimeTheme(theme)) return theme

    clearCachedRuntimeTheme()
    return null
  } catch {
    clearCachedRuntimeTheme()
    return null
  }
}

export function setCachedRuntimeTheme(theme: RuntimeTheme | null) {
  if (!theme) {
    clearCachedRuntimeTheme()
    return
  }

  localStorage.setItem(ADMIN_RUNTIME_THEME_STORAGE_KEY, JSON.stringify(theme))
  localStorage.setItem(THEME_VERSION_STORAGE_KEY, THEME_CACHE_VERSION)
}

export function clearCachedRuntimeTheme() {
  localStorage.removeItem(ADMIN_RUNTIME_THEME_STORAGE_KEY)
  localStorage.removeItem('runtime-theme:current')
}

export function applyRuntimeThemeStyles(styles: ThemeStyles, mode: ThemeMode) {
  loadThemeFonts(styles, mode)
  const root = document.documentElement
  THEME_STYLE_KEYS.forEach((key) => {
    root.style.setProperty(`--${key}`, styles[mode][key])
  })
  root.style.fontFamily = styles[mode]['font-sans']
}

export function applyRuntimeThemeFont(styles: ThemeStyles, mode: ThemeMode) {
  loadThemeFonts(styles, mode)
  const root = document.documentElement
  root.style.setProperty('--font-sans', styles[mode]['font-sans'])
  root.style.setProperty('--font-serif', styles[mode]['font-serif'])
  root.style.setProperty('--font-mono', styles[mode]['font-mono'])
  root.style.fontFamily = styles[mode]['font-sans']
}

export function clearRuntimeThemeStyles() {
  const root = document.documentElement
  THEME_STYLE_KEYS.forEach((key) => {
    root.style.removeProperty(`--${key}`)
  })
  applyPersonalFontPreference()
}

export function getCurrentThemeMode(): ThemeMode {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export function applyRuntimeTheme(theme: RuntimeTheme | null) {
  if (!theme?.styles) return
  applyRuntimeThemeStyles(theme.styles, getCurrentThemeMode())
}

export function hasPersonalThemeColor() {
  return localStorage.getItem(PERSONAL_THEME_COLOR_STORAGE_KEY) !== null
}

export async function fetchRuntimeTheme(): Promise<RuntimeTheme | null> {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/white-labels/active?target=admin`,
      {
        credentials: 'include',
      }
    )

    if (!response.ok) return null
    const theme = (await response.json()) as RuntimeTheme | null
    if (isRuntimeTheme(theme)) {
      setCachedRuntimeTheme(theme)
      return theme
    }
    return null
  } catch {
    return null
  }
}

export function initThemeSyncListener(
  onThemeChange: (theme: RuntimeTheme | null) => void
) {
  const handler = (event: StorageEvent) => {
    if (
      event.key === ADMIN_RUNTIME_THEME_STORAGE_KEY ||
      event.key === THEME_VERSION_STORAGE_KEY ||
      event.key === 'vite-ui-white-label-enabled'
    ) {
      const updatedTheme = getCachedRuntimeTheme()
      onThemeChange(updatedTheme)
    }
  }

  window.addEventListener('storage', handler)
  return () => window.removeEventListener('storage', handler)
}
