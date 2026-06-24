import {
  COMMON_THEME_STYLE_KEYS,
  THEME_STYLE_KEYS,
  type ThemeMode,
  type ThemeStyleKey,
  type ThemeStyles,
} from './default-theme'

export const colorTokenGroups: {
  title: string
  keys: ThemeStyleKey[]
}[] = [
  {
    title: 'Base',
    keys: [
      'background',
      'foreground',
      'card',
      'card-foreground',
      'popover',
      'popover-foreground',
      'border',
      'input',
      'ring',
    ],
  },
  {
    title: 'Semantic',
    keys: [
      'primary',
      'primary-foreground',
      'secondary',
      'secondary-foreground',
      'muted',
      'muted-foreground',
      'accent',
      'accent-foreground',
      'destructive',
    ],
  },
  {
    title: 'Charts',
    keys: ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5'],
  },
  {
    title: 'Sidebar',
    keys: [
      'sidebar',
      'sidebar-foreground',
      'sidebar-primary',
      'sidebar-primary-foreground',
      'sidebar-accent',
      'sidebar-accent-foreground',
      'sidebar-border',
      'sidebar-ring',
    ],
  },
]

export function normalizeThemeStyles(styles: ThemeStyles): ThemeStyles {
  return {
    light: { ...styles.light },
    dark: { ...styles.dark },
  }
}

export function setThemeStyleValue(
  styles: ThemeStyles,
  mode: ThemeMode,
  key: ThemeStyleKey,
  value: string
): ThemeStyles {
  const next = normalizeThemeStyles(styles)

  if (COMMON_THEME_STYLE_KEYS.includes(key)) {
    next.light[key] = value
    next.dark[key] = value
    return next
  }

  next[mode][key] = value
  return next
}

function blockForMode(styles: ThemeStyles, mode: ThemeMode) {
  const selector = mode === 'dark' ? '.dark' : ':root'
  const tokens = THEME_STYLE_KEYS.map(
    (key) => `  --${key}: ${styles[mode][key]};`
  ).join('\n')

  return `${selector} {\n${tokens}\n}`
}

export function generateThemeCss(styles: ThemeStyles) {
  return `${blockForMode(styles, 'light')}\n\n${blockForMode(styles, 'dark')}`
}

export function applyThemeStylesToElement(
  element: HTMLElement,
  styles: ThemeStyles,
  mode: ThemeMode
) {
  element.classList.remove('light', 'dark')
  element.classList.add(mode)

  THEME_STYLE_KEYS.forEach((key) => {
    element.style.setProperty(`--${key}`, styles[mode][key])
  })
}

export function parseThemeCss(
  input: string,
  fallback: ThemeStyles
): ThemeStyles {
  const next = normalizeThemeStyles(fallback)

  ;(['light', 'dark'] as ThemeMode[]).forEach((mode) => {
    const selector = mode === 'dark' ? '.dark' : ':root'
    const content = input.match(
      new RegExp(`${selector.replace('.', '\\.')}\\s*{([^}]+)}`, 'm')
    )?.[1]

    if (!content) return

    const declarations = content.match(/--[^:]+:\s*[^;]+/g) ?? []

    declarations.forEach((declaration) => {
      const [name, value] = declaration.split(':').map((part) => part.trim())
      const key = name.replace('--', '') as ThemeStyleKey

      if (THEME_STYLE_KEYS.includes(key)) {
        next[mode][key] = value
      }
    })
  })

  return next
}

export function downloadThemeJson(theme: unknown, fileName = 'theme.json') {
  const blob = new Blob([JSON.stringify(theme, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}
