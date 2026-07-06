import { applyPersonalFontPreference } from '@/lib/personal-font'
import type { ThemeMode, ThemeStyles } from '@/lib/theme-builder/default-theme'
import { THEME_STYLE_KEYS } from '@/lib/theme-builder/default-theme'
import { IS_ADMIN_RUNTIME_THEME_ENABLED } from '../feature-flags'

export { IS_ADMIN_RUNTIME_THEME_ENABLED } from '../feature-flags'

export const RUNTIME_THEME_STORAGE_KEY = 'runtime-theme:current'
const ADMIN_RUNTIME_THEME_STORAGE_KEY = 'runtime-theme:admin'
export const PERSONAL_THEME_COLOR_STORAGE_KEY = 'theme-color'

type RuntimeTheme = {
  id: string
  styles: ThemeStyles
  updatedAt?: string
}

function isRuntimeTheme(value: unknown): value is RuntimeTheme {
  if (!value || typeof value !== 'object') return false

  const theme = value as RuntimeTheme

  return ['light', 'dark'].every((mode) => {
    const styles = theme.styles?.[mode as ThemeMode]

    return (
      !!styles &&
      typeof styles === 'object' &&
      THEME_STYLE_KEYS.every((key) => typeof styles[key] === 'string')
    )
  })
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
  if (!IS_ADMIN_RUNTIME_THEME_ENABLED) {
    clearCachedRuntimeTheme()
    return null
  }

  try {
    const raw =
      localStorage.getItem(ADMIN_RUNTIME_THEME_STORAGE_KEY) ??
      localStorage.getItem(RUNTIME_THEME_STORAGE_KEY)
    const theme = raw ? JSON.parse(raw) : null

    if (!theme) return null
    if (isRuntimeTheme(theme)) return theme

    localStorage.removeItem(RUNTIME_THEME_STORAGE_KEY)
    return null
  } catch {
    localStorage.removeItem(RUNTIME_THEME_STORAGE_KEY)
    return null
  }
}

export function setCachedRuntimeTheme(theme: RuntimeTheme | null) {
  if (!theme) {
    clearCachedRuntimeTheme()
    return
  }

  localStorage.setItem(ADMIN_RUNTIME_THEME_STORAGE_KEY, JSON.stringify(theme))
  localStorage.removeItem(RUNTIME_THEME_STORAGE_KEY)
}

export function clearCachedRuntimeTheme() {
  localStorage.removeItem(ADMIN_RUNTIME_THEME_STORAGE_KEY)
  localStorage.removeItem(RUNTIME_THEME_STORAGE_KEY)
}

export function applyRuntimeThemeStyles(styles: ThemeStyles, mode: ThemeMode) {
  const root = document.documentElement

  loadThemeFonts(styles, mode)

  THEME_STYLE_KEYS.forEach((key) => {
    root.style.setProperty(`--${key}`, styles[mode][key])
  })

  applyPersonalFontPreference()
}

export function applyRuntimeThemeFont(styles: ThemeStyles, mode: ThemeMode) {
  loadGoogleFont(styles[mode]['font-sans'])
  document.documentElement.style.setProperty(
    '--font-sans',
    styles[mode]['font-sans']
  )
}

export function clearRuntimeThemeStyles() {
  const root = document.documentElement

  THEME_STYLE_KEYS.forEach((key) => {
    root.style.removeProperty(`--${key}`)
  })
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

export async function fetchRuntimeTheme() {
  if (!IS_ADMIN_RUNTIME_THEME_ENABLED) return null

  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/themes/runtime/current?target=admin`,
    {
      credentials: 'include',
    }
  )

  if (!response.ok) return null
  const theme = (await response.json()) as RuntimeTheme | null
  return isRuntimeTheme(theme) ? theme : null
}
