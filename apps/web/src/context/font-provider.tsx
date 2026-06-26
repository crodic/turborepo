import { createContext, useContext, useEffect, useState } from 'react'
import type { fonts } from '@/config/fonts'
import { setCookie, removeCookie } from '@/lib/cookies'
import {
  applyPersonalFontPreference,
  clearPersonalFontPreference,
  DYNAMIC_THEME_FONT,
  FONT_COOKIE_NAME,
  getSavedPersonalFont,
} from '@/lib/personal-font'
import {
  applyRuntimeThemeFont,
  getCachedRuntimeTheme,
  getCurrentThemeMode,
  IS_ADMIN_RUNTIME_THEME_ENABLED,
} from '@/lib/runtime-theme/runtime-theme'

type Font = (typeof fonts)[number]

const FONT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

type FontContextType = {
  font: Font
  setFont: (font: Font) => void
  resetFont: () => void
}

const FontContext = createContext<FontContextType | null>(null)

export function FontProvider({ children }: { children: React.ReactNode }) {
  const [font, _setFont] = useState<Font>(() => getSavedPersonalFont())

  useEffect(() => {
    if (font === DYNAMIC_THEME_FONT) {
      clearPersonalFontPreference()
      const runtimeTheme = IS_ADMIN_RUNTIME_THEME_ENABLED
        ? getCachedRuntimeTheme()
        : null

      if (runtimeTheme?.styles) {
        applyRuntimeThemeFont(runtimeTheme.styles, getCurrentThemeMode())
      }

      return
    }

    applyPersonalFontPreference(font)
  }, [font])

  const setFont = (font: Font) => {
    if (font === DYNAMIC_THEME_FONT) {
      resetFont()
      return
    }

    setCookie(FONT_COOKIE_NAME, font, FONT_COOKIE_MAX_AGE)
    _setFont(font)
  }

  const resetFont = () => {
    removeCookie(FONT_COOKIE_NAME)
    _setFont(DYNAMIC_THEME_FONT)
  }

  return (
    <FontContext value={{ font, setFont, resetFont }}>{children}</FontContext>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useFont = () => {
  const context = useContext(FontContext)
  if (!context) {
    throw new Error('useFont must be used within a FontProvider')
  }
  return context
}
