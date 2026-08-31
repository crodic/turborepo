import { createContext, useContext, useEffect, useState, useMemo } from 'react'
import { getCookie, setCookie, removeCookie } from '@/lib/cookies'
import { applyPersonalFontPreference } from '@/lib/personal-font'
import {
  applyRuntimeThemeStyles,
  ensureThemeCacheVersion,
  fetchRuntimeTheme,
  getCachedRuntimeTheme,
  hasPersonalThemeColor,
  initThemeSyncListener,
  PERSONAL_THEME_COLOR_STORAGE_KEY,
  clearRuntimeThemeStyles,
} from '@/lib/runtime-theme/runtime-theme'
import { themeColors } from '@/lib/theme-colors'

type Theme = 'dark' | 'light' | 'system'
type ResolvedTheme = Exclude<Theme, 'system'>
type ColorKey = keyof typeof themeColors

const DEFAULT_THEME: Theme = 'system'
const DEFAULT_COLOR = Object.keys(themeColors)[0] as ColorKey
const THEME_COOKIE_NAME = 'vite-ui-theme'
const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

const WHITE_LABEL_ENABLED_STORAGE_KEY = 'vite-ui-white-label-enabled'

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
  isWhiteLabelEnabled: boolean
  setTheme: (theme: Theme) => void
  setColorKey: (color: ColorKey) => void
  clearPersonalColor: () => void
  setWhiteLabelEnabled: (enabled: boolean) => void
  resetTheme: () => void
}

const ThemeContext = createContext<ThemeProviderState | null>(null)

export function ThemeProvider({
  children,
  defaultTheme = DEFAULT_THEME,
  defaultColor = DEFAULT_COLOR,
  storageKey = THEME_COOKIE_NAME,
}: ThemeProviderProps) {
  // Ensure version integrity on init
  ensureThemeCacheVersion()

  const [theme, _setTheme] = useState<Theme>(
    () => (getCookie(storageKey) as Theme) || defaultTheme
  )
  const [colorKey, _setColorKey] = useState<ColorKey>(() => {
    const storedColor = localStorage.getItem(PERSONAL_THEME_COLOR_STORAGE_KEY)
    return storedColor && storedColor in themeColors
      ? (storedColor as ColorKey)
      : defaultColor
  })
  const [hasPersonalColor, setHasPersonalColor] = useState(() =>
    hasPersonalThemeColor()
  )
  const [isWhiteLabelEnabled, _setIsWhiteLabelEnabled] = useState<boolean>(
    () => {
      const stored = localStorage.getItem(WHITE_LABEL_ENABLED_STORAGE_KEY)
      if (stored !== null) return stored === 'true'
      return !hasPersonalThemeColor()
    }
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

  // ✅ Cross-tab synchronization
  useEffect(() => {
    return initThemeSyncListener((updatedTheme) => {
      if (isWhiteLabelEnabled && updatedTheme?.styles) {
        applyRuntimeThemeStyles(updatedTheme.styles, resolvedTheme)
      }
    })
  }, [isWhiteLabelEnabled, resolvedTheme])

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

    const cachedRuntimeTheme = isWhiteLabelEnabled
      ? getCachedRuntimeTheme()
      : null

    if (isWhiteLabelEnabled && cachedRuntimeTheme?.styles) {
      applyRuntimeThemeStyles(cachedRuntimeTheme.styles, resolvedTheme)
    } else {
      applyStaticTheme(resolvedTheme)
    }

    if (isWhiteLabelEnabled) {
      fetchRuntimeTheme()
        .then((runtimeTheme) => {
          if (runtimeTheme?.styles) {
            applyRuntimeThemeStyles(runtimeTheme.styles, resolvedTheme)
          } else {
            clearRuntimeThemeStyles()
            applyStaticTheme(resolvedTheme)
          }
        })
        .catch(() => undefined)
    } else {
      clearRuntimeThemeStyles()
      applyStaticTheme(resolvedTheme)
    }

    const handleChange = () => {
      if (theme === 'system') {
        const systemTheme = mediaQuery.matches ? 'dark' : 'light'
        root.classList.remove('light', 'dark')
        root.classList.add(systemTheme)
        const runtimeTheme = isWhiteLabelEnabled
          ? getCachedRuntimeTheme()
          : null
        if (isWhiteLabelEnabled && runtimeTheme?.styles) {
          applyRuntimeThemeStyles(runtimeTheme.styles, systemTheme)
        } else {
          applyStaticTheme(systemTheme)
        }
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme, colorKey, resolvedTheme, isWhiteLabelEnabled])

  const setTheme = (t: Theme) => {
    setCookie(storageKey, t, THEME_COOKIE_MAX_AGE)
    _setTheme(t)
  }

  const setColorKey = (key: ColorKey) => {
    _setColorKey(key)
    localStorage.setItem(PERSONAL_THEME_COLOR_STORAGE_KEY, key)
    localStorage.setItem(WHITE_LABEL_ENABLED_STORAGE_KEY, 'false')
    _setIsWhiteLabelEnabled(false)
    setHasPersonalColor(true)
  }

  const clearPersonalColor = () => {
    localStorage.removeItem(PERSONAL_THEME_COLOR_STORAGE_KEY)
    _setColorKey(DEFAULT_COLOR)
    setHasPersonalColor(false)
    localStorage.setItem(WHITE_LABEL_ENABLED_STORAGE_KEY, 'true')
    _setIsWhiteLabelEnabled(true)
  }

  const setWhiteLabelEnabled = (enabled: boolean) => {
    _setIsWhiteLabelEnabled(enabled)
    localStorage.setItem(WHITE_LABEL_ENABLED_STORAGE_KEY, String(enabled))
    if (enabled) {
      localStorage.removeItem(PERSONAL_THEME_COLOR_STORAGE_KEY)
      setHasPersonalColor(false)
    }
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
        isWhiteLabelEnabled,
        setTheme,
        setColorKey,
        clearPersonalColor,
        setWhiteLabelEnabled,
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
