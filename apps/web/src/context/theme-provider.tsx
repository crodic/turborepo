import { createContext, useContext, useEffect, useState, useMemo } from 'react'
import { getCookie, setCookie, removeCookie } from '@/lib/cookies'
import { applyPersonalFontPreference } from '@/lib/personal-font'
import {
  applyRuntimeThemeStyles,
  fetchRuntimeTheme,
  getCachedRuntimeTheme,
  hasPersonalThemeColor,
  IS_RUNTIME_THEME_ENABLED,
  PERSONAL_THEME_COLOR_STORAGE_KEY,
  setCachedRuntimeTheme,
} from '@/lib/runtime-theme/runtime-theme'
import { themeColors } from '@/lib/theme-colors'

type Theme = 'dark' | 'light' | 'system'
type ResolvedTheme = Exclude<Theme, 'system'>
type ColorKey = keyof typeof themeColors

const DEFAULT_THEME: Theme = 'system'
const DEFAULT_COLOR = Object.keys(themeColors)[0] as ColorKey
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
  hasPersonalColor: boolean
  setTheme: (theme: Theme) => void
  setColorKey: (color: ColorKey) => void
  clearPersonalColor: () => void
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
    const storedColor = localStorage.getItem(PERSONAL_THEME_COLOR_STORAGE_KEY)
    return storedColor && storedColor in themeColors
      ? (storedColor as ColorKey)
      : defaultColor
  })
  const [hasPersonalColor, setHasPersonalColor] = useState(
    () => !IS_RUNTIME_THEME_ENABLED || hasPersonalThemeColor()
  )

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
      applyPersonalFontPreference()
    }

    // Apply dark/light class
    root.classList.remove('light', 'dark')
    root.classList.add(resolvedTheme)

    const cachedRuntimeTheme = IS_RUNTIME_THEME_ENABLED
      ? getCachedRuntimeTheme()
      : null
    const shouldUsePersonalTheme = !IS_RUNTIME_THEME_ENABLED || hasPersonalColor

    if (
      IS_RUNTIME_THEME_ENABLED &&
      cachedRuntimeTheme?.styles &&
      !shouldUsePersonalTheme
    ) {
      applyRuntimeThemeStyles(cachedRuntimeTheme.styles, resolvedTheme)
    } else {
      applyStaticTheme(resolvedTheme)
    }

    if (IS_RUNTIME_THEME_ENABLED) {
      fetchRuntimeTheme()
        .then((runtimeTheme) => {
          setCachedRuntimeTheme(runtimeTheme)
          if (runtimeTheme?.styles && !shouldUsePersonalTheme) {
            applyRuntimeThemeStyles(runtimeTheme.styles, resolvedTheme)
          } else {
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
        const runtimeTheme = IS_RUNTIME_THEME_ENABLED
          ? getCachedRuntimeTheme()
          : null
        if (
          IS_RUNTIME_THEME_ENABLED &&
          runtimeTheme?.styles &&
          !shouldUsePersonalTheme
        ) {
          applyRuntimeThemeStyles(runtimeTheme.styles, systemTheme)
        } else {
          applyStaticTheme(systemTheme)
        }
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme, colorKey, resolvedTheme, hasPersonalColor])

  const setTheme = (t: Theme) => {
    setCookie(storageKey, t, THEME_COOKIE_MAX_AGE)
    _setTheme(t)
  }

  const setColorKey = (key: ColorKey) => {
    _setColorKey(key)
    localStorage.setItem(PERSONAL_THEME_COLOR_STORAGE_KEY, key)
    setHasPersonalColor(true)
  }

  const clearPersonalColor = () => {
    if (!IS_RUNTIME_THEME_ENABLED) {
      localStorage.setItem(PERSONAL_THEME_COLOR_STORAGE_KEY, DEFAULT_COLOR)
      _setColorKey(DEFAULT_COLOR)
      setHasPersonalColor(true)
      return
    }

    localStorage.removeItem(PERSONAL_THEME_COLOR_STORAGE_KEY)
    _setColorKey(DEFAULT_COLOR)
    setHasPersonalColor(false)
  }

  const resetTheme = () => {
    removeCookie(storageKey)
    clearPersonalColor()
    _setTheme(DEFAULT_THEME)
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        defaultTheme,
        colorKey,
        hasPersonalColor,
        setTheme,
        setColorKey,
        clearPersonalColor,
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
