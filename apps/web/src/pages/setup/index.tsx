import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Circle,
  Database,
  Globe,
  Layers,
  Lock,
  Mail,
  Palette,
  Rocket,
  RotateCcw,
  Server,
  ShieldCheck,
  Sliders,
  Sparkles,
  User,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  cloneDefaultThemeStyles,
  type ThemeMode,
  type ThemeStyles,
} from '@/lib/theme-builder/default-theme'
import { applyThemeStylesToElement } from '@/lib/theme-builder/theme-utils'
import { themeColors } from '@/lib/theme-colors'
import { cn } from '@/lib/utils'
import { useTheme } from '@/context/theme-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import LanguageSelect from '@/components/common/language-select'
import { PasswordInput } from '@/components/password-input'
import { RuntimeLogo } from '@/components/runtime-logo'
import { ThemeSwitch } from '@/components/theme-switch'
import { ThemeTokenEditor } from '@/pages/white-labels/components/theme-token-editor'
import { useSystemSetupMutation } from './queries'
import { systemSetupSchema, type SystemSetupSchema } from './schema'

type Step = 1 | 2 | 3 | 4

const THEME_NAMES: Record<string, string> = {
  blue: 'Default Blue',
  neutral: 'Neutral Minimalist',
  red: 'Crimson Red',
  violet: 'Violet Luxury',
  yellow: 'Amber Glow',
  green: 'Emerald Nature',
  orange: 'Sunset Orange',
  pink: 'Rose Quartz',
  slate: 'Slate Corporate',
  teal: 'Ocean Teal',
  cyan: 'Cyan Breeze',
  indigo: 'Deep Indigo',
  purple: 'Royal Purple',
  neonNoir: 'Neon Noir',
}

function getPresetThemeStyles(colorKey: keyof typeof themeColors): ThemeStyles {
  const base = cloneDefaultThemeStyles()
  const preset = themeColors[colorKey]
  if (!preset) return base

  Object.entries(preset.light).forEach(([key, val]) => {
    const cleanKey = key.replace(/^--/, '')
    base.light[cleanKey] = val
  })
  Object.entries(preset.dark).forEach(([key, val]) => {
    const cleanKey = key.replace(/^--/, '')
    base.dark[cleanKey] = val
  })
  return base
}

