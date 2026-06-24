import type { ThemeMode, ThemeStyles } from '@/lib/theme-builder/default-theme'
import { THEME_STYLE_KEYS } from '@/lib/theme-builder/default-theme'

export const RUNTIME_THEME_STORAGE_KEY = 'runtime-theme:current'
const ADMIN_RUNTIME_THEME_STORAGE_KEY = 'runtime-theme:admin'

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

export function getCachedRuntimeTheme(): RuntimeTheme | null {
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
    localStorage.removeItem(ADMIN_RUNTIME_THEME_STORAGE_KEY)
    localStorage.removeItem(RUNTIME_THEME_STORAGE_KEY)
    return
  }

  localStorage.setItem(ADMIN_RUNTIME_THEME_STORAGE_KEY, JSON.stringify(theme))
  localStorage.removeItem(RUNTIME_THEME_STORAGE_KEY)
}

export function applyRuntimeThemeStyles(styles: ThemeStyles, mode: ThemeMode) {
  const root = document.documentElement

  THEME_STYLE_KEYS.forEach((key) => {
    root.style.setProperty(`--${key}`, styles[mode][key])
  })
}

export function getCurrentThemeMode(): ThemeMode {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export function applyRuntimeTheme(theme: RuntimeTheme | null) {
  if (!theme?.styles) return
  applyRuntimeThemeStyles(theme.styles, getCurrentThemeMode())
}

export async function fetchRuntimeTheme() {
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
