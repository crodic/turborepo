import { useMemo, useRef, useState } from 'react'
import { converter, formatHex, type Hsl } from 'culori'
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

type HslAdjustment = {
  hueShift: number
  saturationScale: number
  lightnessScale: number
}

const defaultHslAdjustment: HslAdjustment = {
  hueShift: 0,
  saturationScale: 1,
  lightnessScale: 1,
}

const hslPresets: (HslAdjustment & { label: string })[] = [
  {
    label: 'Hue (-120deg)',
    hueShift: -120,
    saturationScale: 1,
    lightnessScale: 1,
  },
  {
    label: 'Hue (-60deg)',
    hueShift: -60,
    saturationScale: 1,
    lightnessScale: 1,
  },
  {
    label: 'Hue (+60deg)',
    hueShift: 60,
    saturationScale: 1,
    lightnessScale: 1,
  },
  {
    label: 'Hue (+120deg)',
    hueShift: 120,
    saturationScale: 1,
    lightnessScale: 1,
  },
  { label: 'Hue invert', hueShift: 180, saturationScale: 1, lightnessScale: 1 },
  { label: 'Grayscale', hueShift: 0, saturationScale: 0, lightnessScale: 1 },
  { label: 'Muted', hueShift: 0, saturationScale: 0.6, lightnessScale: 1 },
  { label: 'Vibrant', hueShift: 0, saturationScale: 1.4, lightnessScale: 1 },
  { label: 'Dimmer', hueShift: 0, saturationScale: 1, lightnessScale: 0.8 },
  { label: 'Brighter', hueShift: 0, saturationScale: 1, lightnessScale: 1.2 },
  {
    label: 'Warm soft',
    hueShift: 30,
    saturationScale: 0.5,
    lightnessScale: 0.95,
  },
  {
    label: 'Cool vivid',
    hueShift: -20,
    saturationScale: 1.2,
    lightnessScale: 1.05,
  },
  {
    label: 'Fresh muted',
    hueShift: 20,
    saturationScale: 0.7,
    lightnessScale: 0.95,
  },
  {
    label: 'Soft lift',
    hueShift: -10,
    saturationScale: 0.75,
    lightnessScale: 1.1,
  },
  {
    label: 'Bright pop',
    hueShift: 60,
    saturationScale: 1.5,
    lightnessScale: 1.1,
  },
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

function parseCssNumber(value: string) {
  const numeric = Number.parseFloat(value.replace(/[^\d.-]/g, ''))
  return Number.isFinite(numeric) ? numeric : 0
}

function formatCssUnit(value: number, unit: string) {
  return `${Number(value.toFixed(3))}${unit}`
}

function adjustColorByHsl(
  color: string,
  hueShift: number,
  saturationScale: number,
  lightnessScale: number
) {
  const hsl = converter('hsl')(color)
  const h = hsl?.h
  const s = hsl?.s
  const l = hsl?.l

  if (h === undefined || s === undefined || l === undefined) return color

  const out = converter('hsl')({
    h: (((h + hueShift) % 360) + 360) % 360,
    s: Math.min(1, Math.max(0, s * saturationScale)),
    l: Math.min(1, Math.max(0.1, l * lightnessScale)),
  } as Hsl)

  return out ? formatHex(out) : color
}

function isDefaultHslAdjustment(adjustment: HslAdjustment) {
  return (
    adjustment.hueShift === defaultHslAdjustment.hueShift &&
    adjustment.saturationScale === defaultHslAdjustment.saturationScale &&
    adjustment.lightnessScale === defaultHslAdjustment.lightnessScale
  )
}

function SliderWithInput({
  label,
  value,
  min,
  max,
  step = 1,
  unit = 'px',
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (value: number) => void
}) {
  const inputId = `theme-slider-${label.replace(/\s+/g, '-').toLowerCase()}`

  const updateValue = (nextValue: number) => {
    const normalized = Math.max(min, Math.min(max, nextValue))
    onChange(normalized)
  }

  return (
    <div className='flex items-center gap-2 py-0.5'>
      <Label
        htmlFor={inputId}
        className='text-muted-foreground w-20 shrink-0 text-xs font-medium'
      >
        {label}
      </Label>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        className='min-w-0 flex-1'
        onValueChange={([nextValue]) => updateValue(nextValue ?? min)}
      />
      <div className='flex shrink-0 items-center gap-1'>
        <Input
          id={inputId}
          type='number'
          value={Number(value.toFixed(3))}
          min={min}
          max={max}
          step={step}
          className='h-8 w-16 px-2 text-xs'
          onChange={(event) => {
            const numeric = Number.parseFloat(
              event.target.value.replace(',', '.')
            )
            if (Number.isFinite(numeric)) updateValue(numeric)
          }}
        />
        <span className='text-muted-foreground w-7 text-xs'>{unit}</span>
      </div>
    </div>
  )
}

function HslPresetButton({
  preset,
  currentStyles,
  selected,
  onClick,
}: {
  preset: HslAdjustment & { label: string }
  currentStyles: Record<string, string>
  selected: boolean
  onClick: () => void
}) {
  const previewBg = adjustColorByHsl(
    currentStyles.background,
    preset.hueShift,
    preset.saturationScale,
    preset.lightnessScale
  )
  const previewPrimary = adjustColorByHsl(
    currentStyles.primary,
    preset.hueShift,
    preset.saturationScale,
    preset.lightnessScale
  )
  const previewSecondary = adjustColorByHsl(
    currentStyles.secondary,
    preset.hueShift,
    preset.saturationScale,
    preset.lightnessScale
  )

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type='button'
          variant='outline'
          size='sm'
          className={cn(
            'relative h-9 overflow-hidden rounded-md p-0 shadow-sm transition-all hover:scale-[1.03] hover:shadow-md',
            selected && 'ring-primary ring-1 ring-offset-1'
          )}
          style={{ background: previewBg }}
          onClick={onClick}
        >
          <span className='absolute inset-0 flex'>
            <span
              className='h-full w-1/2 rounded-l-md'
              style={{ background: previewPrimary }}
            />
            <span
              className='h-full w-1/2 rounded-r-md'
              style={{ background: previewSecondary }}
            />
          </span>
          {selected && (
            <span className='bg-primary absolute right-1 bottom-1 size-2 rounded-full' />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side='bottom'>{preset.label}</TooltipContent>
    </Tooltip>
  )
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

function HslAdjustmentControl({
  currentStyles,
  adjustment,
  onChange,
}: {
  currentStyles: Record<string, string>
  adjustment: HslAdjustment
  onChange: (adjustment: HslAdjustment) => void
}) {
  const [showAllPresets, setShowAllPresets] = useState(false)
  const visiblePresets = showAllPresets ? hslPresets : hslPresets.slice(0, 10)

  const handleChange = (key: keyof HslAdjustment, nextValue: number) => {
    onChange({ ...adjustment, [key]: nextValue })
  }

  return (
    <div className='space-y-2'>
      <div className='grid grid-cols-5 gap-2 sm:grid-cols-7 xl:grid-cols-5 2xl:grid-cols-7'>
        {visiblePresets.map((preset) => (
          <HslPresetButton
            key={preset.label}
            preset={preset}
            currentStyles={currentStyles}
            selected={
              adjustment.hueShift === preset.hueShift &&
              adjustment.saturationScale === preset.saturationScale &&
              adjustment.lightnessScale === preset.lightnessScale
            }
            onClick={() => onChange(preset)}
          />
        ))}
      </div>
      {hslPresets.length > 10 && (
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className='text-muted-foreground w-full text-xs'
          onClick={() => setShowAllPresets((isOpen) => !isOpen)}
        >
          {showAllPresets ? 'Hide' : 'Show more'} presets
          <ChevronDownIcon
            className={cn(
              'size-4 transition-transform',
              showAllPresets && 'rotate-180'
            )}
          />
        </Button>
      )}
      <SliderWithInput
        label='Hue'
        value={adjustment.hueShift}
        min={-180}
        max={180}
        step={1}
        unit='deg'
        onChange={(nextValue) => handleChange('hueShift', nextValue)}
      />
      <SliderWithInput
        label='Saturation'
        value={adjustment.saturationScale}
        min={0}
        max={2}
        step={0.01}
        unit='x'
        onChange={(nextValue) => handleChange('saturationScale', nextValue)}
      />
      <SliderWithInput
        label='Lightness'
        value={adjustment.lightnessScale}
        min={0.2}
        max={2}
        step={0.01}
        unit='x'
        onChange={(nextValue) => handleChange('lightnessScale', nextValue)}
      />
    </div>
  )
}

function ShapeEffectControls({
  currentStyles,
  onChange,
  onReset,
}: {
  currentStyles: Record<string, string>
  onChange: (key: ThemeStyleKey, value: string) => void
  onReset: (key: ThemeStyleKey) => void
}) {
  return (
    <div className='space-y-3'>
      <Collapsible defaultOpen className='group/collapsible'>
        <CollapsibleTrigger className='bg-muted/50 text-muted-foreground hover:bg-muted flex h-8 items-center gap-1 rounded-md border px-2.5 text-xs font-semibold tracking-wider uppercase transition-colors'>
          <ChevronDownIcon className='size-3.5 transition-transform group-data-[state=closed]/collapsible:-rotate-90' />
          Radius
        </CollapsibleTrigger>
        <CollapsibleContent className='pt-3'>
          <SliderWithInput
            label='Radius'
            value={parseCssNumber(currentStyles.radius)}
            min={0}
            max={2}
            step={0.01}
            unit='rem'
            onChange={(nextValue) =>
              onChange('radius', formatCssUnit(nextValue, 'rem'))
            }
          />
        </CollapsibleContent>
      </Collapsible>

      <Collapsible className='group/collapsible'>
        <CollapsibleTrigger className='bg-muted/50 text-muted-foreground hover:bg-muted flex h-8 items-center gap-1 rounded-md border px-2.5 text-xs font-semibold tracking-wider uppercase transition-colors'>
          <ChevronDownIcon className='size-3.5 transition-transform group-data-[state=closed]/collapsible:-rotate-90' />
          Spacing
        </CollapsibleTrigger>
        <CollapsibleContent className='pt-3'>
          <SliderWithInput
            label='Spacing'
            value={parseCssNumber(currentStyles.spacing)}
            min={0}
            max={1}
            step={0.01}
            unit='rem'
            onChange={(nextValue) =>
              onChange('spacing', formatCssUnit(nextValue, 'rem'))
            }
          />
        </CollapsibleContent>
      </Collapsible>

      <Collapsible defaultOpen className='group/collapsible'>
        <CollapsibleTrigger className='bg-muted/50 text-muted-foreground hover:bg-muted flex h-8 items-center gap-1 rounded-md border px-2.5 text-xs font-semibold tracking-wider uppercase transition-colors'>
          <ChevronDownIcon className='size-3.5 transition-transform group-data-[state=closed]/collapsible:-rotate-90' />
          Shadow
        </CollapsibleTrigger>
        <CollapsibleContent className='space-y-2 pt-3'>
          <TokenInput
            label='Color'
            value={currentStyles['shadow-color']}
            common
            color
            onChange={(nextValue) => onChange('shadow-color', nextValue)}
            onReset={() => onReset('shadow-color')}
          />
          <SliderWithInput
            label='Opacity'
            value={parseCssNumber(currentStyles['shadow-opacity'])}
            min={0}
            max={1}
            step={0.01}
            unit=''
            onChange={(nextValue) =>
              onChange('shadow-opacity', String(nextValue))
            }
          />
          <SliderWithInput
            label='Blur'
            value={parseCssNumber(currentStyles['shadow-blur'])}
            min={0}
            max={50}
            step={0.5}
            unit='px'
            onChange={(nextValue) =>
              onChange('shadow-blur', formatCssUnit(nextValue, 'px'))
            }
          />
          <SliderWithInput
            label='Spread'
            value={parseCssNumber(currentStyles['shadow-spread'])}
            min={-50}
            max={50}
            step={0.5}
            unit='px'
            onChange={(nextValue) =>
              onChange('shadow-spread', formatCssUnit(nextValue, 'px'))
            }
          />
          <SliderWithInput
            label='Offset X'
            value={parseCssNumber(currentStyles['shadow-offset-x'])}
            min={-50}
            max={50}
            step={0.5}
            unit='px'
            onChange={(nextValue) =>
              onChange('shadow-offset-x', formatCssUnit(nextValue, 'px'))
            }
          />
          <SliderWithInput
            label='Offset Y'
            value={parseCssNumber(currentStyles['shadow-offset-y'])}
            min={-50}
            max={50}
            step={0.5}
            unit='px'
            onChange={(nextValue) =>
              onChange('shadow-offset-y', formatCssUnit(nextValue, 'px'))
            }
          />
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

function getShadowPreview(styles: Record<string, string>) {
  const color = styles['shadow-color'] || 'oklch(0 0 0)'
  const opacity = parseCssNumber(styles['shadow-opacity'])
  const blur = styles['shadow-blur'] || '3px'
  const spread = styles['shadow-spread'] || '0px'
  const offsetX = styles['shadow-offset-x'] || '0px'
  const offsetY = styles['shadow-offset-y'] || '1px'

  return `${offsetX} ${offsetY} ${blur} ${spread} color-mix(in oklch, ${color} ${opacity * 100}%, transparent)`
}

function applyHslAdjustmentToStyles(
  styles: ThemeStyles,
  adjustment: HslAdjustment
) {
  const next: ThemeStyles = {
    light: { ...styles.light },
    dark: { ...styles.dark },
  }

  ;(['light', 'dark'] as ThemeMode[]).forEach((themeMode) => {
    colorTokenGroups.forEach((group) => {
      group.keys.forEach((key) => {
        next[themeMode][key] = adjustColorByHsl(
          styles[themeMode][key],
          adjustment.hueShift,
          adjustment.saturationScale,
          adjustment.lightnessScale
        )
      })
    })
  })

  return next
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
  const hslBaseStylesRef = useRef<ThemeStyles | null>(null)
  const [hslAdjustment, setHslAdjustment] =
    useState<HslAdjustment>(defaultHslAdjustment)

  const updateToken = (key: ThemeStyleKey, tokenValue: string) => {
    onChange(setThemeStyleValue(value, mode, key, tokenValue))
  }

  const resetToken = (key: ThemeStyleKey) => {
    updateToken(key, defaultThemeStyles[mode][key])
  }

  const updateHslAdjustment = (adjustment: HslAdjustment) => {
    if (!hslBaseStylesRef.current) {
      hslBaseStylesRef.current = {
        light: { ...value.light },
        dark: { ...value.dark },
      }
    }

    setHslAdjustment(adjustment)
    onChange(applyHslAdjustmentToStyles(hslBaseStylesRef.current, adjustment))

    if (isDefaultHslAdjustment(adjustment)) {
      hslBaseStylesRef.current = null
    }
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
            <div className='space-y-3 p-4'>
              <Collapsible defaultOpen className='group/collapsible'>
                <CollapsibleTrigger className='bg-muted/50 text-muted-foreground hover:bg-muted flex h-8 items-center gap-1 rounded-md border px-2.5 text-xs font-semibold tracking-wider uppercase transition-colors'>
                  <ChevronDownIcon className='size-3.5 transition-transform group-data-[state=closed]/collapsible:-rotate-90' />
                  HSL Adjustments
                </CollapsibleTrigger>
                <CollapsibleContent className='pt-3'>
                  <HslAdjustmentControl
                    currentStyles={currentStyles}
                    adjustment={hslAdjustment}
                    onChange={updateHslAdjustment}
                  />
                </CollapsibleContent>
              </Collapsible>

              <ShapeEffectControls
                currentStyles={currentStyles}
                onChange={updateToken}
                onReset={resetToken}
              />

              <div
                className={cn(
                  'bg-card text-card-foreground rounded-md border p-4'
                )}
                style={{
                  borderRadius: currentStyles.radius,
                  padding: `calc(${currentStyles.spacing} * 4)`,
                  boxShadow: getShadowPreview(currentStyles),
                }}
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
