import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import { i18nextPlugin } from 'translation-check'
import en from './locales/en.ts'
import vi from './locales/vi.ts'

export const locales = {
  en: 'English',
  vi: 'Vietnamese',
}

export const defaultNS = 'translation'

export const resources = {
  en: {
    translation: en,
  },
  vi: {
    translation: vi,
  },
}

i18n
  .use(i18nextPlugin)
  .use(LanguageDetector)
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources,
    defaultNS,
    fallbackLng: 'en',
    keySeparator: false,
    returnObjects: false,
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  })

export default i18n