export function PageSystemSetup() {
  const { t } = useTranslation()
  const { setColorKey, colorKey, resolvedTheme } = useTheme()
  const [step, setStep] = useState<Step>(1)
  const { mutateAsync: setupSystem, isPending } = useSystemSetupMutation()

  const [editorMode, setEditorMode] = useState<ThemeMode>(() =>
    resolvedTheme === 'dark' ? 'dark' : 'light'
  )
  const [customStyles, setCustomStyles] = useState<ThemeStyles>(() =>
    cloneDefaultThemeStyles()
  )
  const [isCustomModified, setIsCustomModified] = useState(false)
  const [activeThemeTab, setActiveThemeTab] = useState<'presets' | 'custom'>(
    'presets'
  )

  const form = useForm<SystemSetupSchema>({
    resolver: zodResolver(systemSetupSchema),
    mode: 'onChange',
    defaultValues: {
      site_brand: '',
      theme_key: 'blue',
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  const passwordValue = form.watch('password') || ''
  const confirmPasswordValue = form.watch('confirmPassword') || ''
  const siteBrandValue = form.watch('site_brand') || ''
  const firstNameValue = form.watch('firstName') || ''
  const lastNameValue = form.watch('lastName') || ''
  const emailValue = form.watch('email') || ''
  const selectedThemeKey = form.watch('theme_key') || colorKey || 'blue'

  // Real-time password requirement checklist
  const passwordCriteria = [
    {
      key: 'min',
      valid: passwordValue.length >= 8,
      label: t('setup.pwdReq.min'),
    },
    {
      key: 'upper',
      valid: /[A-Z]/.test(passwordValue),
      label: t('setup.pwdReq.upper'),
    },
    {
      key: 'lower',
      valid: /[a-z]/.test(passwordValue),
      label: t('setup.pwdReq.lower'),
    },
    {
      key: 'number',
      valid: /[0-9]/.test(passwordValue),
      label: t('setup.pwdReq.number'),
    },
    {
      key: 'special',
      valid: /[^a-zA-Z0-9]/.test(passwordValue),
      label: t('setup.pwdReq.special'),
    },
    {
      key: 'match',
      valid:
        confirmPasswordValue.length > 0 &&
        confirmPasswordValue === passwordValue,
      label: t('setup.pwdReq.match'),
    },
  ]

  const handleNextFromStep1 = async () => {
    const isStep1Valid = await form.trigger(['site_brand'])
    if (isStep1Valid) {
      setStep(2)
    }
  }

  const handleSelectTheme = (key: keyof typeof themeColors) => {
    form.setValue('theme_key', key)
    form.setValue('custom_styles', undefined)
    setColorKey(key)
    setCustomStyles(getPresetThemeStyles(key))
    setIsCustomModified(false)
  }

  const handleCustomStylesChange = (newStyles: ThemeStyles) => {
    setCustomStyles(newStyles)
    setIsCustomModified(true)
    form.setValue('custom_styles', newStyles)
    applyThemeStylesToElement(document.documentElement, newStyles, editorMode)
  }

  const handleSkipToDefault = () => {
    form.setValue('theme_key', 'blue')
    form.setValue('custom_styles', undefined)
    setColorKey('blue')
    setCustomStyles(getPresetThemeStyles('blue'))
    setIsCustomModified(false)
    setStep(3)
  }

  const handleNextFromStep2 = () => {
    setStep(3)
  }

  const handleNextFromStep3 = async () => {
    const isStep3Valid = await form.trigger([
      'firstName',
      'lastName',
      'email',
      'password',
      'confirmPassword',
    ])
    if (isStep3Valid) {
      setStep(4)
    }
  }

  const onSubmit = async (data: SystemSetupSchema) => {
    try {
      await setupSystem(data)
      toast.success(t('setup.completeSuccess'))
      // Redirect to sign-in page, the guard will now allow it
      window.location.assign('/sign-in')
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          t('setup.failed', { defaultValue: 'Failed to setup system' })
      )
    }
  }

  const stepsMeta = [
    {
      id: 1,
      title: t('setup.steps.brand'),
      desc: t('setup.steps.brandDesc'),
      icon: Globe,
    },
    {
      id: 2,
      title: t('setup.steps.theme'),
      desc: t('setup.steps.themeDesc'),
      icon: Palette,
    },
    {
      id: 3,
      title: t('setup.steps.admin'),
      desc: t('setup.steps.adminDesc'),
      icon: ShieldCheck,
    },
    {
      id: 4,
      title: t('setup.steps.review'),
      desc: t('setup.steps.reviewDesc'),
      icon: Rocket,
    },
  ]

  return (
    <div className='bg-background flex min-h-screen flex-col'>
      {/* Top Header Bar */}
      <header className='border-border/40 bg-background/95 supports-backdrop-filter:bg-background/60 sticky top-0 z-50 border-b backdrop-blur'>
        <div className='container mx-auto flex h-16 items-center justify-between px-4 sm:px-6'>
          <div className='flex items-center gap-3'>
            <RuntimeLogo
              className='max-h-8 w-auto'
              placeholderClassName='h-8 w-24'
            />
            <span className='bg-border hidden h-4 w-px sm:inline-block' />
            <Badge
              variant='outline'
              className='bg-primary/5 text-primary border-primary/20 hidden text-xs font-medium sm:inline-flex'
            >
              <Sparkles className='mr-1 size-3' />
              {t('setup.badge')}
            </Badge>
          </div>

          <div className='flex items-center gap-3'>
            <LanguageSelect />
            <ThemeSwitch />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className='container mx-auto flex-1 px-4 py-8 sm:px-6 sm:py-12'>
        <div className='mx-auto max-w-6xl'>
          <div className='grid grid-cols-1 gap-8 lg:grid-cols-12'>
            {/* Left Column: Visual Stepper & Feature Highlights */}
            <div className='flex flex-col justify-between space-y-6 lg:col-span-5'>
              <div className='space-y-6'>
                <div className='space-y-2'>
                  <Badge variant='secondary' className='text-xs font-semibold'>
                    {t('setup.stepProgress', { current: step, total: 4 })}
                  </Badge>
                  <h1 className='text-2xl font-bold tracking-tight sm:text-3xl'>
                    {t('setup.title')}
                  </h1>
                  <p className='text-muted-foreground text-sm sm:text-base'>
                    {t('setup.subtitle')}
                  </p>
                </div>

                {/* Vertical Stepper */}
                <div className='space-y-4'>
                  {stepsMeta.map((s) => {
                    const Icon = s.icon
                    const isCurrent = step === s.id
                    const isCompleted = step > s.id

                    return (
                      <div
                        key={s.id}
                        className={cn(
                          'flex items-start gap-4 rounded-xl border p-4 transition-all duration-200',
                          isCurrent
                            ? 'border-primary/50 bg-primary/5 shadow-xs'
                            : isCompleted
                              ? 'border-emerald-500/30 bg-emerald-500/5'
                              : 'border-border/60 bg-muted/20 opacity-60'
                        )}
                      >
                        <div
                          className={cn(
                            'flex size-10 shrink-0 items-center justify-center rounded-lg font-semibold transition-colors',
                            isCurrent
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : isCompleted
                                ? 'bg-emerald-600 text-white'
                                : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {isCompleted ? (
                            <Check className='size-5' />
                          ) : (
                            <Icon className='size-5' />
                          )}
                        </div>

                        <div className='min-w-0 flex-1'>
                          <div className='flex items-center justify-between'>
                            <p
                              className={cn(
                                'text-sm font-semibold',
                                isCurrent
                                  ? 'text-primary'
                                  : isCompleted
                                    ? 'text-emerald-700 dark:text-emerald-400'
                                    : 'text-foreground'
                              )}
                            >
                              {s.title}
                            </p>
                            {isCompleted && (
                              <span className='text-xs font-medium text-emerald-600 dark:text-emerald-400'>
                                <CheckCircle2 className='inline size-3.5' />
                              </span>
                            )}
                          </div>
                          <p className='text-muted-foreground mt-0.5 text-xs'>
                            {s.desc}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Feature Highlights Card */}
                <div className='bg-card text-card-foreground border-border/80 rounded-xl border p-4 shadow-2xs'>
                  <p className='text-muted-foreground mb-3 text-xs font-semibold tracking-wider uppercase'>
                    {t('setup.features.title')}
                  </p>
                  <div className='space-y-3'>
                    <div className='flex items-start gap-3'>
                      <div className='bg-primary/10 text-primary mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md'>
                        <ShieldCheck className='size-3.5' />
                      </div>
                      <div>
                        <p className='text-xs font-medium'>
                          {t('setup.features.feat1.title')}
                        </p>
                        <p className='text-muted-foreground text-xs'>
                          {t('setup.features.feat1.desc')}
                        </p>
                      </div>
                    </div>

                    <div className='flex items-start gap-3'>
                      <div className='bg-primary/10 text-primary mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md'>
                        <Layers className='size-3.5' />
                      </div>
                      <div>
                        <p className='text-xs font-medium'>
                          {t('setup.features.feat2.title')}
                        </p>
                        <p className='text-muted-foreground text-xs'>
                          {t('setup.features.feat2.desc')}
                        </p>
                      </div>
                    </div>

                    <div className='flex items-start gap-3'>
                      <div className='bg-primary/10 text-primary mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md'>
                        <Server className='size-3.5' />
                      </div>
                      <div>
                        <p className='text-xs font-medium'>
                          {t('setup.features.feat3.title')}
                        </p>
                        <p className='text-muted-foreground text-xs'>
                          {t('setup.features.feat3.desc')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Monorepo Stack Info */}
              <div className='text-muted-foreground hidden items-center gap-2 text-xs lg:flex'>
                <Badge variant='outline' className='text-[10px]'>
                  Turborepo
                </Badge>
                <span>•</span>
                <span>NestJS 11</span>
                <span>•</span>
                <span>Next.js</span>
                <span>•</span>
                <span>Vite + React 19</span>
              </div>
            </div>

            {/* Right Column: Interactive Form Card */}
            <div className='lg:col-span-7'>
              <Card className='border-border/80 relative overflow-hidden shadow-sm'>
                {/* Progress bar line */}
                <div className='bg-muted h-1.5 w-full'>
                  <div
                    className='bg-primary h-full transition-all duration-300'
                    style={{
                      width:
                        step === 1
                          ? '25%'
                          : step === 2
                            ? '50%'
                            : step === 3
                              ? '75%'
                              : '100%',
                    }}
                  />
                </div>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)}>
                    {/* STEP 1: BRAND & WEBSITE DETAILS */}
                    {step === 1 && (
                      <>
                        <CardHeader className='pb-4'>
                          <div className='flex items-center gap-2'>
                            <div className='bg-primary/10 text-primary flex size-8 items-center justify-center rounded-md'>
                              <Globe className='size-4' />
                            </div>
                            <div>
                              <CardTitle className='text-lg font-bold'>
                                {t('setup.websiteDetails')}
                              </CardTitle>
                              <CardDescription>
                                {t('setup.websiteNameHelp')}
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className='space-y-6 pt-2'>
                          <FormField
                            control={form.control}
                            name='site_brand'
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className='font-semibold'>
                                  {t('setup.websiteName')}
                                </FormLabel>
                                <FormControl>
                                  <div className='relative'>
                                    <Input
                                      placeholder={t(
                                        'setup.websiteNamePlaceholder'
                                      )}
                                      className='h-11 pl-10 text-base'
                                      autoFocus
                                      {...field}
                                    />
                                    <Globe className='text-muted-foreground absolute top-3 left-3 size-5' />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Live Brand Preview Box */}
                          <div className='bg-muted/40 rounded-xl border border-dashed p-4'>
                            <div className='mb-2 flex items-center justify-between'>
                              <span className='text-muted-foreground text-xs font-medium'>
                                {t('setup.brandPreview')}
                              </span>
                              <Badge variant='outline' className='text-[10px]'>
                                Mockup Tab
                              </Badge>
                            </div>

                            {/* Simulated browser tab preview */}
                            <div className='bg-background border-border/80 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs shadow-2xs'>
                              <div className='bg-primary/20 flex size-4 items-center justify-center rounded-xs'>
                                <Sparkles className='text-primary size-2.5' />
                              </div>
                              <span className='truncate font-medium'>
                                {siteBrandValue.trim() || 'My Platform'} — Admin
                                Portal
                              </span>
                            </div>
                          </div>
                        </CardContent>

                        <CardFooter className='border-border/40 bg-muted/10 flex justify-end border-t pt-4'>
                          <Button
                            type='button'
                            size='lg'
                            onClick={handleNextFromStep1}
                            className='gap-2'
                          >
                            {t('setup.button.continue')}
                            <ArrowRight className='size-4' />
                          </Button>
                        </CardFooter>
                      </>
                    )}

                    {/* STEP 2: THEME BUILDER & PALETTE */}
                    {step === 2 && (
                      <>
                        <CardHeader className='pb-4'>
                          <div className='flex items-center justify-between'>
                            <div className='flex items-center gap-2'>
                              <div className='bg-primary/10 text-primary flex size-8 items-center justify-center rounded-md'>
                                <Palette className='size-4' />
                              </div>
                              <div>
                                <CardTitle className='text-lg font-bold'>
                                  {t('setup.theme.builderTitle')}
                                </CardTitle>
                                <CardDescription>
                                  {t('setup.theme.builderDesc')}
                                </CardDescription>
                              </div>
                            </div>

                            {isCustomModified && (
                              <Badge variant='default' className='text-xs'>
                                {t('setup.theme.customActiveBadge')}
                              </Badge>
                            )}
                          </div>
                        </CardHeader>

                        <CardContent className='space-y-5 pt-2'>
                          {/* Tabs: Presets vs Custom Token Editor */}
                          <Tabs
                            value={activeThemeTab}
                            onValueChange={(val) =>
                              setActiveThemeTab(val as 'presets' | 'custom')
                            }
                            className='w-full space-y-4'
                          >
                            <div className='flex items-center justify-between'>
                              <TabsList className='grid w-full grid-cols-2 sm:w-80'>
                                <TabsTrigger
                                  value='presets'
                                  className='gap-2 text-xs'
                                >
                                  <Palette className='size-3.5' />
                                  {t('setup.theme.tabPresets')}
                                </TabsTrigger>
                                <TabsTrigger
                                  value='custom'
                                  className='gap-2 text-xs'
                                >
                                  <Sliders className='size-3.5' />
                                  {t('setup.theme.tabCustom')}
                                </TabsTrigger>
                              </TabsList>

                              {selectedThemeKey !== 'blue' && (
                                <Button
                                  type='button'
                                  variant='ghost'
                                  size='sm'
                                  onClick={() => handleSelectTheme('blue')}
                                  className='hidden h-8 gap-1.5 text-xs sm:inline-flex'
                                >
                                  <RotateCcw className='size-3.5' />
                                  {t('setup.theme.resetDefault')}
                                </Button>
                              )}
                            </div>

                            {/* TAB 1: PRESET PALETTES */}
                            <TabsContent
                              value='presets'
                              className='mt-0 space-y-5'
                            >
                              {/* Active Theme Bar */}
                              <div className='bg-muted/40 flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between'>
                                <div className='flex items-center gap-3'>
                                  <div
                                    className='border-background size-7 shrink-0 rounded-full border-2 shadow-xs'
                                    style={{
                                      backgroundColor:
                                        themeColors[
                                          selectedThemeKey as keyof typeof themeColors
                                        ]?.light['--primary'] || '#2563eb',
                                    }}
                                  />
                                  <div>
                                    <div className='flex items-center gap-2'>
                                      <span className='text-muted-foreground text-xs'>
                                        {t('setup.theme.selected')}
                                      </span>
                                      <span className='text-sm font-bold'>
                                        {THEME_NAMES[selectedThemeKey] ||
                                          selectedThemeKey}
                                      </span>
                                      <Badge
                                        variant={
                                          selectedThemeKey === 'blue'
                                            ? 'secondary'
                                            : 'default'
                                        }
                                        className='text-[10px]'
                                      >
                                        {selectedThemeKey === 'blue'
                                          ? 'Default'
                                          : 'Preset'}
                                      </Badge>
                                    </div>
                                    <p className='text-muted-foreground text-xs'>
                                      {t('setup.theme.presetsDesc')}
                                    </p>
                                  </div>
                                </div>

                                {selectedThemeKey !== 'blue' && (
                                  <Button
                                    type='button'
                                    variant='ghost'
                                    size='sm'
                                    onClick={() => handleSelectTheme('blue')}
                                    className='h-8 gap-1.5 self-start text-xs sm:hidden'
                                  >
                                    <RotateCcw className='size-3.5' />
                                    {t('setup.theme.resetDefault')}
                                  </Button>
                                )}
                              </div>

                              {/* Presets Grid */}
                              <div className='space-y-2.5'>
                                <div className='flex items-center justify-between'>
                                  <span className='text-muted-foreground text-xs font-semibold tracking-wider uppercase'>
                                    {t('setup.theme.presetsTitle')}
                                  </span>
                                  <span className='text-muted-foreground text-[11px]'>
                                    14 Presets
                                  </span>
                                </div>

                                <div className='grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4'>
                                  {Object.entries(themeColors).map(
                                    ([key, val]) => {
                                      const isSelected =
                                        selectedThemeKey === key &&
                                        !isCustomModified
                                      const colorDef = val.light
                                      const primaryColor = colorDef['--primary']
                                      const chart1 =
                                        colorDef['--chart-1'] || primaryColor
                                      const chart2 =
                                        colorDef['--chart-2'] || primaryColor

                                      return (
                                        <button
                                          key={key}
                                          type='button'
                                          onClick={() =>
                                            handleSelectTheme(
                                              key as keyof typeof themeColors
                                            )
                                          }
                                          className={cn(
                                            'group relative flex cursor-pointer flex-col items-start rounded-xl border p-3 text-left transition-all duration-200',
                                            isSelected
                                              ? 'border-primary ring-primary/20 bg-primary/5 shadow-xs ring-2'
                                              : 'border-border/70 hover:border-border hover:bg-muted/40'
                                          )}
                                        >
                                          <div className='mb-2 flex w-full items-center justify-between'>
                                            <div className='flex items-center -space-x-1.5'>
                                              <span
                                                className='border-background size-5 shrink-0 rounded-full border shadow-xs'
                                                style={{
                                                  backgroundColor: primaryColor,
                                                }}
                                              />
                                              <span
                                                className='border-background size-4 shrink-0 rounded-full border opacity-80 shadow-xs'
                                                style={{
                                                  backgroundColor: chart1,
                                                }}
                                              />
                                              <span
                                                className='border-background size-3.5 shrink-0 rounded-full border opacity-60 shadow-xs'
                                                style={{
                                                  backgroundColor: chart2,
                                                }}
                                              />
                                            </div>
                                            {isSelected && (
                                              <span className='bg-primary text-primary-foreground flex size-4 items-center justify-center rounded-full'>
                                                <Check className='size-2.5' />
                                              </span>
                                            )}
                                          </div>

                                          <span
                                            className={cn(
                                              'line-clamp-1 text-xs leading-tight font-semibold',
                                              isSelected
                                                ? 'text-primary'
                                                : 'text-foreground'
                                            )}
                                          >
                                            {THEME_NAMES[key] || key}
                                          </span>
                                          <span className='text-muted-foreground mt-0.5 text-[10px] capitalize'>
                                            {key}
                                          </span>
                                        </button>
                                      )
                                    }
                                  )}
                                </div>
                              </div>

                              {/* Live Component Preview */}
                              <div className='bg-muted/20 space-y-3 rounded-xl border p-4'>
                                <div className='flex items-center justify-between'>
                                  <div className='flex items-center gap-2'>
                                    <Sparkles className='text-primary size-3.5' />
                                    <span className='text-foreground text-xs font-semibold'>
                                      {t('setup.theme.previewTitle')}
                                    </span>
                                  </div>
                                  <Badge
                                    variant='outline'
                                    className='text-[10px]'
                                  >
                                    {t('setup.theme.sampleBadge')}
                                  </Badge>
                                </div>

                                <p className='text-muted-foreground text-xs'>
                                  {t('setup.theme.previewDesc')}
                                </p>

                                <div className='flex flex-wrap items-center gap-2 pt-1'>
                                  <Button type='button' size='sm'>
                                    {t('setup.theme.sampleAction')}
                                  </Button>
                                  <Button
                                    type='button'
                                    size='sm'
                                    variant='secondary'
                                  >
                                    {t('setup.theme.sampleSecondary')}
                                  </Button>
                                  <Button
                                    type='button'
                                    size='sm'
                                    variant='outline'
                                  >
                                    {t('setup.theme.sampleOutline')}
                                  </Button>
                                  <Button
                                    type='button'
                                    size='sm'
                                    variant='destructive'
                                  >
                                    {t('setup.theme.sampleDestructive')}
                                  </Button>
                                </div>
                              </div>
                            </TabsContent>

                            {/* TAB 2: ADVANCED TOKEN EDITOR */}
                            <TabsContent
                              value='custom'
                              className='mt-0 space-y-4'
                            >
                              <div className='bg-muted/30 text-muted-foreground flex items-center justify-between rounded-xl border p-3 text-xs'>
                                <span>{t('setup.theme.customNotice')}</span>
                                <Button
                                  type='button'
                                  variant='outline'
                                  size='sm'
                                  className='h-7 gap-1 text-xs'
                                  onClick={() => handleSelectTheme('blue')}
                                >
                                  <RotateCcw className='size-3' />
                                  {t('setup.theme.resetDefault')}
                                </Button>
                              </div>

                              <div className='border-border/80 max-h-[560px] overflow-y-auto rounded-xl border shadow-2xs'>
                                <ThemeTokenEditor
                                  value={customStyles}
                                  mode={editorMode}
                                  onModeChange={setEditorMode}
                                  onChange={handleCustomStylesChange}
                                />
                              </div>
                            </TabsContent>
                          </Tabs>
                        </CardContent>

                        <CardFooter className='border-border/40 bg-muted/10 flex items-center justify-between border-t pt-4'>
                          <Button
                            type='button'
                            variant='outline'
                            size='lg'
                            onClick={() => setStep(1)}
                            className='gap-2'
                          >
                            <ArrowLeft className='size-4' />
                            {t('setup.button.back')}
                          </Button>

                          <div className='flex items-center gap-2'>
                            <Button
                              type='button'
                              variant='ghost'
                              size='lg'
                              onClick={handleSkipToDefault}
                              className='text-muted-foreground hover:text-foreground'
                            >
                              {t('setup.theme.skipDefault')}
                            </Button>
                            <Button
                              type='button'
                              size='lg'
                              onClick={handleNextFromStep2}
                              className='gap-2'
                            >
                              {t('setup.button.continue')}
                              <ArrowRight className='size-4' />
                            </Button>
                          </div>
                        </CardFooter>
                      </>
                    )}

                    {/* STEP 3: SUPER ADMINISTRATOR ACCOUNT */}
                    {step === 3 && (
                      <>
                        <CardHeader className='pb-4'>
                          <div className='flex items-center gap-2'>
                            <div className='bg-primary/10 text-primary flex size-8 items-center justify-center rounded-md'>
                              <ShieldCheck className='size-4' />
                            </div>
                            <div>
                              <CardTitle className='text-lg font-bold'>
                                {t('setup.adminAccount')}
                              </CardTitle>
                              <CardDescription>
                                {t('setup.adminAccountHelp')}
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className='space-y-4 pt-2'>
                          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                            <FormField
                              control={form.control}
                              name='firstName'
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t('setup.firstName')}</FormLabel>
                                  <FormControl>
                                    <div className='relative'>
                                      <Input
                                        placeholder='John'
                                        className='pl-9'
                                        autoFocus
                                        {...field}
                                      />
                                      <User className='text-muted-foreground absolute top-2.5 left-3 size-4' />
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name='lastName'
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t('setup.lastName')}</FormLabel>
                                  <FormControl>
                                    <div className='relative'>
                                      <Input
                                        placeholder='Doe'
                                        className='pl-9'
                                        {...field}
                                      />
                                      <User className='text-muted-foreground absolute top-2.5 left-3 size-4' />
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={form.control}
                            name='email'
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t('setup.email')}</FormLabel>
                                <FormControl>
                                  <div className='relative'>
                                    <Input
                                      placeholder='admin@example.com'
                                      type='email'
                                      className='pl-9'
                                      {...field}
                                    />
                                    <Mail className='text-muted-foreground absolute top-2.5 left-3 size-4' />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                            <FormField
                              control={form.control}
                              name='password'
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t('setup.password')}</FormLabel>
                                  <FormControl>
                                    <PasswordInput
                                      placeholder='••••••••'
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name='confirmPassword'
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>
                                    {t('setup.confirmPassword')}
                                  </FormLabel>
                                  <FormControl>
                                    <PasswordInput
                                      placeholder='••••••••'
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          {/* Real-time Password Requirements Checklist */}
                          <div className='bg-muted/40 rounded-xl border p-4'>
                            <p className='text-muted-foreground mb-2 text-xs font-semibold'>
                              {t('setup.pwdReq.title')}
                            </p>
                            <div className='grid grid-cols-1 gap-1.5 sm:grid-cols-2'>
                              {passwordCriteria.map((item) => (
                                <div
                                  key={item.key}
                                  className='flex items-center gap-2 text-xs'
                                >
                                  {item.valid ? (
                                    <CheckCircle2 className='size-3.5 text-emerald-600 dark:text-emerald-400' />
                                  ) : (
                                    <Circle className='text-muted-foreground/60 size-3.5' />
                                  )}
                                  <span
                                    className={cn(
                                      item.valid
                                        ? 'font-medium text-emerald-700 dark:text-emerald-300'
                                        : 'text-muted-foreground'
                                    )}
                                  >
                                    {item.label}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </CardContent>

                        <CardFooter className='border-border/40 bg-muted/10 flex items-center justify-between border-t pt-4'>
                          <Button
                            type='button'
                            variant='outline'
                            size='lg'
                            onClick={() => setStep(2)}
                            className='gap-2'
                          >
                            <ArrowLeft className='size-4' />
                            {t('setup.button.back')}
                          </Button>
                          <Button
                            type='button'
                            size='lg'
                            onClick={handleNextFromStep3}
                            className='gap-2'
                          >
                            {t('setup.button.continue')}
                            <ArrowRight className='size-4' />
                          </Button>
                        </CardFooter>
                      </>
                    )}

                    {/* STEP 4: REVIEW & DEPLOYMENT */}
                    {step === 4 && (
                      <>
                        <CardHeader className='pb-4'>
                          <div className='flex items-center gap-2'>
                            <div className='bg-primary/10 text-primary flex size-8 items-center justify-center rounded-md'>
                              <Rocket className='size-4' />
                            </div>
                            <div>
                              <CardTitle className='text-lg font-bold'>
                                {t('setup.review.title')}
                              </CardTitle>
                              <CardDescription>
                                {t('setup.review.description')}
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className='space-y-4 pt-2'>
                          {/* Configuration Summary Cards */}
                          <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                            {/* Platform Details */}
                            <div className='bg-card space-y-1.5 rounded-xl border p-3.5'>
                              <div className='text-muted-foreground flex items-center gap-2 text-xs font-semibold'>
                                <Globe className='size-3.5' />
                                {t('setup.review.siteDetails')}
                              </div>
                              <p className='text-foreground truncate text-sm font-bold'>
                                {siteBrandValue.trim() || 'Default Brand'}
                              </p>
                              <Badge variant='outline' className='text-[10px]'>
                                {t('setup.review.siteName')}
                              </Badge>
                            </div>

                            {/* Theme Details */}
                            <div className='bg-card space-y-1.5 rounded-xl border p-3.5'>
                              <div className='text-muted-foreground flex items-center gap-2 text-xs font-semibold'>
                                <Palette className='size-3.5' />
                                {t('setup.review.themeColor')}
                              </div>
                              <div className='flex items-center gap-2'>
                                <span
                                  className='size-3.5 shrink-0 rounded-full border shadow-xs'
                                  style={{
                                    backgroundColor: isCustomModified
                                      ? customStyles.light.primary || '#2563eb'
                                      : themeColors[
                                          selectedThemeKey as keyof typeof themeColors
                                        ]?.light['--primary'] || '#2563eb',
                                  }}
                                />
                                <p className='text-foreground truncate text-sm font-bold'>
                                  {isCustomModified
                                    ? t('setup.review.customTheme')
                                    : THEME_NAMES[selectedThemeKey] ||
                                      selectedThemeKey}
                                </p>
                              </div>
                              <Badge
                                variant={
                                  isCustomModified
                                    ? 'default'
                                    : selectedThemeKey === 'blue'
                                      ? 'secondary'
                                      : 'default'
                                }
                                className='text-[10px]'
                              >
                                {isCustomModified
                                  ? t('setup.theme.customActiveBadge')
                                  : selectedThemeKey === 'blue'
                                    ? 'Default'
                                    : 'Preset'}
                              </Badge>
                            </div>

                            {/* Superadmin Details */}
                            <div className='bg-card space-y-1.5 rounded-xl border p-3.5 sm:col-span-2'>
                              <div className='text-muted-foreground flex items-center gap-2 text-xs font-semibold'>
                                <ShieldCheck className='size-3.5' />
                                {t('setup.review.adminDetails')}
                              </div>
                              <p className='text-foreground truncate text-sm font-bold'>
                                {firstNameValue} {lastNameValue}
                              </p>
                              <p className='text-muted-foreground truncate text-xs'>
                                {emailValue}
                              </p>
                            </div>
                          </div>

                          {/* Role and Permissions Info */}
                          <div className='bg-primary/5 border-primary/20 flex items-center justify-between rounded-xl border p-3.5'>
                            <div className='flex items-center gap-3'>
                              <div className='bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg font-bold'>
                                <Lock className='size-4' />
                              </div>
                              <div>
                                <p className='text-xs font-semibold'>
                                  {t('setup.review.role')}
                                </p>
                                <p className='text-muted-foreground text-xs'>
                                  {t('setup.review.roleValue')}
                                </p>
                              </div>
                            </div>
                            <Badge variant='default' className='text-xs'>
                              Root Admin
                            </Badge>
                          </div>

                          {/* Foundational Seeds Preview */}
                          <div className='bg-muted/40 space-y-2.5 rounded-xl border p-4'>
                            <div className='text-foreground flex items-center gap-2 text-xs font-semibold'>
                              <Database className='text-primary size-4' />
                              {t('setup.review.seedDetails')}
                            </div>

                            <ul className='text-muted-foreground space-y-1.5 text-xs'>
                              <li className='flex items-center gap-2'>
                                <Check className='size-3.5 text-emerald-600' />
                                <span>{t('setup.review.seedThemes')}</span>
                              </li>
                              <li className='flex items-center gap-2'>
                                <Check className='size-3.5 text-emerald-600' />
                                <span>{t('setup.review.seedCms')}</span>
                              </li>
                              <li className='flex items-center gap-2'>
                                <Check className='size-3.5 text-emerald-600' />
                                <span>{t('setup.review.seedLocations')}</span>
                              </li>
                              <li className='flex items-center gap-2'>
                                <Check className='size-3.5 text-emerald-600' />
                                <span>{t('setup.review.seedRbac')}</span>
                              </li>
                            </ul>
                          </div>
                        </CardContent>

                        <CardFooter className='border-border/40 bg-muted/10 flex items-center justify-between border-t pt-4'>
                          <Button
                            type='button'
                            variant='outline'
                            size='lg'
                            onClick={() => setStep(3)}
                            disabled={isPending}
                            className='gap-2'
                          >
                            <ArrowLeft className='size-4' />
                            {t('setup.button.back')}
                          </Button>

                          <Button
                            type='submit'
                            size='lg'
                            disabled={isPending}
                            className='min-w-44 gap-2 font-semibold'
                          >
                            {isPending ? (
                              <>
                                <span className='size-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
                                {t('setup.button.submitting')}
                              </>
                            ) : (
                              <>
                                <Rocket className='size-4' />
                                {t('setup.button.submit')}
                              </>
                            )}
                          </Button>
                        </CardFooter>
                      </>
                    )}
                  </form>
                </Form>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
