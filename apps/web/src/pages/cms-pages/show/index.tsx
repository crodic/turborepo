import { useState } from 'react'
import { format } from 'date-fns'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeftIcon,
  EditIcon,
  ExternalLinkIcon,
  FileTextIcon,
  GlobeIcon,
  Share2Icon,
  SparklesIcon,
  TrashIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DeleteAlertDialog } from '@/components/common/delete-alert-dialog'
import { ConfigDrawer } from '@/components/config-drawer'
import DataLoader from '@/components/layout/data-loader'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { NotFoundError } from '@/pages/errors/not-found-error'
import { apiDeleteCmsPage, useDataCmsPageById } from '../queries'

export function PageCmsPageShow() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { id } = useParams()
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [currentLocale, setCurrentLocale] = useState<string | null>(null)

  const { data, isFetching } = useDataCmsPageById(id ?? '')
  const deleteMutation = useMutation({
    mutationFn: apiDeleteCmsPage,
    onSuccess: () => {
      toast.success(
        t('cmsPages.message.deleteSuccess', 'Page deleted successfully')
      )
      queryClient.invalidateQueries({ queryKey: ['cms-pages'] })
      navigate('/cms-pages')
    },
    onError: () =>
      toast.error(t('cmsPages.message.deleteError', 'Could not delete page')),
  })

  if (isFetching) return <DataLoader />
  if (!id || !data) return <NotFoundError />

  const activeLocale = currentLocale || data.translations?.[0]?.locale
  const translation =
    data.translations?.find((t) => t.locale === activeLocale) ||
    data.translations?.[0]

  const clientUrl = import.meta.env.VITE_CLIENT_URL || 'https://example.com'
  const displayUrl = `${clientUrl}/pages/${translation?.slug ?? ''}`
  const isPublished = data.status === 'published'

  const keywordsList = translation?.seoKeywords
    ? translation.seoKeywords
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean)
    : []

  return (
    <>
      <DeleteAlertDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        handleDelete={() => deleteMutation.mutate(id)}
        isLoading={deleteMutation.isPending}
      />
      <Header fixed>
        <div className='ms-auto flex items-center space-x-4'>
          <Search />
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>
      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        {/* Top Header */}
        <div className='flex flex-wrap items-end justify-between gap-3'>
          <div>
            <div className='flex items-center gap-2'>
              <h2 className='text-2xl font-bold tracking-tight'>
                {translation?.title ?? 'Untitled'}
              </h2>
              <Badge variant={isPublished ? 'default' : 'secondary'}>
                {isPublished
                  ? t('cmsPages.form.statusPublished', 'Published')
                  : t('cmsPages.form.statusDraft', 'Draft')}
              </Badge>
            </div>
            <p className='text-muted-foreground text-sm'>
              /{translation?.slug}
            </p>
          </div>

          <div className='flex flex-wrap items-center gap-2'>
            <Select value={activeLocale} onValueChange={setCurrentLocale}>
              <SelectTrigger className='bg-background w-35'>
                <SelectValue
                  placeholder={t('cmsPages.show.language', 'Language')}
                />
              </SelectTrigger>
              <SelectContent>
                {data.translations?.map((item) => (
                  <SelectItem key={item.locale} value={item.locale}>
                    {item.locale.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant='outline' onClick={() => navigate(-1)}>
              <ArrowLeftIcon className='h-4 w-4' />
              {t('buttons.back', 'Back')}
            </Button>

            {translation?.slug && (
              <Button variant='outline' asChild>
                <a href={displayUrl} target='_blank' rel='noreferrer'>
                  <ExternalLinkIcon className='h-4 w-4' />
                  {t('buttons.open', 'Open')}
                </a>
              </Button>
            )}

            <Button onClick={() => navigate(`/cms-pages/${data.id}/edit`)}>
              <EditIcon className='h-4 w-4' />
              {t('buttons.edit', 'Edit')}
            </Button>

            <Button variant='destructive' onClick={() => setIsDeleteOpen(true)}>
              <TrashIcon className='h-4 w-4' />
              {t('buttons.delete', 'Delete')}
            </Button>
          </div>
        </div>

        {/* 2-Column Layout */}
        <div className='grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]'>
          {/* Left Column: Metadata Cards */}
          <div className='flex flex-col gap-4'>
            {/* Page Overview Card */}
            <Card className='gap-0 overflow-hidden py-0 shadow-xs'>
              <CardHeader className='bg-muted/30 border-b px-5 py-3.5'>
                <CardTitle className='text-sm font-semibold'>
                  {t('cmsPages.show.pageDetails', 'Page details')}
                </CardTitle>
              </CardHeader>
              <CardContent className='p-5 pt-1'>
                <div className='divide-border/60 divide-y text-sm'>
                  <div className='flex items-center justify-between py-2.5'>
                    <span className='text-muted-foreground text-xs font-medium'>
                      {t('cmsPages.form.status', 'Status')}
                    </span>
                    <Badge variant={isPublished ? 'default' : 'secondary'}>
                      {isPublished
                        ? t('cmsPages.form.statusPublished', 'Published')
                        : t('cmsPages.form.statusDraft', 'Draft')}
                    </Badge>
                  </div>
                  <div className='flex items-center justify-between py-2.5'>
                    <span className='text-muted-foreground text-xs font-medium'>
                      {t('cmsPages.show.currentLocale', 'Current Locale')}
                    </span>
                    <Badge variant='outline'>
                      {translation?.locale?.toUpperCase() || '-'}
                    </Badge>
                  </div>
                  <div className='flex items-center justify-between py-2.5'>
                    <span className='text-muted-foreground text-xs font-medium'>
                      {t('cmsPages.show.publishedAt', 'Published At')}
                    </span>
                    <span className='text-foreground/90 text-xs font-medium'>
                      {data.publishedAt
                        ? format(new Date(data.publishedAt), 'dd/MM/yyyy HH:mm')
                        : t('cmsPages.show.notPublished', 'Not published')}
                    </span>
                  </div>
                  <div className='flex items-center justify-between py-2.5'>
                    <span className='text-muted-foreground text-xs font-medium'>
                      {t('cmsPages.show.updatedAt', 'Updated At')}
                    </span>
                    <span className='text-foreground/90 text-xs font-medium'>
                      {format(new Date(data.updatedAt), 'dd/MM/yyyy HH:mm')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Technical SEO Card */}
            <Card className='gap-0 overflow-hidden py-0 shadow-xs'>
              <CardHeader className='bg-muted/30 border-b px-5 py-3.5'>
                <CardTitle className='flex items-center gap-2 text-sm font-semibold'>
                  <GlobeIcon className='text-primary size-4' />
                  {t('cmsPages.show.seoDetails', 'Technical SEO Metadata')}
                </CardTitle>
              </CardHeader>
              <CardContent className='p-5 pt-1'>
                <div className='divide-border/60 divide-y text-sm'>
                  <div className='py-2.5'>
                    <span className='text-muted-foreground mb-1 block text-xs font-medium'>
                      {t('cmsPages.show.seoTitle', 'SEO Title')}
                    </span>
                    <p className='text-foreground/90 text-xs font-medium break-words'>
                      {translation?.seoTitle || '-'}
                    </p>
                  </div>
                  <div className='py-2.5'>
                    <span className='text-muted-foreground mb-1 block text-xs font-medium'>
                      {t('cmsPages.show.seoDescription', 'SEO Description')}
                    </span>
                    <p className='text-muted-foreground/90 text-xs leading-relaxed break-words'>
                      {translation?.seoDescription || '-'}
                    </p>
                  </div>
                  <div className='flex items-center justify-between gap-2 py-2.5'>
                    <span className='text-muted-foreground text-xs font-medium'>
                      {t('cmsPages.show.seoKeywords', 'SEO Keywords')}
                    </span>
                    {keywordsList.length > 0 ? (
                      <div className='flex max-w-55 flex-wrap justify-end gap-1'>
                        {keywordsList.map((keyword, idx) => (
                          <Badge
                            key={idx}
                            variant='secondary'
                            className='px-1.5 py-0 text-[11px]'
                          >
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className='text-muted-foreground text-xs'>-</span>
                    )}
                  </div>
                  <div className='flex items-center justify-between gap-2 py-2.5'>
                    <span className='text-muted-foreground text-xs font-medium'>
                      {t('cmsPages.show.canonicalUrl', 'Canonical URL')}
                    </span>
                    {translation?.canonicalUrl ? (
                      <a
                        href={translation.canonicalUrl}
                        target='_blank'
                        rel='noreferrer'
                        className='text-primary max-w-50 truncate text-xs hover:underline'
                        title={translation.canonicalUrl}
                      >
                        {translation.canonicalUrl}
                      </a>
                    ) : (
                      <span className='text-muted-foreground text-xs'>-</span>
                    )}
                  </div>
                  <div className='flex items-center justify-between py-2.5'>
                    <span className='text-muted-foreground text-xs font-medium'>
                      {t('cmsPages.show.robots', 'Robots Tag')}
                    </span>
                    {translation?.robots ? (
                      <Badge variant='outline' className='text-xs'>
                        {translation.robots}
                      </Badge>
                    ) : (
                      <span className='text-muted-foreground text-xs'>-</span>
                    )}
                  </div>
                  <div className='py-2.5'>
                    <span className='text-muted-foreground mb-1 block text-xs font-medium'>
                      {t('cmsPages.show.ogTitle', 'OG Title')}
                    </span>
                    <p className='text-foreground/90 text-xs font-medium break-words'>
                      {translation?.ogTitle || '-'}
                    </p>
                  </div>
                  <div className='py-2.5'>
                    <span className='text-muted-foreground mb-1 block text-xs font-medium'>
                      {t('cmsPages.show.ogDescription', 'OG Description')}
                    </span>
                    <p className='text-muted-foreground/90 text-xs leading-relaxed break-words'>
                      {translation?.ogDescription || '-'}
                    </p>
                  </div>
                  {translation?.ogImage && (
                    <div className='py-2.5'>
                      <span className='text-muted-foreground mb-1.5 block text-xs font-medium'>
                        {t('cmsPages.show.ogImage', 'OG Image')}
                      </span>
                      <div className='bg-muted aspect-video max-w-full overflow-hidden rounded-md border'>
                        <img
                          src={translation.ogImage}
                          alt='Open Graph preview'
                          className='size-full object-cover'
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Content & SEO Preview Tabs */}
          <Tabs defaultValue='content' className='w-full'>
            <div className='flex items-center justify-between pb-3'>
              <TabsList className='grid w-full grid-cols-2 sm:w-auto'>
                <TabsTrigger value='content' className='gap-2'>
                  <FileTextIcon className='size-4' />
                  {t('cmsPages.show.contentPreview', 'Content Preview')}
                </TabsTrigger>
                <TabsTrigger value='seo' className='gap-2'>
                  <SparklesIcon className='text-primary size-4' />
                  {t('cmsPages.show.seoPreview', 'SEO & Social Preview')}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Tab 1: Rendered Content */}
            <TabsContent value='content' className='m-0'>
              <Card>
                <CardHeader>
                  <CardTitle>{t('cmsPages.show.preview', 'Preview')}</CardTitle>
                  <CardDescription>
                    {t('cmsPages.form.content', 'Content')} (
                    {translation?.locale?.toUpperCase()})
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className='min-h-100 overflow-auto rounded-md border bg-white p-6 dark:bg-zinc-950'>
                    <div
                      className='prose dark:prose-invert max-w-none'
                      dangerouslySetInnerHTML={{
                        __html: translation?.content || '',
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 2: SEO & Social Preview */}
            <TabsContent value='seo' className='m-0 space-y-6'>
              {/* Google Search Result Preview (SERP) */}
              <Card>
                <CardHeader className='pb-3'>
                  <CardTitle className='flex items-center gap-2 text-base'>
                    <GlobeIcon className='size-4 text-blue-500' />
                    {t(
                      'cmsPages.show.googleSearchPreview',
                      'Google Search Result Preview'
                    )}
                  </CardTitle>
                  <CardDescription>
                    How this page will appear in search engine results.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className='bg-card max-w-2xl rounded-xl border p-5 font-sans shadow-xs'>
                    {/* URL Breadcrumb */}
                    <div className='mb-1.5 flex items-center gap-2'>
                      <div className='bg-muted flex size-6 items-center justify-center rounded-full text-xs'>
                        <GlobeIcon className='text-muted-foreground size-3.5' />
                      </div>
                      <div className='flex min-w-0 flex-col leading-tight'>
                        <span className='text-foreground/80 truncate text-xs font-medium'>
                          {clientUrl.replace(/^https?:\/\//, '')}
                        </span>
                        <span className='text-muted-foreground truncate text-[11px]'>
                          {displayUrl}
                        </span>
                      </div>
                    </div>

                    {/* Blue Title */}
                    <h3 className='line-clamp-1 cursor-pointer text-lg leading-snug font-medium text-blue-600 hover:underline dark:text-blue-400'>
                      {translation?.seoTitle ||
                        translation?.title ||
                        'Untitled Page'}
                    </h3>

                    {/* Meta Description */}
                    <p className='text-muted-foreground mt-1.5 line-clamp-2 text-xs leading-relaxed'>
                      {translation?.seoDescription ||
                        t(
                          'cmsPages.show.noSeoDescription',
                          'No meta description provided. Search engines may show content snippets.'
                        )}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Social Share Card Preview (Open Graph) */}
              <Card>
                <CardHeader className='pb-3'>
                  <CardTitle className='flex items-center gap-2 text-base'>
                    <Share2Icon className='text-primary size-4' />
                    {t(
                      'cmsPages.show.socialPreview',
                      'Social Share Card Preview (Open Graph)'
                    )}
                  </CardTitle>
                  <CardDescription>
                    How this page appears when shared on Facebook, X, LinkedIn,
                    or Discord.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className='bg-card max-w-md overflow-hidden rounded-xl border shadow-sm'>
                    {/* OG Image banner */}
                    {translation?.ogImage ? (
                      <div className='bg-muted aspect-video w-full overflow-hidden border-b'>
                        <img
                          src={translation.ogImage}
                          alt={translation.ogTitle || translation.title}
                          className='size-full object-cover transition-transform duration-300 hover:scale-105'
                        />
                      </div>
                    ) : (
                      <div className='bg-muted/40 text-muted-foreground flex aspect-video w-full flex-col items-center justify-center gap-2 border-b'>
                        <Share2Icon className='size-8 opacity-40' />
                        <span className='text-xs'>
                          {t(
                            'cmsPages.show.noOgImage',
                            'No Open Graph image specified.'
                          )}
                        </span>
                      </div>
                    )}

                    {/* OG Card Meta */}
                    <div className='bg-muted/20 space-y-1 p-4'>
                      <p className='text-muted-foreground text-[11px] font-semibold tracking-wider uppercase'>
                        {clientUrl.replace(/^https?:\/\//, '')}
                      </p>
                      <h4 className='line-clamp-2 text-sm leading-snug font-semibold'>
                        {translation?.ogTitle ||
                          translation?.seoTitle ||
                          translation?.title ||
                          'Untitled Page'}
                      </h4>
                      <p className='text-muted-foreground line-clamp-2 text-xs leading-relaxed'>
                        {translation?.ogDescription ||
                          translation?.seoDescription ||
                          'No description provided for social card.'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </Main>
    </>
  )
}
