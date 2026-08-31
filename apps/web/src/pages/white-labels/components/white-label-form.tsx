import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm, useWatch, type UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Code2Icon,
  DownloadIcon,
  Eye,
  FileCodeIcon,
  ImageIcon,
  Paintbrush,
  RotateCcw,
  RotateCcwIcon,
  Save,
  Search,
  Sparkles,
  SparklesIcon,
  Trash2,
  UploadIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  cloneDefaultThemeStyles,
  defaultThemeStyles,
  type ThemeMode,
  type ThemeStyles,
} from '@/lib/theme-builder/default-theme'
import {
  downloadThemeJson,
  generateThemeCss,
  parseThemeCss,
} from '@/lib/theme-builder/theme-utils'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  type WhiteLabelFormSchema,
  type WhiteLabelSchema,
  whiteLabelFormSchema,
} from '../schema'
import { ThemeTokenEditor } from './theme-token-editor'
import { WhiteLabelPreview } from './white-label-preview'

type WhiteLabelFormProps = {
  initialData?: WhiteLabelSchema | null
  isSubmitting?: boolean
  onSubmit: (data: WhiteLabelFormSchema) => void
  onCancel?: () => void
}

type TabType = 'brand' | 'colors' | 'seo' | 'preview'

export function WhiteLabelForm({
  initialData,
  isSubmitting,
  onSubmit,
  onCancel,
}: WhiteLabelFormProps) {
  const [activeTab, setActiveTab] = useState<TabType>('brand')
  const [editorMode, setEditorMode] = useState<ThemeMode>('light')
  const [isCodeDialogOpen, setIsCodeDialogOpen] = useState(false)
  const [isPasteCssDialogOpen, setIsPasteCssDialogOpen] = useState(false)
  const [pastedCssText, setPastedCssText] = useState('')
  const [pasteScope, setPasteScope] = useState<
    'auto' | 'current' | 'light' | 'dark'
  >('auto')

  const cssInputRef = useRef<HTMLInputElement>(null)
  const jsonInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<WhiteLabelFormSchema>({
    resolver: zodResolver(whiteLabelFormSchema),
    defaultValues: {
      name: initialData?.name ?? '',
      description: initialData?.description ?? '',
      target: initialData?.target ?? 'admin',
      isActive: initialData?.isActive ?? false,
      brandName: initialData?.brandName ?? '',
      siteTitle: initialData?.siteTitle ?? '',
      siteTagline: initialData?.siteTagline ?? '',
      copyrightText: initialData?.copyrightText ?? '',
      metaTitle: initialData?.metaTitle ?? '',
      metaDescription: initialData?.metaDescription ?? '',
      canonicalUrl: initialData?.canonicalUrl ?? '',
      styles: initialData?.styles ?? defaultThemeStyles,
      site_logo: undefined,
      site_dark_logo: undefined,
      site_favicon: undefined,
      og_image: undefined,
      twitter_image: undefined,
      remove_site_logo: false,
      remove_site_dark_logo: false,
      remove_site_favicon: false,
      remove_og_image: false,
      remove_twitter_image: false,
    },
  })

  const watchedBrandName = useWatch({
    control: form.control,
    name: 'brandName',
  })
  const watchedSiteTitle = useWatch({
    control: form.control,
    name: 'siteTitle',
  })
  const watchedSiteTagline = useWatch({
    control: form.control,
    name: 'siteTagline',
  })
  const watchedStyles = useWatch({ control: form.control, name: 'styles' })
  const watchedName = useWatch({ control: form.control, name: 'name' })
  const watchedSiteLogo = useWatch({ control: form.control, name: 'site_logo' })
  const watchedSiteDarkLogo = useWatch({
    control: form.control,
    name: 'site_dark_logo',
  })
  const watchedSiteFavicon = useWatch({
    control: form.control,
    name: 'site_favicon',
  })
  const watchedRemoveSiteLogo = useWatch({
    control: form.control,
    name: 'remove_site_logo',
  })
  const watchedRemoveSiteDarkLogo = useWatch({
    control: form.control,
    name: 'remove_site_dark_logo',
  })
  const watchedRemoveSiteFavicon = useWatch({
    control: form.control,
    name: 'remove_site_favicon',
  })

  const currentStyles = watchedStyles || defaultThemeStyles
  const cssText = useMemo(
    () => generateThemeCss(currentStyles),
    [currentStyles]
  )

  const previewLogoUrl = useMemo(() => {
    if (watchedRemoveSiteLogo) return null
    if (watchedSiteLogo instanceof File)
      return URL.createObjectURL(watchedSiteLogo)
    return initialData?.siteLogo || null
  }, [watchedSiteLogo, watchedRemoveSiteLogo, initialData?.siteLogo])

  const previewDarkLogoUrl = useMemo(() => {
    if (watchedRemoveSiteDarkLogo) return null
    if (watchedSiteDarkLogo instanceof File)
      return URL.createObjectURL(watchedSiteDarkLogo)
    return initialData?.siteDarkLogo || null
  }, [
    watchedSiteDarkLogo,
    watchedRemoveSiteDarkLogo,
    initialData?.siteDarkLogo,
  ])

  const previewFaviconUrl = useMemo(() => {
    if (watchedRemoveSiteFavicon) return null
    if (watchedSiteFavicon instanceof File)
      return URL.createObjectURL(watchedSiteFavicon)
    return initialData?.siteFavicon || null
  }, [watchedSiteFavicon, watchedRemoveSiteFavicon, initialData?.siteFavicon])

  const updateStyles = (newStyles: ThemeStyles) => {
    form.setValue('styles', newStyles, {
      shouldDirty: true,
      shouldValidate: true,
    })
  }

  const copyCss = async () => {
    await navigator.clipboard.writeText(cssText)
    toast.success('Theme CSS copied to clipboard')
  }

  const importCssFile = async (file?: File) => {
    if (!file) return
    try {
      const content = await file.text()
      updateStyles(parseThemeCss(content, currentStyles))
      toast.success('CSS variables imported successfully')
    } catch {
      toast.error('Failed to parse CSS file')
    } finally {
      if (cssInputRef.current) cssInputRef.current.value = ''
    }
  }

  const importJsonFile = async (file?: File) => {
    if (!file) return
    try {
      const data = JSON.parse(await file.text())
      updateStyles(data.styles ?? data)
      toast.success('Theme JSON imported successfully')
    } catch {
      toast.error('Invalid theme JSON file')
    } finally {
      if (jsonInputRef.current) jsonInputRef.current.value = ''
    }
  }

  const applyPastedCss = () => {
    if (!pastedCssText.trim()) {
      toast.error('Please paste CSS variables')
      return
    }
    try {
      const scopeParam =
        pasteScope === 'auto'
          ? undefined
          : pasteScope === 'current'
            ? editorMode
            : pasteScope
      const parsed = parseThemeCss(pastedCssText, currentStyles, scopeParam)
      updateStyles(parsed)
      toast.success('CSS variables injected into theme successfully!')
      setIsPasteCssDialogOpen(false)
      setPastedCssText('')
    } catch {
      toast.error('Failed to parse CSS syntax')
    }
  }

  const loadSampleCss = () => {
    setPastedCssText(`:root {
  --background: oklch(0.99 0 0);
  --foreground: oklch(0.141 0.005 285.823);
  --primary: oklch(0.488 0.243 264.376);
  --primary-foreground: oklch(0.97 0.014 254.604);
  --secondary: oklch(0.967 0.001 286.375);
  --secondary-foreground: oklch(0.21 0.006 285.885);
  --muted: oklch(0.967 0.001 286.375);
  --muted-foreground: oklch(0.552 0.016 285.938);
  --accent: oklch(0.967 0.001 286.375);
  --accent-foreground: oklch(0.21 0.006 285.885);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.92 0.004 286.32);
  --input: oklch(0.92 0.004 286.32);
  --ring: oklch(0.708 0 0);
  --radius: 0.65rem;
}

.dark {
  --background: oklch(0.141 0.005 285.823);
  --foreground: oklch(0.985 0 0);
  --primary: oklch(0.488 0.243 264.376);
  --primary-foreground: oklch(0.97 0.014 254.604);
  --secondary: oklch(0.274 0.006 286.033);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.274 0.006 286.033);
  --muted-foreground: oklch(0.705 0.015 286.067);
  --accent: oklch(0.274 0.006 286.033);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
}`)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
        {/* Hidden file pickers for direct CSS & JSON import */}
        <input
          ref={cssInputRef}
          type='file'
          accept='.css,text/css'
          className='hidden'
          onChange={(e) => importCssFile(e.target.files?.[0])}
        />
        <input
          ref={jsonInputRef}
          type='file'
          accept='.json,application/json'
          className='hidden'
          onChange={(e) => importJsonFile(e.target.files?.[0])}
        />

        {/* Top Control Bar: Tabs + Action buttons */}
        <div className='flex flex-wrap items-center justify-between gap-3 border-b pb-4'>
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as TabType)}
            className='w-full sm:w-auto'
          >
            <TabsList className='grid w-full grid-cols-2 sm:flex sm:w-auto'>
              <TabsTrigger value='brand' className='gap-1.5'>
                <Sparkles className='size-4' />
                <span>Brand & Assets</span>
              </TabsTrigger>
              <TabsTrigger value='colors' className='gap-1.5'>
                <Paintbrush className='size-4' />
                <span>Colors & Fonts</span>
              </TabsTrigger>
              <TabsTrigger value='seo' className='gap-1.5'>
                <Search className='size-4' />
                <span>SEO & Meta</span>
              </TabsTrigger>
              <TabsTrigger value='preview' className='gap-1.5'>
                <Eye className='text-primary size-4' />
                <span>Live Preview</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className='flex items-center gap-2'>
            {onCancel && (
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='h-8 text-xs'
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}

            <Button
              type='submit'
              size='sm'
              disabled={isSubmitting}
              className='h-8 gap-1.5 text-xs'
            >
              <Save className='size-3.5' />
              {isSubmitting ? 'Saving...' : 'Save Profile'}
            </Button>
          </div>
        </div>

        {/* Tab 1: Brand & Assets (Full Width Clean Form) */}
        {activeTab === 'brand' && (
          <div className='space-y-6'>
            <Card>
              <CardHeader>
                <CardTitle className='text-base font-semibold'>
                  Profile Configuration
                </CardTitle>
                <CardDescription>
                  Profile name, target application scope, and activation status.
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='grid gap-4 sm:grid-cols-2'>
                  <FormField
                    control={form.control}
                    name='name'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Profile Name *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder='e.g., Default Blue, Acme Corp'
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name='target'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Scope</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className='flex items-center gap-4 pt-1.5'
                          >
                            <div className='flex items-center space-x-2'>
                              <RadioGroupItem value='admin' id='target-admin' />
                              <label
                                htmlFor='target-admin'
                                className='cursor-pointer text-sm leading-none font-medium'
                              >
                                Admin Portal
                              </label>
                            </div>
                            <div className='flex items-center space-x-2'>
                              <RadioGroupItem
                                value='client'
                                id='target-client'
                              />
                              <label
                                htmlFor='target-client'
                                className='cursor-pointer text-sm leading-none font-medium'
                              >
                                Client App
                              </label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name='description'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={2}
                          placeholder='Brief description of this white label profile'
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='isActive'
                  render={({ field }) => (
                    <FormItem className='flex items-center justify-between rounded-lg border p-3 shadow-xs'>
                      <div className='space-y-0.5'>
                        <FormLabel className='text-sm font-medium'>
                          Set as Active Profile
                        </FormLabel>
                        <FormDescription className='text-xs'>
                          When active, this profile immediately drives the
                          branding and theme across the selected target.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className='text-base font-semibold'>
                  Brand Identity & Copy
                </CardTitle>
                <CardDescription>
                  Brand names and slogans displayed in headers, footers, and
                  auth screens.
                </CardDescription>
              </CardHeader>
              <CardContent className='grid gap-4 sm:grid-cols-2'>
                <FormField
                  control={form.control}
                  name='brandName'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder='e.g., Visel Art'
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='siteTitle'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Site Title</FormLabel>
                      <FormControl>
                        <Input
                          placeholder='e.g., Visel Art Admin Portal'
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='siteTagline'
                  render={({ field }) => (
                    <FormItem className='sm:col-span-2'>
                      <FormLabel>Tagline / Slogan</FormLabel>
                      <FormControl>
                        <Input
                          placeholder='e.g., Creative Art & Modern Management Platform'
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='copyrightText'
                  render={({ field }) => (
                    <FormItem className='sm:col-span-2'>
                      <FormLabel>Copyright Text</FormLabel>
                      <FormControl>
                        <Input
                          placeholder='e.g., © 2026 Visel Art. All rights reserved.'
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className='text-base font-semibold'>
                  Media & Logo Assets
                </CardTitle>
                <CardDescription>
                  Upload custom logos and icons (PNG, WebP, SVG, ICO max 5MB).
                </CardDescription>
              </CardHeader>
              <CardContent className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                <WhiteLabelAssetField
                  form={form}
                  name='site_logo'
                  removeName='remove_site_logo'
                  label='Light Mode Logo'
                  description='Used in sidebar and light themes'
                  previewUrl={initialData?.siteLogo}
                />
                <WhiteLabelAssetField
                  form={form}
                  name='site_dark_logo'
                  removeName='remove_site_dark_logo'
                  label='Dark Mode Logo'
                  description='Used in dark mode themes'
                  previewUrl={initialData?.siteDarkLogo}
                />
                <WhiteLabelAssetField
                  form={form}
                  name='site_favicon'
                  removeName='remove_site_favicon'
                  label='Favicon Icon'
                  description='Browser tab icon (PNG or ICO)'
                  previewUrl={initialData?.siteFavicon}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tab 2: OKLCH Colors & Fonts (Full Width Token Editor & Toolbar) */}
        {activeTab === 'colors' && (
          <div className='space-y-4'>
            {/* Top Toolbar: Import CSS/JSON, Paste CSS, Copy CSS, Export, Code View, Reset */}
            <div className='bg-card/70 flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2 shadow-xs'>
              <div className='flex min-w-0 flex-wrap items-center gap-2'>
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  className='h-8 gap-1.5 text-xs'
                  onClick={() => cssInputRef.current?.click()}
                >
                  <UploadIcon className='size-3.5' />
                  Import CSS File
                </Button>

                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  className='h-8 gap-1.5 text-xs'
                  onClick={() => setIsPasteCssDialogOpen(true)}
                >
                  <Code2Icon className='text-primary size-3.5' />
                  Paste CSS Variables
                </Button>

                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  className='h-8 gap-1.5 text-xs'
                  onClick={() => jsonInputRef.current?.click()}
                >
                  <UploadIcon className='size-3.5' />
                  Import JSON
                </Button>

                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  className='h-8 gap-1.5 text-xs'
                  onClick={copyCss}
                >
                  <FileCodeIcon className='size-3.5' />
                  Copy CSS
                </Button>

                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  className='h-8 gap-1.5 text-xs'
                  onClick={() =>
                    downloadThemeJson(
                      { name: watchedName || 'theme', styles: currentStyles },
                      `${watchedName || 'theme'}.json`
                        .toLowerCase()
                        .replace(/\s+/g, '-')
                    )
                  }
                >
                  <DownloadIcon className='size-3.5' />
                  Export JSON
                </Button>

                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  className='h-8 gap-1.5 text-xs'
                  onClick={() => setIsCodeDialogOpen(true)}
                >
                  <FileCodeIcon className='size-3.5' />
                  Code View
                </Button>

                <Button
                  type='button'
                  size='sm'
                  variant='ghost'
                  className='h-8 gap-1.5 text-xs'
                  onClick={() => {
                    updateStyles(cloneDefaultThemeStyles())
                    toast.success('Theme tokens reset to default blue')
                  }}
                >
                  <RotateCcwIcon className='size-3.5' />
                  Reset Tokens
                </Button>
              </div>

              <Button
                type='button'
                size='sm'
                variant='secondary'
                className='h-8 gap-1.5 text-xs font-medium'
                onClick={() => setActiveTab('preview')}
              >
                <Eye className='text-primary size-3.5' />
                <span>View Live Preview</span>
              </Button>
            </div>

            {/* Full-width Theme Token Editor */}
            <ThemeTokenEditor
              value={currentStyles}
              mode={editorMode}
              onModeChange={setEditorMode}
              onChange={updateStyles}
            />
          </div>
        )}

        {/* Tab 3: SEO & Meta */}
        {activeTab === 'seo' && (
          <Card>
            <CardHeader>
              <CardTitle className='text-base font-semibold'>
                Search Engine Optimization (SEO)
              </CardTitle>
              <CardDescription>
                Custom meta tags for browser title, search engine snippets, and
                social cards.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid gap-4 sm:grid-cols-2'>
                <FormField
                  control={form.control}
                  name='metaTitle'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meta Title</FormLabel>
                      <FormControl>
                        <Input
                          placeholder='e.g., Visel Art - Modern Admin'
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='canonicalUrl'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Canonical URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder='e.g., https://admin.viselart.com'
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name='metaDescription'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meta Description</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        placeholder='Search engine summary snippet...'
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className='grid gap-4 pt-2 sm:grid-cols-2'>
                <WhiteLabelAssetField
                  form={form}
                  name='og_image'
                  removeName='remove_og_image'
                  label='OpenGraph Image'
                  description='Social media share card preview'
                  previewUrl={initialData?.ogImage}
                />
                <WhiteLabelAssetField
                  form={form}
                  name='twitter_image'
                  removeName='remove_twitter_image'
                  label='Twitter Card Image'
                  description='Twitter/X summary card preview'
                  previewUrl={initialData?.twitterImage}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tab 4: Live Portal Preview (Full Width) */}
        {activeTab === 'preview' && (
          <div className='space-y-4'>
            <div className='bg-card flex items-center justify-between rounded-lg border p-3 shadow-xs'>
              <div>
                <p className='text-sm font-semibold'>Portal Live Simulation</p>
                <p className='text-muted-foreground text-xs'>
                  Real-time preview of brand identity, colors, typography, and
                  UI components.
                </p>
              </div>
              <Button
                type='button'
                size='sm'
                variant='outline'
                className='h-8 text-xs'
                onClick={() => setActiveTab('colors')}
              >
                <Paintbrush className='me-1.5 size-3.5' />
                Back to Color Editor
              </Button>
            </div>

            <WhiteLabelPreview
              styles={currentStyles}
              brandName={watchedBrandName}
              siteTitle={watchedSiteTitle}
              siteTagline={watchedSiteTagline}
              siteLogoUrl={previewLogoUrl}
              siteDarkLogoUrl={previewDarkLogoUrl}
              siteFaviconUrl={previewFaviconUrl}
            />
          </div>
        )}

        {/* Modal: Paste / Import CSS Variables */}
        <Dialog
          open={isPasteCssDialogOpen}
          onOpenChange={setIsPasteCssDialogOpen}
        >
          <DialogContent className='flex max-h-[80vh] flex-col overflow-hidden p-0 shadow-2xl sm:max-w-xl'>
            <DialogHeader className='border-b px-6 py-4'>
              <DialogTitle className='flex items-center gap-2 text-base font-semibold'>
                <Code2Icon className='text-primary size-5' />
                Paste & Inject CSS Variables
              </DialogTitle>
              <DialogDescription className='text-xs'>
                Paste CSS variables block containing <code>:root</code>,{' '}
                <code>.dark</code>, <code>@theme</code>, or direct{' '}
                <code>--variable: value</code> lines.
              </DialogDescription>
            </DialogHeader>

            <div className='flex-1 space-y-4 overflow-y-auto px-6 py-4'>
              <div className='flex items-center justify-between'>
                <Label className='text-xs font-medium'>CSS Code</Label>
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  className='h-6 px-2 text-[11px]'
                  onClick={loadSampleCss}
                >
                  <SparklesIcon className='text-primary me-1 size-3' />
                  Load Sample CSS
                </Button>
              </div>

              <Textarea
                rows={7}
                value={pastedCssText}
                onChange={(e) => setPastedCssText(e.target.value)}
                placeholder={`:root {\n  --primary: oklch(0.488 0.243 264.376);\n  --radius: 0.625rem;\n  ...\n}\n.dark {\n  --primary: oklch(0.488 0.243 264.376);\n  ...\n}`}
                className='max-h-48 font-mono text-xs'
              />

              <div className='space-y-1.5'>
                <Label className='text-xs font-medium'>Target Scope</Label>
                <RadioGroup
                  value={pasteScope}
                  onValueChange={(val) =>
                    setPasteScope(val as typeof pasteScope)
                  }
                  className='grid grid-cols-2 gap-2 text-xs'
                >
                  <div className='bg-muted/30 hover:bg-muted/50 flex items-center space-x-2 rounded-md border p-2.5 transition-colors'>
                    <RadioGroupItem value='auto' id='paste-auto' />
                    <Label
                      htmlFor='paste-auto'
                      className='cursor-pointer text-xs font-normal'
                    >
                      Auto-detect (:root & .dark)
                    </Label>
                  </div>
                  <div className='bg-muted/30 hover:bg-muted/50 flex items-center space-x-2 rounded-md border p-2.5 transition-colors'>
                    <RadioGroupItem value='current' id='paste-current' />
                    <Label
                      htmlFor='paste-current'
                      className='cursor-pointer text-xs font-normal'
                    >
                      Current Mode ({editorMode})
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            <DialogFooter className='bg-muted/30 flex items-center justify-end gap-3 border-t px-6 py-4'>
              <DialogClose asChild>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='h-8 text-xs'
                >
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type='button'
                size='sm'
                className='h-8 text-xs'
                onClick={applyPastedCss}
              >
                Inject Tokens
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal: Code View */}
        <Dialog open={isCodeDialogOpen} onOpenChange={setIsCodeDialogOpen}>
          <DialogContent className='max-h-[92vh] overflow-hidden p-0 sm:max-w-4xl'>
            <DialogHeader className='border-b px-6 py-5'>
              <DialogTitle className='text-base font-semibold'>
                Theme CSS Code View
              </DialogTitle>
              <DialogDescription className='text-xs'>
                Generated shadcn & Tailwind CSS variables matching your active
                profile.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className='max-h-[calc(92vh-10rem)]'>
              <pre className='bg-muted/40 overflow-x-auto p-6 font-mono text-xs leading-relaxed'>
                <code>{cssText}</code>
              </pre>
            </ScrollArea>
            <DialogFooter className='border-t px-6 py-4'>
              <Button
                type='button'
                size='sm'
                variant='outline'
                onClick={copyCss}
              >
                <FileCodeIcon className='me-1.5 size-4' />
                Copy CSS
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </form>
    </Form>
  )
}

function WhiteLabelAssetField({
  form,
  name,
  removeName,
  label,
  description,
  previewUrl,
}: {
  form: UseFormReturn<WhiteLabelFormSchema>
  name:
    | 'site_logo'
    | 'site_dark_logo'
    | 'site_favicon'
    | 'og_image'
    | 'twitter_image'
  removeName:
    | 'remove_site_logo'
    | 'remove_site_dark_logo'
    | 'remove_site_favicon'
    | 'remove_og_image'
    | 'remove_twitter_image'
  label: string
  description: string
  previewUrl?: string | null
}) {
  const selectedFile = useWatch({ control: form.control, name })
  const isRemoved = useWatch({ control: form.control, name: removeName })

  const localPreviewUrl = useMemo(() => {
    if (!(selectedFile instanceof File)) return null
    return URL.createObjectURL(selectedFile)
  }, [selectedFile])

  const resolvedPreviewUrl = isRemoved
    ? null
    : localPreviewUrl || previewUrl || null

  useEffect(() => {
    return () => {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl)
    }
  }, [localPreviewUrl])

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field: { onChange, value: _value, ...field } }) => (
        <FormItem className='flex flex-col justify-between'>
          <div>
            <div className='flex items-center justify-between gap-2'>
              <FormLabel className='text-xs font-medium'>{label}</FormLabel>
              {(resolvedPreviewUrl || isRemoved) && (
                <Button
                  type='button'
                  size='sm'
                  variant='ghost'
                  className='h-6 px-1.5 text-xs'
                  onClick={() => {
                    form.setValue(name, undefined, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                    form.setValue(removeName, !isRemoved, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }}
                >
                  {isRemoved ? (
                    <>
                      <RotateCcw className='me-1 size-3' />
                      Undo
                    </>
                  ) : (
                    <>
                      <Trash2 className='me-1 size-3' />
                      Remove
                    </>
                  )}
                </Button>
              )}
            </div>

            <div className='bg-muted/30 my-2 flex aspect-video items-center justify-center rounded-md border p-2'>
              {resolvedPreviewUrl ? (
                <img
                  src={resolvedPreviewUrl}
                  alt={label}
                  className='max-h-full max-w-full object-contain'
                />
              ) : (
                <div className='text-muted-foreground flex flex-col items-center gap-1 text-xs'>
                  <ImageIcon className='size-5' />
                  <span>No file</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <FormControl>
              <Input
                {...field}
                type='file'
                accept='image/png,image/webp,image/jpeg,image/svg+xml,image/x-icon'
                className='h-8 text-xs'
                onChange={(event) => {
                  form.setValue(removeName, false, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                  onChange(event.target.files?.[0])
                }}
              />
            </FormControl>
            <FormDescription className='line-clamp-1 text-[11px]'>
              {description}
            </FormDescription>
            <FormMessage />
          </div>
        </FormItem>
      )}
    />
  )
}
