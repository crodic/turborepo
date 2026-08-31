import { useEffect, useMemo } from 'react'
import { useForm, useWatch, type UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ImageIcon, RotateCcw, Save, Sparkles, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { restApiErrorHandler } from '@/lib/rest-api-handler'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  apiGetWebsiteSettings,
  apiUpdateWebsiteSettings,
  WEBSITE_SETTINGS_QUERY_KEY,
} from '../queries'
import {
  type WebsiteSettingsFormSchema,
  type WebsiteSettingsSchema,
  websiteSettingsFormSchema,
} from '../schema'

const emptyWebsiteSettings: WebsiteSettingsSchema = {
  site_brand: '',
  site_title: '',
  site_tagline: '',
  meta_title: '',
  meta_description: '',
  canonical_url: '',
  og_title: '',
  og_description: '',
  og_image: null,
  twitter_title: '',
  twitter_description: '',
  twitter_image: null,
  site_logo: null,
  site_dark_logo: null,
  site_favicon: null,
}

export default function WebsiteForm() {
  const websiteSettingsQuery = useQuery({
    queryKey: WEBSITE_SETTINGS_QUERY_KEY,
    queryFn: apiGetWebsiteSettings,
  })

  if (websiteSettingsQuery.isLoading) {
    return <WebsiteFormSkeleton />
  }

  return (
    <WebsiteSettingsForm
      settings={websiteSettingsQuery.data ?? emptyWebsiteSettings}
    />
  )
}

