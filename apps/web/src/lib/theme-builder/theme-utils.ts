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
  fallback: ThemeStyles,
  targetMode?: ThemeMode
): ThemeStyles {
  const next = normalizeThemeStyles(fallback)
  const sanitized = input.replace(/\/\*[\s\S]*?\*\//g, '')

  let foundBlocks = false

  // 1. Check for Dark mode block
  const darkBlock = sanitized.match(
    /(?:\.dark|\[data-theme=["']?dark["']?\])\s*\{([^}]+)\}/i
  )?.[1]
  if (darkBlock) {
    foundBlocks = true
    const declarations = darkBlock.match(/--[\w-]+:\s*[^;]+/g) ?? []
    declarations.forEach((decl) => {
      const [name, ...valParts] = decl.split(':')
      const key = name.trim().replace(/^--/, '') as ThemeStyleKey
      const value = valParts.join(':').trim()
      if (THEME_STYLE_KEYS.includes(key) && value) {
        next.dark[key] = value
        if (COMMON_THEME_STYLE_KEYS.includes(key)) {
          next.light[key] = value
        }
      }
    })
  }

  // 2. Check for Light / Root mode block
  const lightBlock = sanitized.match(
    /(?::root|\.light|body|@theme)\s*\{([^}]+)\}/i
  )?.[1]
  if (lightBlock) {
    foundBlocks = true
    const declarations = lightBlock.match(/--[\w-]+:\s*[^;]+/g) ?? []
    declarations.forEach((decl) => {
      const [name, ...valParts] = decl.split(':')
      const key = name.trim().replace(/^--/, '') as ThemeStyleKey
      const value = valParts.join(':').trim()
      if (THEME_STYLE_KEYS.includes(key) && value) {
        next.light[key] = value
        if (COMMON_THEME_STYLE_KEYS.includes(key)) {
          next.dark[key] = value
        }
      }
    })
  }

  // 3. If no selectors found, parse loose --variable: value lines into targetMode or light
  if (!foundBlocks) {
    const declarations = sanitized.match(/--[\w-]+:\s*[^;]+/g) ?? []
    const mode = targetMode ?? 'light'
    declarations.forEach((decl) => {
      const [name, ...valParts] = decl.split(':')
      const key = name.trim().replace(/^--/, '') as ThemeStyleKey
      const value = valParts.join(':').trim()
      if (THEME_STYLE_KEYS.includes(key) && value) {
        next[mode][key] = value
        if (COMMON_THEME_STYLE_KEYS.includes(key)) {
          const otherMode = mode === 'light' ? 'dark' : 'light'
          next[otherMode][key] = value
        }
      }
    })
  }

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
