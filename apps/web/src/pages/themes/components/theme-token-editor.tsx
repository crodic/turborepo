import { useMemo } from 'react'
import { MoonIcon, SunIcon } from 'lucide-react'
import {
  COMMON_THEME_STYLE_KEYS,
  type ThemeMode,
  type ThemeStyleKey,
  type ThemeStyles,
} from '@/lib/theme-builder/default-theme'
import {
  colorTokenGroups,
  setThemeStyleValue,
} from '@/lib/theme-builder/theme-utils'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const typographyKeys: ThemeStyleKey[] = [
  'font-sans',
  'font-serif',
  'font-mono',
  'letter-spacing',
]
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

function TokenInput({
  label,
  value,
  common,
  onChange,
}: {
  label: string
  value: string
  common?: boolean
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
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className='font-mono text-xs'
      />
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
            <div className='space-y-5 p-4'>
              {colorGroups.map((group) => (
                <section key={group.title} className='space-y-3'>
                  <h4 className='text-sm font-semibold'>{group.title}</h4>
                  <div className='grid gap-3 sm:grid-cols-2'>
                    {group.keys.map((key) => (
                      <TokenInput
                        key={key}
                        label={`--${key}`}
                        value={currentStyles[key]}
                        common={COMMON_THEME_STYLE_KEYS.includes(key)}
                        onChange={(nextValue) => updateToken(key, nextValue)}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value='typography' className='m-0 min-h-0 flex-1'>
          <ScrollArea className='h-full'>
            <div className='grid gap-4 p-4'>
              {typographyKeys.map((key) => (
                <TokenInput
                  key={key}
                  label={`--${key}`}
                  value={currentStyles[key]}
                  common
                  onChange={(nextValue) => updateToken(key, nextValue)}
                />
              ))}
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
