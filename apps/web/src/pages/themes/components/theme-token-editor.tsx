import { useMemo, useState } from 'react'
import {
  AlertCircleIcon,
  CheckIcon,
  ChevronDownIcon,
  MoonIcon,
  RotateCcwIcon,
  SunIcon,
} from 'lucide-react'
import {
  COMMON_THEME_STYLE_KEYS,
  defaultThemeStyles,
  type ThemeMode,
  type ThemeStyleKey,
  type ThemeStyles,
} from '@/lib/theme-builder/default-theme'
import { setThemeStyleValue } from '@/lib/theme-builder/theme-utils'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const shapeKeys: ThemeStyleKey[] = [
  'radius',
  'spacing',
  'shadow-color',
  'shadow-opacity',
  'shadow-blur',
  'shadow-spread',
  'shadow-offset-x',
  'shadow-offset-y',
]

type FontCategory =
  | 'sans-serif'
  | 'serif'
  | 'monospace'
  | 'display'
  | 'handwriting'

type FontInfo = {
  family: string
  category: FontCategory
  variable?: boolean
}

const fontCategoryLabels: Record<FontCategory, string> = {
  'sans-serif': 'Sans Serif Fonts',
  serif: 'Serif Fonts',
  monospace: 'Mono Fonts',
  display: 'Display Fonts',
  handwriting: 'Handwriting Fonts',
}

const systemFontFallbacks: Record<FontCategory, string> = {
  'sans-serif': 'ui-sans-serif, sans-serif, system-ui',
  serif: 'ui-serif, serif',
  monospace: 'ui-monospace, monospace',
  display: 'ui-serif, serif',
  handwriting: 'cursive',
}

const popularFonts: FontInfo[] = [
  { family: 'Inter', category: 'sans-serif', variable: true },
  { family: 'Roboto', category: 'sans-serif' },
  { family: 'Open Sans', category: 'sans-serif', variable: true },
  { family: 'Poppins', category: 'sans-serif' },
  { family: 'Montserrat', category: 'sans-serif', variable: true },
  { family: 'Lato', category: 'sans-serif' },
  { family: 'Nunito', category: 'sans-serif', variable: true },
  { family: 'Raleway', category: 'sans-serif', variable: true },
  { family: 'DM Sans', category: 'sans-serif', variable: true },
  { family: 'Plus Jakarta Sans', category: 'sans-serif', variable: true },
  { family: 'Geist', category: 'sans-serif', variable: true },
  { family: 'Chakra Petch', category: 'sans-serif' },
  { family: 'Playfair Display', category: 'serif', variable: true },
  { family: 'Merriweather', category: 'serif' },
  { family: 'Lora', category: 'serif', variable: true },
  { family: 'PT Serif', category: 'serif' },
  { family: 'Noto Serif', category: 'serif', variable: true },
  { family: 'Source Serif 4', category: 'serif', variable: true },
  { family: 'Libre Baskerville', category: 'serif' },
  { family: 'EB Garamond', category: 'serif', variable: true },
  { family: 'Crimson Text', category: 'serif' },
  { family: 'Bitter', category: 'serif', variable: true },
  { family: 'JetBrains Mono', category: 'monospace', variable: true },
  { family: 'Fira Code', category: 'monospace', variable: true },
  { family: 'Source Code Pro', category: 'monospace', variable: true },
  { family: 'Roboto Mono', category: 'monospace', variable: true },
  { family: 'IBM Plex Mono', category: 'monospace' },
  { family: 'Space Mono', category: 'monospace' },
  { family: 'Ubuntu Mono', category: 'monospace' },
  { family: 'Inconsolata', category: 'monospace', variable: true },
  { family: 'Geist Mono', category: 'monospace', variable: true },
  { family: 'Bebas Neue', category: 'display' },
  { family: 'Abril Fatface', category: 'display' },
  { family: 'Righteous', category: 'display' },
  { family: 'Fredoka', category: 'display', variable: true },
  { family: 'Lobster', category: 'display' },
  { family: 'Comfortaa', category: 'display', variable: true },
  { family: 'Dancing Script', category: 'handwriting', variable: true },
  { family: 'Pacifico', category: 'handwriting' },
  { family: 'Caveat', category: 'handwriting', variable: true },
  { family: 'Satisfy', category: 'handwriting' },
  { family: 'Great Vibes', category: 'handwriting' },
]

