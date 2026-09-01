import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Code2Icon,
  Copy,
  DownloadIcon,
  Edit2,
  ExternalLink,
  Eye,
  Globe,
  ImageIcon,
  Loader2,
  Moon,
  Paintbrush,
  Search,
  Share2,
  Sparkles,
  Sun,
  Trash2,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import {
  applyRuntimeTheme,
  hasPersonalThemeColor,
  setCachedRuntimeTheme,
} from '@/lib/runtime-theme/runtime-theme'
import {
  type ThemeMode,
  type ThemeStyles,
} from '@/lib/theme-builder/default-theme'
import {
  colorTokenGroups,
  downloadThemeJson,
  generateThemeCss,
} from '@/lib/theme-builder/theme-utils'
import { applyWebsiteMetadata } from '@/lib/website-metadata'
import { Badge } from '@/components/ui/badge'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { WhiteLabelPreview } from '../components/white-label-preview'
import {
  apiActivateWhiteLabel,
  apiDeleteWhiteLabel,
  useDataWhiteLabelById,
  WHITE_LABEL_ACTIVE_STORAGE_KEY,
  whiteLabelQueryKeys,
} from '../queries'

type TabType = 'brand' | 'colors' | 'seo' | 'preview'

export default function PageWhiteLabelShow() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { ability } = useAuthStore()

  const [activeTab, setActiveTab] = useState<TabType>('brand')
  const [colorMode, setColorMode] = useState<ThemeMode>('light')
  const [isCodeDialogOpen, setIsCodeDialogOpen] = useState(false)

  const { data: item, isLoading } = useDataWhiteLabelById(id!)

  const canUpdate = ability.can('update', 'WHITE_LABEL')
  const canDelete = ability.can('delete', 'WHITE_LABEL')
  const canPublish = ability.can('publish', 'WHITE_LABEL')

  const activateMutation = useMutation({
    mutationFn: apiActivateWhiteLabel,
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: whiteLabelQueryKeys.all })
      queryClient.invalidateQueries({
        queryKey: whiteLabelQueryKeys.detail(id!),
      })
      queryClient.invalidateQueries({
        queryKey: whiteLabelQueryKeys.active(updated.target),
      })

      if (updated.target === 'admin') {
        localStorage.setItem(
          WHITE_LABEL_ACTIVE_STORAGE_KEY,
          JSON.stringify(updated)
        )
        setCachedRuntimeTheme({ id: updated.id, styles: updated.styles })
        if (!hasPersonalThemeColor()) {
          applyRuntimeTheme({ id: updated.id, styles: updated.styles })
        }
        applyWebsiteMetadata({
          site_brand: updated.brandName || undefined,
          site_title: updated.siteTitle || undefined,
          site_tagline: updated.siteTagline || undefined,
          meta_title: updated.metaTitle || undefined,
          meta_description: updated.metaDescription || undefined,
          canonical_url: updated.canonicalUrl || undefined,
          site_logo: updated.siteLogo || undefined,
          site_dark_logo: updated.siteDarkLogo || undefined,
          site_favicon: updated.siteFavicon || undefined,
          og_image: updated.ogImage || undefined,
          twitter_image: updated.twitterImage || undefined,
        })
      }

      toast.success(
        t('whiteLabels.show.activatedProfile', {
          target: updated.target,
          defaultValue: `"${updated.name}" is now active for ${updated.target}`,
        })
      )
    },
  })

  const deleteMutation = useMutation({
    mutationFn: apiDeleteWhiteLabel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: whiteLabelQueryKeys.all })
      toast.success(t('whiteLabels.message.deleted'))
      navigate('/white-labels')
    },
  })

  const handleDelete = () => {
    if (!item) return
    if (!window.confirm(t('whiteLabels.show.deleteConfirm'))) return
    deleteMutation.mutate(item.id)
  }

  const styles = item?.styles as ThemeStyles | undefined
  const cssText = styles ? generateThemeCss(styles) : ''

  const copyCss = async () => {
    if (!cssText) return
    await navigator.clipboard.writeText(cssText)
    toast.success(t('whiteLabels.message.copied'))
  }

  const exportJson = () => {
    if (!item) return
    downloadThemeJson(item, `${item.slug || 'white-label'}-theme.json`)
  }

  if (isLoading) {
    return (
      <div className='flex h-screen items-center justify-center'>
        <Loader2 className='text-primary size-8 animate-spin' />
      </div>
    )
  }

  if (!item) {
    return (
      <Main className='flex flex-1 flex-col items-center justify-center'>
        <p className='text-muted-foreground'>
          {t('whiteLabels.show.notFound')}
        </p>
        <Button
          variant='outline'
          className='mt-4'
          onClick={() => navigate('/white-labels')}
        >
          {t('whiteLabels.show.back')}
        </Button>
      </Main>
    )
  }

  return (
    <>
      <Header fixed>
        <div className='ms-auto flex items-center space-x-4'>
          <Search />
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-6'>
        {/* Top Header Bar */}
        <div className='flex flex-wrap items-center justify-between gap-4'>
          <div className='flex items-center gap-3'>
            <Button
              variant='ghost'
              size='icon'
              onClick={() => navigate('/white-labels')}
              title={t('whiteLabels.show.back')}
            >
              <ArrowLeft className='size-5' />
            </Button>
            <div>
              <div className='flex items-center gap-2'>
                <h2 className='text-2xl font-bold tracking-tight'>
                  {item.name}
                </h2>
                <Badge
                  variant={item.target === 'admin' ? 'default' : 'secondary'}
                  className='capitalize'
                >
                  {item.target}
                </Badge>
                {item.isActive ? (
                  <Badge className='gap-1 bg-emerald-600 text-white'>
                    <Sparkles className='size-3' />
                    {t('whiteLabels.show.activeBadge')}
                  </Badge>
                ) : (
                  <Badge variant='outline' className='text-muted-foreground'>
                    {t('whiteLabels.show.presetBadge')}
                  </Badge>
                )}
              </div>
              <p className='text-muted-foreground text-sm'>
                {item.description || item.slug}
              </p>
            </div>
          </div>

          <div className='flex flex-wrap items-center gap-2'>
            {styles && (
              <>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setIsCodeDialogOpen(true)}
                  className='gap-1.5'
                >
                  <Code2Icon className='size-4' />
                  <span>{t('whiteLabels.show.downloadCss')}</span>
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={exportJson}
                  className='gap-1.5'
                >
                  <DownloadIcon className='size-4' />
                  <span>{t('whiteLabels.show.exportJson')}</span>
                </Button>
              </>
            )}

            {canPublish && !item.isActive && (
              <Button
                variant='default'
                size='sm'
                onClick={() => activateMutation.mutate(item.id)}
                disabled={activateMutation.isPending}
                className='gap-1.5'
              >
                <Sparkles className='size-4' />
                {t('whiteLabels.show.activateTarget', { target: item.target })}
              </Button>
            )}

            {canUpdate && (
              <Button
                variant='outline'
                size='sm'
                onClick={() => navigate(`/white-labels/${item.id}/edit`)}
                className='gap-1.5'
              >
                <Edit2 className='size-4' />
                {t('whiteLabels.actions.edit')}
              </Button>
            )}

            {canDelete && (
              <Button
                variant='destructive'
                size='sm'
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className='gap-1.5'
              >
                <Trash2 className='size-4' />
                {t('whiteLabels.actions.delete')}
              </Button>
            )}
          </div>
        </div>

        {/* Tab Navigation (Synchronized with Create / Edit UI) */}
        <div className='border-b pb-4'>
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as TabType)}
            className='w-full sm:w-auto'
          >
            <TabsList className='grid w-full grid-cols-2 sm:flex sm:w-auto'>
              <TabsTrigger value='brand' className='gap-1.5'>
                <Sparkles className='size-4' />
                <span>{t('whiteLabels.form.brandAssets')}</span>
              </TabsTrigger>
              <TabsTrigger value='colors' className='gap-1.5'>
                <Paintbrush className='size-4' />
                <span>{t('whiteLabels.form.colorsFonts')}</span>
              </TabsTrigger>
              <TabsTrigger value='seo' className='gap-1.5'>
                <Search className='size-4' />
                <span>{t('whiteLabels.form.seoMeta')}</span>
              </TabsTrigger>
              <TabsTrigger value='preview' className='gap-1.5'>
                <Eye className='text-primary size-4' />
                <span>{t('whiteLabels.form.livePreview')}</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Content Layout: Full Width Tab Panels (Identical to Create & Edit) */}
        <div className='space-y-6'>
          {/* TAB 1: BRAND & ASSETS */}
          {activeTab === 'brand' && (
            <div className='space-y-6'>
              <Card>
                <CardHeader>
                  <CardTitle className='text-base font-semibold'>
                    {t('whiteLabels.show.profileDetails')}
                  </CardTitle>
                  <CardDescription>
                    {t('whiteLabels.show.profileDetailsDesc')}
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-3 text-sm'>
                  <div className='flex justify-between border-b pb-2'>
                    <span className='text-muted-foreground'>
                      {t('whiteLabels.form.name')}:
                    </span>
                    <span className='font-medium'>{item.name}</span>
                  </div>
                  <div className='flex justify-between border-b pb-2'>
                    <span className='text-muted-foreground'>
                      {t('whiteLabels.form.slug')}:
                    </span>
                    <span className='font-mono text-xs'>{item.slug}</span>
                  </div>
                  <div className='flex justify-between border-b pb-2'>
                    <span className='text-muted-foreground'>
                      {t('whiteLabels.show.targetPlatform')}
                    </span>
                    <Badge
                      variant={
                        item.target === 'admin' ? 'default' : 'secondary'
                      }
                      className='text-xs capitalize'
                    >
                      {item.target}
                    </Badge>
                  </div>
                  <div className='flex justify-between border-b pb-2'>
                    <span className='text-muted-foreground'>
                      {t('whiteLabels.show.status')}
                    </span>
                    <span className='font-medium'>
                      {item.isActive
                        ? t('whiteLabels.show.activeLive')
                        : t('whiteLabels.show.presetInactive')}
                    </span>
                  </div>
                  <div className='flex flex-col gap-1'>
                    <span className='text-muted-foreground'>
                      {t('whiteLabels.show.description')}
                    </span>
                    <p className='text-muted-foreground text-xs'>
                      {item.description || t('whiteLabels.show.noDescription')}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className='text-base font-semibold'>
                    {t('whiteLabels.show.brandIdentity')}
                  </CardTitle>
                  <CardDescription>
                    {t('whiteLabels.show.brandIdentityDesc')}
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-3 text-sm'>
                  <div className='flex justify-between border-b pb-2'>
                    <span className='text-muted-foreground'>
                      {t('whiteLabels.form.brandName')}:
                    </span>
                    <span className='font-medium'>{item.brandName || '—'}</span>
                  </div>
                  <div className='flex justify-between border-b pb-2'>
                    <span className='text-muted-foreground'>
                      {t('whiteLabels.form.siteTitle')}:
                    </span>
                    <span className='font-medium'>{item.siteTitle || '—'}</span>
                  </div>
                  <div className='flex justify-between border-b pb-2'>
                    <span className='text-muted-foreground'>
                      {t('whiteLabels.form.tagline')}:
                    </span>
                    <span className='font-medium'>
                      {item.siteTagline || '—'}
                    </span>
                  </div>
                  <div className='flex justify-between border-b pb-2'>
                    <span className='text-muted-foreground'>
                      {t('whiteLabels.show.copyright')}
                    </span>
                    <span className='font-medium'>
                      {item.copyrightText || '—'}
                    </span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-muted-foreground'>
                      {t('whiteLabels.show.canonicalUrl')}
                    </span>
                    <span className='font-medium'>
                      {item.canonicalUrl ? (
                        <a
                          href={item.canonicalUrl}
                          target='_blank'
                          rel='noreferrer'
                          className='text-primary inline-flex items-center gap-1 hover:underline'
                        >
                          {item.canonicalUrl}
                          <ExternalLink className='size-3' />
                        </a>
                      ) : (
                        '—'
                      )}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className='text-base font-semibold'>
                    {t('whiteLabels.show.uploadedMediaAssets')}
                  </CardTitle>
                  <CardDescription>
                    {t('whiteLabels.show.uploadedMediaAssetsDesc')}
                  </CardDescription>
                </CardHeader>
                <CardContent className='grid gap-4 sm:grid-cols-3'>
                  <div className='space-y-1.5'>
                    <p className='text-muted-foreground text-xs font-medium'>
                      {t('whiteLabels.form.lightLogo')}
                    </p>
                    <div className='bg-muted/30 flex aspect-video items-center justify-center rounded-md border p-2'>
                      {item.siteLogo ? (
                        <img
                          src={item.siteLogo}
                          alt={t('whiteLabels.form.lightLogo')}
                          className='max-h-full max-w-full object-contain'
                        />
                      ) : (
                        <div className='text-muted-foreground flex flex-col items-center gap-1 text-xs'>
                          <ImageIcon className='size-4' />
                          <span>{t('whiteLabels.form.none')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className='space-y-1.5'>
                    <p className='text-muted-foreground text-xs font-medium'>
                      {t('whiteLabels.form.darkLogo')}
                    </p>
                    <div className='bg-muted/30 flex aspect-video items-center justify-center rounded-md border p-2'>
                      {item.siteDarkLogo ? (
                        <img
                          src={item.siteDarkLogo}
                          alt={t('whiteLabels.form.darkLogo')}
                          className='max-h-full max-w-full object-contain'
                        />
                      ) : (
                        <div className='text-muted-foreground flex flex-col items-center gap-1 text-xs'>
                          <ImageIcon className='size-4' />
                          <span>{t('whiteLabels.form.none')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className='space-y-1.5'>
                    <p className='text-muted-foreground text-xs font-medium'>
                      {t('whiteLabels.form.favicon')}
                    </p>
                    <div className='bg-muted/30 flex aspect-video items-center justify-center rounded-md border p-2'>
                      {item.siteFavicon ? (
                        <img
                          src={item.siteFavicon}
                          alt={t('whiteLabels.form.favicon')}
                          className='size-8 object-contain'
                        />
                      ) : (
                        <div className='text-muted-foreground flex flex-col items-center gap-1 text-xs'>
                          <Globe className='size-4' />
                          <span>{t('whiteLabels.form.none')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 2: COLORS & FONTS */}
          {activeTab === 'colors' && (
            <div className='space-y-6'>
              <div className='flex flex-wrap items-center justify-between gap-3'>
                <div className='flex items-center gap-2'>
                  <Button
                    variant={colorMode === 'light' ? 'default' : 'outline'}
                    size='sm'
                    onClick={() => setColorMode('light')}
                    className='gap-1.5'
                  >
                    <Sun className='size-4' />
                    {t('whiteLabels.show.lightTokens')}
                  </Button>
                  <Button
                    variant={colorMode === 'dark' ? 'default' : 'outline'}
                    size='sm'
                    onClick={() => setColorMode('dark')}
                    className='gap-1.5'
                  >
                    <Moon className='size-4' />
                    {t('whiteLabels.show.darkTokens')}
                  </Button>
                </div>
                <div className='flex items-center gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={copyCss}
                    className='gap-1.5 text-xs'
                  >
                    <Copy className='size-3.5' />
                    {t('whiteLabels.actions.copyCss')}
                  </Button>
                </div>
              </div>

              {styles && (
                <div className='space-y-6'>
                  {colorTokenGroups.map((group) => (
                    <Card key={group.title}>
                      <CardHeader className='py-3'>
                        <CardTitle className='text-sm font-semibold'>
                          {group.title} Tokens ({colorMode})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
                        {group.keys.map((key) => {
                          const val = styles[colorMode]?.[key]
                          return (
                            <div
                              key={key}
                              className='bg-muted/20 flex items-center justify-between gap-2 rounded-md border p-2 text-xs'
                            >
                              <div className='flex items-center gap-2 overflow-hidden'>
                                <div
                                  className='size-5 shrink-0 rounded-full border border-black/10 shadow-2xs dark:border-white/10'
                                  style={{ backgroundColor: val }}
                                />
                                <span className='truncate font-mono font-medium'>
                                  --{key}
                                </span>
                              </div>
                              <span className='text-muted-foreground max-w-30 truncate text-right font-mono text-[11px]'>
                                {val || '—'}
                              </span>
                            </div>
                          )
                        })}
                      </CardContent>
                    </Card>
                  ))}

                  <Card>
                    <CardHeader className='py-3'>
                      <CardTitle className='text-sm font-semibold'>
                        {t('whiteLabels.preview.typographySpacing')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className='grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-3'>
                      <div className='flex justify-between border-b pb-2'>
                        <span className='text-muted-foreground'>
                          {t('whiteLabels.preview.fontSans')}
                        </span>
                        <span className='font-mono font-medium'>
                          {styles[colorMode]?.['font-sans'] || '—'}
                        </span>
                      </div>
                      <div className='flex justify-between border-b pb-2'>
                        <span className='text-muted-foreground'>
                          {t('whiteLabels.preview.fontSerif')}
                        </span>
                        <span className='font-mono font-medium'>
                          {styles[colorMode]?.['font-serif'] || '—'}
                        </span>
                      </div>
                      <div className='flex justify-between border-b pb-2'>
                        <span className='text-muted-foreground'>
                          {t('whiteLabels.preview.fontMono')}
                        </span>
                        <span className='font-mono font-medium'>
                          {styles[colorMode]?.['font-mono'] || '—'}
                        </span>
                      </div>
                      <div className='flex justify-between border-b pb-2'>
                        <span className='text-muted-foreground'>
                          {t('whiteLabels.preview.radius')}
                        </span>
                        <span className='font-mono font-medium'>
                          {styles[colorMode]?.['radius'] || '—'}
                        </span>
                      </div>
                      <div className='flex justify-between border-b pb-2'>
                        <span className='text-muted-foreground'>
                          {t('whiteLabels.preview.spacing')}
                        </span>
                        <span className='font-mono font-medium'>
                          {styles[colorMode]?.['spacing'] || '—'}
                        </span>
                      </div>
                      <div className='flex justify-between border-b pb-2'>
                        <span className='text-muted-foreground'>
                          {t('whiteLabels.preview.shadowBlur')}
                        </span>
                        <span className='font-mono font-medium'>
                          {styles[colorMode]?.['shadow-blur'] || '—'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SEO & METADATA */}
          {activeTab === 'seo' && (
            <div className='space-y-6'>
              {/* Google SERP Snippet Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className='text-base font-semibold'>
                    {t('whiteLabels.preview.googleSearchPreview')}
                  </CardTitle>
                  <CardDescription>
                    {t('whiteLabels.preview.googleSearchDesc')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className='bg-card max-w-xl space-y-1.5 rounded-lg border p-4 shadow-2xs'>
                    <div className='text-muted-foreground flex items-center gap-2 text-xs'>
                      {item.siteFavicon ? (
                        <img
                          src={item.siteFavicon}
                          alt={t('whiteLabels.form.favicon')}
                          className='size-4 rounded-full object-contain'
                        />
                      ) : (
                        <Globe className='size-4' />
                      )}
                      <span className='truncate'>
                        {item.canonicalUrl || 'https://yourbrand.com'}
                      </span>
                    </div>
                    <h3 className='text-primary cursor-pointer truncate text-base font-medium hover:underline'>
                      {item.metaTitle ||
                        item.siteTitle ||
                        item.brandName ||
                        'Platform Title'}
                    </h3>
                    <p className='text-muted-foreground line-clamp-2 text-xs leading-relaxed'>
                      {item.metaDescription ||
                        item.siteTagline ||
                        'Empowering modern platform management with customized white-label styling and unified brand identity.'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Social Share Card Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className='text-base font-semibold'>
                    {t('whiteLabels.preview.socialSharePreview')}
                  </CardTitle>
                  <CardDescription>
                    {t('whiteLabels.preview.socialShareDesc')}
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div className='bg-muted/20 max-w-md overflow-hidden rounded-lg border'>
                    <div className='bg-muted flex aspect-video items-center justify-center overflow-hidden'>
                      {item.ogImage || item.twitterImage ? (
                        <img
                          src={item.ogImage || item.twitterImage || ''}
                          alt='Social preview'
                          className='size-full object-cover'
                        />
                      ) : (
                        <div className='text-muted-foreground flex flex-col items-center gap-1 text-xs'>
                          <Share2 className='size-6' />
                          <span>{t('whiteLabels.preview.noOgUploaded')}</span>
                        </div>
                      )}
                    </div>
                    <div className='bg-card space-y-1 p-3'>
                      <span className='text-muted-foreground font-mono text-[11px] tracking-wider uppercase'>
                        {item.canonicalUrl || 'YOURBRAND.COM'}
                      </span>
                      <h4 className='truncate text-sm font-semibold'>
                        {item.metaTitle || item.siteTitle || item.brandName}
                      </h4>
                      <p className='text-muted-foreground line-clamp-1 text-xs'>
                        {item.metaDescription || item.siteTagline}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Meta details list */}
              <Card>
                <CardHeader>
                  <CardTitle className='text-base font-semibold'>
                    {t('whiteLabels.show.metadataConfig')}
                  </CardTitle>
                </CardHeader>
                <CardContent className='space-y-3 text-sm'>
                  <div className='flex justify-between border-b pb-2'>
                    <span className='text-muted-foreground'>
                      {t('whiteLabels.form.metaTitle')}:
                    </span>
                    <span className='font-medium'>{item.metaTitle || '—'}</span>
                  </div>
                  <div className='flex flex-col gap-1 border-b pb-2'>
                    <span className='text-muted-foreground'>
                      {t('whiteLabels.form.metaDescription')}:
                    </span>
                    <span className='text-muted-foreground text-xs'>
                      {item.metaDescription || '—'}
                    </span>
                  </div>
                  <div className='flex justify-between border-b pb-2'>
                    <span className='text-muted-foreground'>
                      {t('whiteLabels.form.ogImage')}:
                    </span>
                    <span className='max-w-62.5 truncate font-mono text-xs'>
                      {item.ogImage || '—'}
                    </span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-muted-foreground'>
                      {t('whiteLabels.form.twitterImage')}:
                    </span>
                    <span className='max-w-62.5 truncate font-mono text-xs'>
                      {item.twitterImage || '—'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 4: LIVE PREVIEW */}
          {activeTab === 'preview' && (
            <div className='mx-auto max-w-5xl'>
              <WhiteLabelPreview
                styles={item.styles}
                brandName={item.brandName}
                siteTitle={item.siteTitle}
                siteTagline={item.siteTagline}
                siteLogoUrl={item.siteLogo}
                siteDarkLogoUrl={item.siteDarkLogo}
                siteFaviconUrl={item.siteFavicon}
              />
            </div>
          )}
        </div>
      </Main>

      {/* Full CSS Code Inspector Dialog */}
      <Dialog open={isCodeDialogOpen} onOpenChange={setIsCodeDialogOpen}>
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>{t('whiteLabels.cssDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('whiteLabels.cssDialog.description', {
                name: item.name,
              })}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className='bg-muted/40 h-80 rounded-md border p-4'>
            <pre className='font-mono text-xs whitespace-pre-wrap select-all'>
              {cssText}
            </pre>
          </ScrollArea>
          <DialogFooter className='gap-2 sm:gap-0'>
            <Button variant='outline' size='sm' onClick={copyCss}>
              <Copy className='size-4' />
              {t('whiteLabels.actions.copyCss')}
            </Button>
            <DialogClose asChild>
              <Button size='sm'>{t('whiteLabels.show.close')}</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
