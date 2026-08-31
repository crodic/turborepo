import type { CSSProperties } from 'react'
import { useEffect, useState } from 'react'
import {
  BarChart3Icon,
  CreditCardIcon,
  GlobeIcon,
  LayoutDashboardIcon,
  MailIcon,
  MoonIcon,
  ShieldCheckIcon,
  SparklesIcon,
  SunIcon,
  UsersIcon,
} from 'lucide-react'
import {
  THEME_STYLE_KEYS,
  type ThemeMode,
  type ThemeStyles,
} from '@/lib/theme-builder/default-theme'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

function toCssVariables(styles: ThemeStyles, mode: ThemeMode): CSSProperties {
  const cssVariables = Object.fromEntries(
    THEME_STYLE_KEYS.map((key) => [`--${key}`, styles[mode][key]])
  ) as CSSProperties

  return {
    ...cssVariables,
    fontFamily: styles[mode]['font-sans'],
    letterSpacing: styles[mode]['letter-spacing'],
  }
}

function extractFontFamily(fontFamilyValue: string) {
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

function loadGoogleFont(fontFamilyValue: string) {
  const family = extractFontFamily(fontFamilyValue)
  if (!family) return

  const href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
    family
  )}:wght@400;500;600;700&display=swap`

  if (document.querySelector(`link[href="${href}"]`)) return

  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = href
  document.head.appendChild(link)
}

export type WhiteLabelPreviewProps = {
  styles: ThemeStyles
  brandName?: string | null
  siteTitle?: string | null
  siteTagline?: string | null
  siteLogoUrl?: string | null
  siteDarkLogoUrl?: string | null
  siteFaviconUrl?: string | null
  className?: string
}

export function WhiteLabelPreview({
  styles,
  brandName,
  siteTitle,
  siteTagline,
  siteLogoUrl,
  siteDarkLogoUrl,
  siteFaviconUrl,
  className,
}: WhiteLabelPreviewProps) {
  const [previewMode, setPreviewMode] = useState<ThemeMode>('light')

  useEffect(() => {
    ;(['font-sans', 'font-serif', 'font-mono'] as const).forEach((key) => {
      loadGoogleFont(styles[previewMode][key])
    })
  }, [previewMode, styles])

  const activeLogo =
    previewMode === 'dark' ? siteDarkLogoUrl || siteLogoUrl : siteLogoUrl

  return (
    <div
      className={cn(
        'bg-background text-foreground flex h-full min-h-[600px] flex-col overflow-hidden rounded-xl border shadow-sm',
        previewMode === 'dark' && 'dark',
        className
      )}
      style={toCssVariables(styles, previewMode)}
    >
      {/* Studio Preview Header */}
      <div className='border-border bg-card/90 flex items-center justify-between border-b px-4 py-3'>
        <div className='flex items-center gap-3'>
          {siteFaviconUrl ? (
            <img
              src={siteFaviconUrl}
              alt='Favicon'
              className='size-5 rounded object-contain'
            />
          ) : (
            <SparklesIcon className='text-primary size-5' />
          )}
          <div>
            <div className='flex items-center gap-2'>
              <p className='text-sm font-semibold'>
                {siteTitle || brandName || 'Portal Live Preview'}
              </p>
              <Badge variant='outline' className='text-[10px] uppercase'>
                Live Simulation
              </Badge>
            </div>
            <p className='text-muted-foreground line-clamp-1 text-xs'>
              {siteTagline || 'Real-time interactive branding & design system'}
            </p>
          </div>
        </div>

        <div className='flex items-center gap-2'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='h-8 gap-1.5 text-xs'
            onClick={() =>
              setPreviewMode((prev) => (prev === 'light' ? 'dark' : 'light'))
            }
          >
            {previewMode === 'light' ? (
              <>
                <MoonIcon className='size-3.5' />
                <span>Dark Mode</span>
              </>
            ) : (
              <>
                <SunIcon className='size-3.5' />
                <span>Light Mode</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Simulated Portal Shell */}
      <div className='flex flex-1 overflow-hidden'>
        {/* Mock Sidebar */}
        <div
          className='border-border hidden w-48 flex-col justify-between border-r p-3 sm:flex'
          style={{
            backgroundColor: 'var(--sidebar)',
            color: 'var(--sidebar-foreground)',
          }}
        >
          <div className='space-y-4'>
            {/* Sidebar Brand Logo */}
            <div className='flex items-center gap-2 px-1 py-1'>
              {activeLogo ? (
                <img
                  src={activeLogo}
                  alt='Logo'
                  className='max-h-7 max-w-[130px] object-contain'
                />
              ) : (
                <div
                  className='flex size-7 items-center justify-center rounded font-bold'
                  style={{
                    backgroundColor: 'var(--sidebar-primary)',
                    color: 'var(--sidebar-primary-foreground)',
                  }}
                >
                  {(brandName || 'WL').slice(0, 2).toUpperCase()}
                </div>
              )}
              <span className='truncate text-xs font-semibold'>
                {brandName || 'Brand'}
              </span>
            </div>

            {/* Sidebar Nav Items */}
            <div className='space-y-1 text-xs'>
              <div
                className='flex items-center gap-2 rounded-md px-2.5 py-1.5 font-medium'
                style={{
                  backgroundColor: 'var(--sidebar-accent)',
                  color: 'var(--sidebar-accent-foreground)',
                }}
              >
                <LayoutDashboardIcon className='size-3.5' />
                <span>Dashboard</span>
              </div>
              <div className='text-sidebar-foreground/70 hover:bg-sidebar-accent/50 flex items-center gap-2 rounded-md px-2.5 py-1.5'>
                <UsersIcon className='size-3.5' />
                <span>Users</span>
              </div>
              <div className='text-sidebar-foreground/70 hover:bg-sidebar-accent/50 flex items-center gap-2 rounded-md px-2.5 py-1.5'>
                <ShieldCheckIcon className='size-3.5' />
                <span>Roles</span>
              </div>
              <div className='text-sidebar-foreground/70 hover:bg-sidebar-accent/50 flex items-center gap-2 rounded-md px-2.5 py-1.5'>
                <GlobeIcon className='size-3.5' />
                <span>White Label</span>
              </div>
            </div>
          </div>

          <div className='border-sidebar-border border-t pt-2'>
            <div className='text-sidebar-foreground/60 truncate text-[10px]'>
              {siteTitle || 'Visel Art Admin'}
            </div>
          </div>
        </div>

        {/* Mock Content */}
        <div className='flex flex-1 flex-col overflow-auto bg-transparent'>
          <Tabs defaultValue='dashboard' className='flex-1'>
            <div className='border-border border-b px-4 py-2'>
              <TabsList className='h-8'>
                <TabsTrigger value='dashboard' className='text-xs'>
                  Dashboard
                </TabsTrigger>
                <TabsTrigger value='components' className='text-xs'>
                  Components
                </TabsTrigger>
                <TabsTrigger value='palette' className='text-xs'>
                  Color Tokens
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Tab: Dashboard */}
            <TabsContent value='dashboard' className='m-0 space-y-3 p-3 sm:p-4'>
              <div className='grid grid-cols-2 gap-2.5'>
                {[
                  ['Active Users', '8,429', UsersIcon, '+12%'],
                  ['Monthly Volume', '$94,200', BarChart3Icon, '+24%'],
                  ['Conversion Rate', '4.8%', CreditCardIcon, '+0.6%'],
                  ['Inbox Alerts', '19', MailIcon, 'New'],
                ].map(([label, value, Icon, badge]) => (
                  <Card
                    key={label as string}
                    className='overflow-hidden p-2.5 sm:p-3'
                  >
                    <CardContent className='flex items-center justify-between gap-1 p-0'>
                      <div className='min-w-0'>
                        <p className='text-muted-foreground truncate text-[11px] sm:text-xs'>
                          {label as string}
                        </p>
                        <p className='truncate text-sm font-bold sm:text-base'>
                          {value as string}
                        </p>
                      </div>
                      <div className='bg-primary/10 text-primary flex size-7 shrink-0 items-center justify-center rounded-md sm:size-8'>
                        <Icon className='size-3.5 sm:size-4' />
                      </div>
                    </CardContent>
                    <div className='mt-1.5 flex items-center gap-1.5'>
                      <Badge
                        variant='secondary'
                        className='h-4 px-1 text-[9px] sm:text-[10px]'
                      >
                        {badge as string}
                      </Badge>
                      <span className='text-muted-foreground truncate text-[9px] sm:text-[10px]'>
                        vs last mo.
                      </span>
                    </div>
                  </Card>
                ))}
              </div>

              <div className='grid gap-3'>
                <Card>
                  <CardHeader className='p-3 pb-1.5'>
                    <CardTitle className='text-xs font-semibold sm:text-sm'>
                      Quick Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='space-y-2.5 p-3 pt-1.5'>
                    <div className='flex flex-wrap gap-1.5'>
                      <Button size='sm' className='h-7 px-2.5 text-xs'>
                        Primary
                      </Button>
                      <Button
                        size='sm'
                        variant='secondary'
                        className='h-7 px-2.5 text-xs'
                      >
                        Secondary
                      </Button>
                      <Button
                        size='sm'
                        variant='outline'
                        className='h-7 px-2.5 text-xs'
                      >
                        Outline
                      </Button>
                      <Button
                        size='sm'
                        variant='destructive'
                        className='h-7 px-2.5 text-xs'
                      >
                        Destructive
                      </Button>
                    </div>
                    <div className='border-primary/20 bg-primary/10 text-primary rounded-md border p-2 text-[11px] leading-relaxed'>
                      White-Label styling dynamically applies OKLCH color
                      tokens, radii, fonts, and shadows across all components.
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className='p-3 pb-1.5'>
                    <CardTitle className='text-xs font-semibold sm:text-sm'>
                      Brand Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='space-y-1.5 p-3 pt-1.5 text-xs'>
                    <div className='flex justify-between border-b pb-1'>
                      <span className='text-muted-foreground'>Brand:</span>
                      <span className='max-w-37.5 truncate font-medium'>
                        {brandName || 'Default Brand'}
                      </span>
                    </div>
                    <div className='flex justify-between border-b pb-1'>
                      <span className='text-muted-foreground'>Site Title:</span>
                      <span className='max-w-37.5 truncate font-medium'>
                        {siteTitle || 'Visel Art Admin'}
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-muted-foreground'>Font Sans:</span>
                      <span className='font-medium'>
                        {styles[previewMode]['font-sans'].split(',')[0]}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Tab: Components */}
            <TabsContent value='components' className='m-0 space-y-4 p-4'>
              <div className='grid gap-4 md:grid-cols-2'>
                <Card>
                  <CardHeader className='pb-2'>
                    <CardTitle className='text-sm font-semibold'>
                      Form Controls
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='space-y-3'>
                    <div className='space-y-1'>
                      <label className='text-muted-foreground text-xs'>
                        Search Input
                      </label>
                      <div className='border-input bg-background rounded-md border px-3 py-1.5 text-xs'>
                        Search profiles or settings...
                      </div>
                    </div>
                    <div className='space-y-1'>
                      <label className='text-muted-foreground text-xs'>
                        Status Badges
                      </label>
                      <div className='flex flex-wrap gap-1.5'>
                        <Badge>Active</Badge>
                        <Badge variant='secondary'>Secondary</Badge>
                        <Badge variant='outline'>Outline</Badge>
                        <Badge variant='destructive'>Alert</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className='pb-2'>
                    <CardTitle className='text-sm font-semibold'>
                      Typography & Hierarchy
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='space-y-2'>
                    <div>
                      <p className='text-muted-foreground text-[10px] uppercase'>
                        Font Sans
                      </p>
                      <p
                        className='text-base font-bold'
                        style={{ fontFamily: 'var(--font-sans)' }}
                      >
                        {brandName || 'Modern Brand Interface'}
                      </p>
                    </div>
                    <div>
                      <p className='text-muted-foreground text-[10px] uppercase'>
                        Font Serif
                      </p>
                      <p
                        className='text-sm italic'
                        style={{ fontFamily: 'var(--font-serif)' }}
                      >
                        {siteTagline || 'Creative elegance in every detail.'}
                      </p>
                    </div>
                    <div>
                      <p className='text-muted-foreground text-[10px] uppercase'>
                        Font Mono
                      </p>
                      <p
                        className='text-xs'
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        --primary: {styles[previewMode]['primary']}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Tab: Palette */}
            <TabsContent value='palette' className='m-0 p-4'>
              <div className='grid gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'>
                {[
                  'background',
                  'foreground',
                  'card',
                  'popover',
                  'primary',
                  'secondary',
                  'muted',
                  'accent',
                  'destructive',
                  'border',
                  'ring',
                  'sidebar',
                ].map((token) => (
                  <div
                    key={token}
                    className='border-border bg-card flex items-center gap-3 rounded-lg border p-2.5 shadow-xs'
                  >
                    <div
                      className='size-8 shrink-0 rounded-md border shadow-xs'
                      style={{ background: `var(--${token})` }}
                    />
                    <div className='min-w-0 flex-1'>
                      <p className='truncate font-mono text-xs font-semibold'>
                        --{token}
                      </p>
                      <p className='text-muted-foreground truncate font-mono text-[10px]'>
                        {styles[previewMode][token] || 'inherit'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