function WebsiteSettingsForm({
  settings,
}: {
  settings: WebsiteSettingsSchema
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const form = useForm<WebsiteSettingsFormSchema>({
    resolver: zodResolver(websiteSettingsFormSchema),
    defaultValues: {
      site_brand: settings.site_brand ?? '',
      site_title: settings.site_title ?? '',
      site_tagline: settings.site_tagline ?? '',
      meta_title: settings.meta_title ?? '',
      meta_description: settings.meta_description ?? '',
      canonical_url: settings.canonical_url ?? '',
      og_title: settings.og_title ?? '',
      og_description: settings.og_description ?? '',
      twitter_title: settings.twitter_title ?? '',
      twitter_description: settings.twitter_description ?? '',
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

  const updateWebsiteMutation = useMutation({
    mutationFn: apiUpdateWebsiteSettings,
    onSuccess: (data) => {
      toast.success(t('settings.website.updateSuccess'))
      queryClient.setQueryData(WEBSITE_SETTINGS_QUERY_KEY, data)
      form.reset({
        site_brand: data.site_brand ?? '',
        site_title: data.site_title ?? '',
        site_tagline: data.site_tagline ?? '',
        meta_title: data.meta_title ?? '',
        meta_description: data.meta_description ?? '',
        canonical_url: data.canonical_url ?? '',
        og_title: data.og_title ?? '',
        og_description: data.og_description ?? '',
        twitter_title: data.twitter_title ?? '',
        twitter_description: data.twitter_description ?? '',
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
      })
    },
    onError: restApiErrorHandler,
  })

  function onSubmit(data: WebsiteSettingsFormSchema) {
    updateWebsiteMutation.mutate(data)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-5'>
        <Card>
          <CardHeader>
            <div className='flex items-start gap-3'>
              <div className='bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-md'>
                <Sparkles className='size-4' />
              </div>
              <div>
                <CardTitle>{t('settings.website.brandIdentity')}</CardTitle>
                <CardDescription>
                  {t('settings.website.brandIdentityDesc')}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className='grid gap-4 md:grid-cols-2'>
            <FormField
              control={form.control}
              name='site_brand'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('settings.website.brandName')}</FormLabel>
                  <FormControl>
                    <Input placeholder='Crodic Portal' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='site_title'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('settings.website.siteTitle')}</FormLabel>
                  <FormControl>
                    <Input placeholder='Admin Portal' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='site_tagline'
              render={({ field }) => (
                <FormItem className='md:col-span-2'>
                  <FormLabel>{t('settings.website.tagline')}</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder='Production-ready boilerplate for modern portals.'
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('settings.website.taglineHelp')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className='flex items-start gap-3'>
              <div className='bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-md'>
                <Sparkles className='size-4' />
              </div>
              <div>
                <CardTitle>{t('settings.website.seoMetadata')}</CardTitle>
                <CardDescription>
                  {t('settings.website.seoMetadataDesc')}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className='grid gap-4 md:grid-cols-2'>
            <FormField
              control={form.control}
              name='meta_title'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('settings.website.metaTitle')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='Crodic Framework Admin Portal'
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('settings.website.metaTitleHelp')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='canonical_url'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('settings.website.canonicalUrl')}</FormLabel>
                  <FormControl>
                    <Input placeholder='https://admin.example.com' {...field} />
                  </FormControl>
                  <FormDescription>
                    {t('settings.website.canonicalUrlHelp')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='meta_description'
              render={({ field }) => (
                <FormItem className='md:col-span-2'>
                  <FormLabel>{t('settings.website.metaDescription')}</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder='A production-ready admin portal boilerplate for modern applications.'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='og_title'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('settings.website.ogTitle')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='Crodic Framework Admin Portal'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='twitter_title'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('settings.website.twitterTitle')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='Crodic Framework Admin Portal'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='og_description'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('settings.website.ogDescription')}</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder='Manage operations, users, roles, themes, and runtime settings in one portal.'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='twitter_description'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('settings.website.twitterDescription')}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder='A modern admin portal boilerplate for production-ready applications.'
                      {...field}
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
            <div className='flex items-start gap-3'>
              <div className='bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-md'>
                <ImageIcon className='size-4' />
              </div>
              <div>
                <CardTitle>{t('settings.website.brandAssets')}</CardTitle>
                <CardDescription>
                  {t('settings.website.brandAssetsDesc')}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
            <AssetField
              form={form}
              name='site_logo'
              removeName='remove_site_logo'
              label='Logo'
              description={t('settings.website.logoHelp')}
              previewUrl={settings.site_logo}
            />
            <AssetField
              form={form}
              name='site_dark_logo'
              removeName='remove_site_dark_logo'
              label='Dark logo'
              description={t('settings.website.darkLogoHelp')}
              previewUrl={settings.site_dark_logo}
            />
            <AssetField
              form={form}
              name='site_favicon'
              removeName='remove_site_favicon'
              label='Favicon'
              description={t('settings.website.faviconHelp')}
              previewUrl={settings.site_favicon}
            />
            <AssetField
              form={form}
              name='og_image'
              removeName='remove_og_image'
              label='Open Graph image'
              description={t('settings.website.ogImageHelp')}
              previewUrl={settings.og_image}
            />
            <AssetField
              form={form}
              name='twitter_image'
              removeName='remove_twitter_image'
              label='Twitter image'
              description={t('settings.website.twitterImageHelp')}
              previewUrl={settings.twitter_image}
            />
          </CardContent>
        </Card>

        <div className='flex justify-end'>
          <Button type='submit' disabled={updateWebsiteMutation.isPending}>
            <Save className='me-2 size-4' />
            {updateWebsiteMutation.isPending
              ? t('common.actions.saving', { defaultValue: 'Saving...' })
              : t('common.actions.saveChanges', {
                  defaultValue: 'Save changes',
                })}
          </Button>
        </div>
      </form>
    </Form>
  )
}

function AssetField({
  form,
  name,
  removeName,
  label,
  description,
  previewUrl,
}: {
  form: UseFormReturn<WebsiteSettingsFormSchema>
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
  const { t } = useTranslation()
  const selectedFile = useWatch({
    control: form.control,
    name,
  })
  const isRemoved = useWatch({
    control: form.control,
    name: removeName,
  })
  const localPreviewUrl = useMemo(() => {
    if (!(selectedFile instanceof File)) {
      return null
    }

    return URL.createObjectURL(selectedFile)
  }, [selectedFile])
  const resolvedPreviewUrl = isRemoved
    ? null
    : localPreviewUrl || previewUrl || null
  const inputKey =
    selectedFile instanceof File
      ? `${name}-${selectedFile.name}-${selectedFile.size}-${selectedFile.lastModified}`
      : `${name}-empty`

  useEffect(() => {
    return () => {
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl)
      }
    }
  }, [localPreviewUrl])

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field: { onChange, value: _value, ...field } }) => (
        <FormItem>
          <div className='flex items-center justify-between gap-3'>
            <FormLabel>{label}</FormLabel>
            {(resolvedPreviewUrl || isRemoved) && (
              <Button
                type='button'
                size='sm'
                variant='ghost'
                className='h-7 px-2 text-xs'
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
                    <RotateCcw className='me-1 size-3.5' />
                    {t('settings.website.undo')}
                  </>
                ) : (
                  <>
                    <Trash2 className='me-1 size-3.5' />
                    {t('settings.website.remove')}
                  </>
                )}
              </Button>
            )}
          </div>
          <div className='bg-muted/30 flex aspect-[16/9] items-center justify-center rounded-md border p-4'>
            {resolvedPreviewUrl ? (
              <img
                src={resolvedPreviewUrl}
                alt={label}
                className='max-h-full max-w-full object-contain'
              />
            ) : (
              <div className='text-muted-foreground flex flex-col items-center gap-2 text-sm'>
                <ImageIcon className='size-6' />
                {t('settings.website.noAssetUploaded')}
              </div>
            )}
          </div>
          <FormControl>
            <Input
              {...field}
              key={inputKey}
              type='file'
              accept='image/png,image/webp'
              onChange={(event) => {
                form.setValue(removeName, false, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
                onChange(event.target.files?.[0])
              }}
            />
          </FormControl>
          <FormDescription>{description}</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

function WebsiteFormSkeleton() {
  return (
    <div className='space-y-5'>
      <Skeleton className='h-48 rounded-lg' />
      <Skeleton className='h-72 rounded-lg' />
    </div>
  )
}
