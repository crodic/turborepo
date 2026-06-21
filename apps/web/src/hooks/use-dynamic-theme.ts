import { useEffect } from 'react'
import { themeColors } from '@/lib/theme-colors'

export function useDynamicTheme(colorKey: keyof typeof themeColors) {
  useEffect(() => {
    if (!colorKey) return

    const root = document.documentElement
    const darkRoot = document.querySelector('.dark') as HTMLElement | null
    const theme = themeColors[colorKey]

    if (theme?.light) {
      Object.entries(theme.light).forEach(([key, value]) => {
        root.style.setProperty(key, value)
      })
    }

    if (darkRoot && theme?.dark) {
      Object.entries(theme.dark).forEach(([key, value]) => {
        darkRoot.style.setProperty(key, value)
      })
    }

    localStorage.setItem('theme-color', colorKey)
  }, [colorKey])
}
