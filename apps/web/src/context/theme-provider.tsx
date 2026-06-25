import { createContext, useContext, useEffect, useState, useMemo } from 'react'
import { getCookie, setCookie, removeCookie } from '@/lib/cookies'
import {
  applyRuntimeThemeStyles,
  clearRuntimeThemeStyles,
  fetchRuntimeTheme,
  getCachedRuntimeTheme,
  IS_ADMIN_RUNTIME_THEME_ENABLED,
  setCachedRuntimeTheme,
} from '@/lib/runtime-theme/runtime-theme'
import { themeColors } from '@/lib/theme-colors'

type Theme = 'dark' | 'light' | 'system'
type ResolvedTheme = Exclude<Theme, 'system'>
type ColorKey = keyof typeof themeColors

const DEFAULT_THEME: Theme = 'system'
const DEFAULT_COLOR: ColorKey = 'blue'
const THEME_COOKIE_NAME = 'vite-ui-theme'
const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  defaultColor?: ColorKey
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  resolvedTheme: ResolvedTheme
  defaultTheme: Theme
  colorKey: ColorKey
  setTheme: (theme: Theme) => void
  setColorKey: (color: ColorKey) => void
  resetTheme: () => void
}

const ThemeContext = createContext<ThemeProviderState | null>(null)

export function ThemeProvider({
  children,
  defaultTheme = DEFAULT_THEME,
  defaultColor = DEFAULT_COLOR,
  storageKey = THEME_COOKIE_NAME,
}: ThemeProviderProps) {
  const [theme, _setTheme] = useState<Theme>(
    () => (getCookie(storageKey) as Theme) || defaultTheme
  )
  const [colorKey, _setColorKey] = useState<ColorKey>(() => {
    return (
      (localStorage.getItem('theme-color') as ColorKey | null) || defaultColor
    )
  })

  // ✅ Resolve dark/light from system or user
  const resolvedTheme = useMemo<ResolvedTheme>(() => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
    }
    return theme as ResolvedTheme
  }, [theme])

  // ✅ Apply class + theme variables
  useEffect(() => {
    const root = document.documentElement
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const applyStaticTheme = (mode: ResolvedTheme) => {
      Object.entries(themeColors[colorKey][mode]).forEach(([key, value]) => {
        root.style.setProperty(key, value)
      })
    }

    // Apply dark/light class
    root.classList.remove('light', 'dark')
    root.classList.add(resolvedTheme)

    applyStaticTheme(resolvedTheme)

    const cachedRuntimeTheme = IS_ADMIN_RUNTIME_THEME_ENABLED
      ? getCachedRuntimeTheme()
      : null

    if (IS_ADMIN_RUNTIME_THEME_ENABLED && cachedRuntimeTheme?.styles) {
      applyRuntimeThemeStyles(cachedRuntimeTheme.styles, resolvedTheme)
    }

    if (IS_ADMIN_RUNTIME_THEME_ENABLED) {
      fetchRuntimeTheme()
        .then((runtimeTheme) => {
          setCachedRuntimeTheme(runtimeTheme)
          if (runtimeTheme?.styles) {
            applyRuntimeThemeStyles(runtimeTheme.styles, resolvedTheme)
          } else {
            clearRuntimeThemeStyles()
            applyStaticTheme(resolvedTheme)
          }
        })
        .catch(() => undefined)
    } else {
      setCachedRuntimeTheme(null)
    }

    const handleChange = () => {
      if (theme === 'system') {
        const systemTheme = mediaQuery.matches ? 'dark' : 'light'
        root.classList.remove('light', 'dark')
        root.classList.add(systemTheme)
        applyStaticTheme(systemTheme)
        const runtimeTheme = IS_ADMIN_RUNTIME_THEME_ENABLED
          ? getCachedRuntimeTheme()
          : null
        if (IS_ADMIN_RUNTIME_THEME_ENABLED && runtimeTheme?.styles) {
          applyRuntimeThemeStyles(runtimeTheme.styles, systemTheme)
        }
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme, colorKey, resolvedTheme])

  const setTheme = (t: Theme) => {
    setCookie(storageKey, t, THEME_COOKIE_MAX_AGE)
    _setTheme(t)
  }

  const setColorKey = (key: ColorKey) => {
    _setColorKey(key)
    localStorage.setItem('theme-color', key)
  }

  const resetTheme = () => {
    removeCookie(storageKey)
    localStorage.removeItem('theme-color')
    _setTheme(DEFAULT_THEME)
    _setColorKey(DEFAULT_COLOR)
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        defaultTheme,
        colorKey,
        setTheme,
        setColorKey,
        resetTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