const colorTokenGroups: {
  title: string
  defaultOpen?: boolean
  keys: ThemeStyleKey[]
}[] = [
  {
    title: 'Primary',
    defaultOpen: true,
    keys: ['primary', 'primary-foreground'],
  },
  {
    title: 'Secondary',
    defaultOpen: true,
    keys: ['secondary', 'secondary-foreground'],
  },
  {
    title: 'Accent',
    defaultOpen: true,
    keys: ['accent', 'accent-foreground'],
  },
  {
    title: 'Base',
    defaultOpen: true,
    keys: ['background', 'foreground'],
  },
  {
    title: 'Card',
    keys: ['card', 'card-foreground'],
  },
  {
    title: 'Popover',
    keys: ['popover', 'popover-foreground'],
  },
  {
    title: 'Muted',
    keys: ['muted', 'muted-foreground'],
  },
  {
    title: 'Destructive',
    keys: ['destructive'],
  },
  {
    title: 'Border',
    keys: ['border', 'input', 'ring'],
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

const tailwindColors = [
  ['slate-50', '#f8fafc'],
  ['slate-100', '#f1f5f9'],
  ['slate-200', '#e2e8f0'],
  ['slate-300', '#cbd5e1'],
  ['slate-400', '#94a3b8'],
  ['slate-500', '#64748b'],
  ['slate-600', '#475569'],
  ['slate-700', '#334155'],
  ['slate-800', '#1e293b'],
  ['slate-900', '#0f172a'],
  ['slate-950', '#020617'],
  ['neutral-50', '#fafafa'],
  ['neutral-100', '#f5f5f5'],
  ['neutral-200', '#e5e5e5'],
  ['neutral-300', '#d4d4d4'],
  ['neutral-400', '#a3a3a3'],
  ['neutral-500', '#737373'],
  ['neutral-600', '#525252'],
  ['neutral-700', '#404040'],
  ['neutral-800', '#262626'],
  ['neutral-900', '#171717'],
  ['neutral-950', '#0a0a0a'],
  ['red-100', '#fee2e2'],
  ['red-300', '#fca5a5'],
  ['red-500', '#ef4444'],
  ['red-700', '#b91c1c'],
  ['red-900', '#7f1d1d'],
  ['orange-100', '#ffedd5'],
  ['orange-300', '#fdba74'],
  ['orange-500', '#f97316'],
  ['orange-700', '#c2410c'],
  ['orange-900', '#7c2d12'],
  ['amber-100', '#fef3c7'],
  ['amber-300', '#fcd34d'],
  ['amber-500', '#f59e0b'],
  ['amber-700', '#b45309'],
  ['amber-900', '#78350f'],
  ['yellow-100', '#fef9c3'],
  ['yellow-300', '#fde047'],
  ['yellow-500', '#eab308'],
  ['yellow-700', '#a16207'],
  ['yellow-900', '#713f12'],
  ['green-100', '#dcfce7'],
  ['green-300', '#86efac'],
  ['green-500', '#22c55e'],
  ['green-700', '#15803d'],
  ['green-900', '#14532d'],
  ['teal-100', '#ccfbf1'],
  ['teal-300', '#5eead4'],
  ['teal-500', '#14b8a6'],
  ['teal-700', '#0f766e'],
  ['teal-900', '#134e4a'],
  ['cyan-100', '#cffafe'],
  ['cyan-300', '#67e8f9'],
  ['cyan-500', '#06b6d4'],
  ['cyan-700', '#0e7490'],
  ['cyan-900', '#164e63'],
  ['sky-100', '#e0f2fe'],
  ['sky-300', '#7dd3fc'],
  ['sky-500', '#0ea5e9'],
  ['sky-700', '#0369a1'],
  ['sky-900', '#0c4a6e'],
  ['blue-100', '#dbeafe'],
  ['blue-300', '#93c5fd'],
  ['blue-500', '#3b82f6'],
  ['blue-700', '#1d4ed8'],
  ['blue-900', '#1e3a8a'],
  ['indigo-100', '#e0e7ff'],
  ['indigo-300', '#a5b4fc'],
  ['indigo-500', '#6366f1'],
  ['indigo-700', '#4338ca'],
  ['indigo-900', '#312e81'],
  ['violet-100', '#ede9fe'],
  ['violet-300', '#c4b5fd'],
  ['violet-500', '#8b5cf6'],
  ['violet-700', '#6d28d9'],
  ['violet-900', '#4c1d95'],
  ['purple-100', '#f3e8ff'],
  ['purple-300', '#d8b4fe'],
  ['purple-500', '#a855f7'],
  ['purple-700', '#7e22ce'],
  ['purple-900', '#581c87'],
  ['pink-100', '#fce7f3'],
  ['pink-300', '#f9a8d4'],
  ['pink-500', '#ec4899'],
  ['pink-700', '#be185d'],
  ['pink-900', '#831843'],
  ['rose-100', '#ffe4e6'],
  ['rose-300', '#fda4af'],
  ['rose-500', '#f43f5e'],
  ['rose-700', '#be123c'],
  ['rose-900', '#881337'],
] as const

const colorInputPattern = /^#[0-9a-f]{6}$/i
const colorTokenKeys = new Set<ThemeStyleKey>(
  colorTokenGroups.flatMap((group) => group.keys)
)

function buildFontFamily(fontFamily: string, category: FontCategory) {
  return `${fontFamily}, ${systemFontFallbacks[category]}`
}

function extractFontFamily(fontFamilyValue: string) {
  if (!fontFamilyValue) return null

  const firstFont = fontFamilyValue.split(',')[0]?.trim().replace(/['"]/g, '')
  if (!firstFont) return null

  const systemFonts = [
    'ui-sans-serif',
    'ui-serif',
    'ui-monospace',
    'system-ui',
    'sans-serif',
    'serif',
    'monospace',
    'cursive',
    'fantasy',
  ]

  return systemFonts.includes(firstFont.toLowerCase()) ? null : firstFont
}

function getFontCssUrl(family: string) {
  return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
    family
  )}:wght@400;500;600;700&display=swap`
}

function loadGoogleFont(family: string) {
  if (typeof document === 'undefined') return

  const href = getFontCssUrl(family)
  if (document.querySelector(`link[href="${href}"]`)) return

  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = href
  document.head.appendChild(link)
}

function formatTokenLabel(key: ThemeStyleKey) {
  const suffixes = ['-foreground', '-primary-foreground', '-accent-foreground']
  const simplified = suffixes.reduce(
    (label, suffix) => label.replace(suffix, ' foreground'),
    key
  )

  return simplified
    .split(/[-\s]/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ')
}

function parseEmValue(value: string) {
  const numeric = Number.parseFloat(value.replace('em', '').trim())
  return Number.isFinite(numeric) ? numeric : 0
}

function formatEmValue(value: number) {
  return `${Number(value.toFixed(3))}em`
}

function ColorClassPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const currentColor = tailwindColors.find(([, hex]) => hex === value)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='outline'
          className='hidden w-[8.75rem] shrink-0 justify-between px-2 font-mono text-xs xl:flex'
        >
          {currentColor ? `bg-${currentColor[0]}` : 'Tailwind'}
          <ChevronDownIcon className='size-3.5 opacity-60' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='z-[100] w-72 p-0' align='end'>
        <Command>
          <CommandInput placeholder='Search class...' />
          <CommandList>
            <CommandEmpty>No color class found.</CommandEmpty>
            <CommandGroup heading='Tailwind colors'>
              {tailwindColors.map(([name, hex]) => (
                <CommandItem
                  key={name}
                  value={`bg-${name} ${hex}`}
                  onSelect={() => onChange(hex)}
                >
                  <span
                    className='size-3 rounded-sm border'
                    style={{ backgroundColor: hex }}
                  />
                  <span className='font-mono text-xs'>bg-{name}</span>
                  <span className='text-muted-foreground ml-auto font-mono text-xs'>
                    {hex}
                  </span>
                  {hex === value && <CheckIcon className='size-4' />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function FontPicker({
  value,
  category,
  placeholder,
  onChange,
}: {
  value: string
  category: FontCategory
  placeholder: string
  onChange: (value: string) => void
}) {
  const [selectedCategory, setSelectedCategory] =
    useState<FontCategory>(category)
  const selectedFontName = extractFontFamily(value)
  const fonts = useMemo(
    () => popularFonts.filter((font) => font.category === selectedCategory),
    [selectedCategory]
  )

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='outline'
          className='bg-input/25 w-full justify-between'
        >
          <span
            className='truncate'
            style={{ fontFamily: selectedFontName ? value : undefined }}
          >
            {selectedFontName || placeholder}
          </span>
          <ChevronDownIcon className='size-4 opacity-60' />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className='z-[100] w-[min(24rem,calc(100vw-2rem))] overflow-hidden p-0'
        align='start'
        sideOffset={8}
        collisionPadding={16}
      >
        <Command>
          <CommandInput placeholder='Search Google fonts...' />
          <div className='border-b p-2'>
            <select
              value={selectedCategory}
              onChange={(event) =>
                setSelectedCategory(event.target.value as FontCategory)
              }
              className='border-input bg-background h-9 rounded-md border px-2 text-sm outline-none'
            >
              {Object.entries(fontCategoryLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <CommandList className='max-h-80'>
            <CommandEmpty>No fonts found.</CommandEmpty>
            <CommandGroup heading='Popular'>
              {fonts.map((font) => {
                const fontFamily = buildFontFamily(font.family, font.category)
                const isSelected = font.family === selectedFontName

                return (
                  <CommandItem
                    key={font.family}
                    value={`${font.family} ${font.category}`}
                    onMouseEnter={() => loadGoogleFont(font.family)}
                    onSelect={() => {
                      loadGoogleFont(font.family)
                      onChange(fontFamily)
                    }}
                  >
                    <div className='min-w-0 flex-1'>
                      <p className='truncate text-base' style={{ fontFamily }}>
                        {font.family}
                      </p>
                      <p className='text-muted-foreground text-xs'>
                        {font.category}
                        {font.variable ? ' • Variable' : ''}
                      </p>
                    </div>
                    {isSelected && <CheckIcon className='size-4' />}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function FontFamilyRow({
  label,
  value,
  category,
  placeholder,
  onChange,
  onReset,
}: {
  label: string
  value: string
  category: FontCategory
  placeholder: string
  onChange: (value: string) => void
  onReset: () => void
}) {
  return (
    <div className='grid grid-cols-[5rem_minmax(0,1fr)_2.25rem] items-center gap-3'>
      <Label className='text-muted-foreground text-xs'>{label}</Label>
      <div className='min-w-0'>
        <FontPicker
          value={value}
          category={category}
          placeholder={placeholder}
          onChange={onChange}
        />
      </div>
      <Button
        type='button'
        variant='outline'
        size='icon'
        className='size-9 shrink-0'
        onClick={onReset}
      >
        <RotateCcwIcon className='size-4' />
        <span className='sr-only'>Reset {label}</span>
      </Button>
    </div>
  )
}

function LetterSpacingControl({
  value,
  onChange,
  onReset,
}: {
  value: string
  onChange: (value: string) => void
  onReset: () => void
}) {
  const numericValue = parseEmValue(value)

  const updateValue = (nextValue: number) => {
    onChange(formatEmValue(nextValue))
  }

  return (
    <div className='grid gap-2'>
      <div className='flex items-center justify-between gap-2'>
        <Label className='font-mono text-xs'>Tracking</Label>
        <span className='text-muted-foreground bg-muted rounded px-1.5 py-0.5 text-[10px]'>
          em
        </span>
      </div>
      <div className='flex items-center gap-3'>
        <Slider
          min={-0.1}
          max={0.2}
          step={0.005}
          value={[numericValue]}
          className='min-w-0 flex-1'
          onValueChange={([nextValue]) => updateValue(nextValue ?? 0)}
        />
        <div className='relative w-28 shrink-0'>
          <Input
            type='number'
            min={-0.1}
            max={0.2}
            step={0.005}
            value={Number(numericValue.toFixed(3))}
            className='pr-8 font-mono text-xs'
            onChange={(event) => updateValue(Number(event.target.value))}
          />
          <span className='text-muted-foreground pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xs'>
            em
          </span>
        </div>
        <Button
          type='button'
          variant='outline'
          size='icon'
          className='size-9 shrink-0'
          onClick={onReset}
        >
          <RotateCcwIcon className='size-4' />
          <span className='sr-only'>Reset tracking</span>
        </Button>
      </div>
    </div>
  )
}

function getColorPickerValue(value: string) {
  return colorInputPattern.test(value) ? value : '#000000'
}

function TokenInput({
  label,
  value,
  common,
  color,
  onReset,
  onChange,
}: {
  label: string
  value: string
  common?: boolean
  color?: boolean
  onReset?: () => void
  onChange: (value: string) => void
}) {
  return (
    <div className='grid gap-1.5'>
      <div className='flex items-center justify-between gap-2'>
        <Label className='font-mono text-xs'>{label}</Label>
        {common && (
          <span className='text-muted-foreground bg-muted rounded px-1.5 py-0.5 text-[10px]'>
            shared
          </span>
        )}
      </div>
      <div className='flex items-center gap-2'>
        {color && (
          <label className='border-input relative size-9 shrink-0 cursor-pointer overflow-hidden rounded-md border shadow-xs'>
            <span
              className='absolute inset-0'
              style={{ backgroundColor: value }}
            />
            <input
              type='color'
              value={getColorPickerValue(value)}
              className='absolute inset-0 size-full cursor-pointer opacity-0'
              aria-label={`Pick ${label}`}
              onChange={(event) => onChange(event.target.value)}
            />
          </label>
        )}
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className='font-mono text-xs'
        />
        {color && <ColorClassPicker value={value} onChange={onChange} />}
        {onReset && (
          <Button
            type='button'
            variant='outline'
            size='icon'
            className='size-9 shrink-0'
            onClick={onReset}
          >
            <RotateCcwIcon className='size-4' />
            <span className='sr-only'>Reset {label}</span>
          </Button>
        )}
      </div>
    </div>
  )
}

export function ThemeTokenEditor({
  value,
  mode,
  onModeChange,
  onChange,
}: {
  value: ThemeStyles
  mode: ThemeMode
  onModeChange: (mode: ThemeMode) => void
  onChange: (value: ThemeStyles) => void
}) {
  const currentStyles = value[mode]
  const colorGroups = useMemo(() => colorTokenGroups, [])

  const updateToken = (key: ThemeStyleKey, tokenValue: string) => {
    onChange(setThemeStyleValue(value, mode, key, tokenValue))
  }

  return (
    <div className='flex min-h-0 flex-1 flex-col rounded-lg border'>
      <div className='flex items-center justify-between gap-3 border-b p-3'>
        <div>
          <p className='font-medium'>Theme Editor</p>
          <p className='text-muted-foreground text-xs'>
            Edit shadcn/Tailwind CSS variables.
          </p>
        </div>
        <div className='flex rounded-md border p-1'>
          <Button
            type='button'
            size='sm'
            variant={mode === 'light' ? 'default' : 'ghost'}
            onClick={() => onModeChange('light')}
          >
            <SunIcon className='size-4' />
          </Button>
          <Button
            type='button'
            size='sm'
            variant={mode === 'dark' ? 'default' : 'ghost'}
            onClick={() => onModeChange('dark')}
          >
            <MoonIcon className='size-4' />
          </Button>
        </div>
      </div>

      <Tabs defaultValue='colors' className='flex min-h-0 flex-1 flex-col'>
        <div className='border-b p-3'>
          <TabsList className='w-full'>
            <TabsTrigger value='colors'>Colors</TabsTrigger>
            <TabsTrigger value='typography'>Typography</TabsTrigger>
            <TabsTrigger value='effects'>Effects</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value='colors' className='m-0 min-h-0 flex-1'>
          <ScrollArea className='h-full'>
            <div className='space-y-3 p-4'>
              {colorGroups.map((group) => (
                <Collapsible
                  key={group.title}
                  defaultOpen={group.defaultOpen}
                  className='group/collapsible'
                >
                  <CollapsibleTrigger className='bg-muted/50 text-muted-foreground hover:bg-muted flex h-8 items-center gap-1 rounded-md border px-2.5 text-xs font-semibold tracking-wider uppercase transition-colors'>
                    <ChevronDownIcon className='size-3.5 transition-transform group-data-[state=closed]/collapsible:-rotate-90' />
                    {group.title}
                  </CollapsibleTrigger>
                  <CollapsibleContent className='data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 pt-3'>
                    <div className='grid gap-3'>
                      {group.keys.map((key) => (
                        <TokenInput
                          key={key}
                          label={formatTokenLabel(key)}
                          value={currentStyles[key]}
                          common={COMMON_THEME_STYLE_KEYS.includes(key)}
                          color={colorTokenKeys.has(key)}
                          onChange={(nextValue) => updateToken(key, nextValue)}
                          onReset={() =>
                            updateToken(key, defaultThemeStyles[mode][key])
                          }
                        />
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value='typography' className='m-0 min-h-0 flex-1'>
          <ScrollArea className='h-full'>
            <div className='space-y-3 p-4'>
              <div className='text-muted-foreground flex items-center gap-2 text-xs'>
                <AlertCircleIcon className='size-3.5 shrink-0' />
                <p>
                  Custom fonts require embedding.{' '}
                  <a
                    href='https://tailwindcss.com/docs/font-family'
                    target='_blank'
                    rel='noreferrer'
                    className='text-foreground/70 hover:text-foreground underline underline-offset-2'
                  >
                    Learn more
                  </a>
                </p>
              </div>

              <Collapsible defaultOpen className='group/collapsible'>
                <CollapsibleTrigger className='bg-muted/50 text-muted-foreground hover:bg-muted flex h-8 items-center gap-1 rounded-md border px-2.5 text-xs font-semibold tracking-wider uppercase transition-colors'>
                  <ChevronDownIcon className='size-3.5 transition-transform group-data-[state=closed]/collapsible:-rotate-90' />
                  Font Family
                </CollapsibleTrigger>
                <CollapsibleContent className='pt-3'>
                  <div className='space-y-2'>
                    <FontFamilyRow
                      label='Sans-Serif'
                      value={currentStyles['font-sans']}
                      category='sans-serif'
                      placeholder='Sans-serif font...'
                      onChange={(nextValue) =>
                        updateToken('font-sans', nextValue)
                      }
                      onReset={() =>
                        updateToken(
                          'font-sans',
                          defaultThemeStyles[mode]['font-sans']
                        )
                      }
                    />

                    <FontFamilyRow
                      label='Serif'
                      value={currentStyles['font-serif']}
                      category='serif'
                      placeholder='Serif font...'
                      onChange={(nextValue) =>
                        updateToken('font-serif', nextValue)
                      }
                      onReset={() =>
                        updateToken(
                          'font-serif',
                          defaultThemeStyles[mode]['font-serif']
                        )
                      }
                    />

                    <FontFamilyRow
                      label='Mono'
                      value={currentStyles['font-mono']}
                      category='monospace'
                      placeholder='Monospace font...'
                      onChange={(nextValue) =>
                        updateToken('font-mono', nextValue)
                      }
                      onReset={() =>
                        updateToken(
                          'font-mono',
                          defaultThemeStyles[mode]['font-mono']
                        )
                      }
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <Collapsible defaultOpen className='group/collapsible'>
                <CollapsibleTrigger className='bg-muted/50 text-muted-foreground hover:bg-muted flex h-8 items-center gap-1 rounded-md border px-2.5 text-xs font-semibold tracking-wider uppercase transition-colors'>
                  <ChevronDownIcon className='size-3.5 transition-transform group-data-[state=closed]/collapsible:-rotate-90' />
                  Letter Spacing
                </CollapsibleTrigger>
                <CollapsibleContent className='pt-3'>
                  <LetterSpacingControl
                    value={currentStyles['letter-spacing']}
                    onChange={(nextValue) =>
                      updateToken('letter-spacing', nextValue)
                    }
                    onReset={() =>
                      updateToken(
                        'letter-spacing',
                        defaultThemeStyles[mode]['letter-spacing']
                      )
                    }
                  />
                </CollapsibleContent>
              </Collapsible>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value='effects' className='m-0 min-h-0 flex-1'>
          <ScrollArea className='h-full'>
            <div className='grid gap-4 p-4'>
              {shapeKeys.map((key) => (
                <TokenInput
                  key={key}
                  label={`--${key}`}
                  value={currentStyles[key]}
                  common
                  onChange={(nextValue) => updateToken(key, nextValue)}
                  onReset={() =>
                    updateToken(key, defaultThemeStyles[mode][key])
                  }
                />
              ))}
              <div
                className={cn(
                  'bg-card text-card-foreground rounded-md border p-4 shadow-md'
                )}
              >
                <p className='font-medium'>Effect sample</p>
                <p className='text-muted-foreground text-sm'>
                  Radius, spacing and shadow tokens are reflected here.
                </p>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}
