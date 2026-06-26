import { fonts } from '@/config/fonts'
import { getCookie } from '@/lib/cookies'

export type PersonalFont = (typeof fonts)[number]

export const FONT_COOKIE_NAME = 'font'
export const DYNAMIC_THEME_FONT = 'dynamic' satisfies PersonalFont

export const personalFontFamilies: Partial<Record<PersonalFont, string>> = {
  inter: "'Inter', ui-sans-serif, system-ui, sans-serif",
  manrope: "'Manrope', ui-sans-serif, system-ui, sans-serif",
  system:
    "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
}

export function getSavedPersonalFont() {
  const savedFont = getCookie(FONT_COOKIE_NAME)
  return fonts.includes(savedFont as PersonalFont)
    ? (savedFont as PersonalFont)
    : DYNAMIC_THEME_FONT
}

export function applyPersonalFontPreference(font = getSavedPersonalFont()) {
  const fontFamily = personalFontFamilies[font]

  if (!fontFamily) return

  document.documentElement.style.setProperty('--font-sans', fontFamily)
}

export function clearPersonalFontPreference() {
  document.documentElement.style.removeProperty('--font-sans')
}
