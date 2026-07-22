import { useState, type ReactNode } from 'react'
import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeftIcon, SaveIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import TiptapEditor from '@/components/editor/tiptap-editor'
import { ImagePickerInput } from '@/components/forms/image-picker-input'
import {
  cmsPageFormSchema,
  DEFAULT_PAGE_CONTENT,
  type CmsPageFormSchema,
  type CmsPageSchema,
} from './schema'

type CmsPageFormProps = {
  initialData?: CmsPageSchema
  isSubmitting?: boolean
  onSubmit: (data: CmsPageFormSchema) => void
}

const LOCALES = [
  { value: 'en', label: 'English' },
  { value: 'vi', label: 'Vietnamese' },
]

export function CmsPageForm({
  initialData,
  isSubmitting,
  onSubmit,
}: CmsPageFormProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [currentLocale, setCurrentLocale] = useState('en')

  const defaultTranslations = LOCALES.map((l) => {
    const existing = initialData?.translations?.find(
      (t) => t.locale === l.value
    )
    return {
      locale: l.value,
      title: existing?.title ?? '',
      slug: existing?.slug ?? '',
      content:
        existing?.content ?? (l.value === 'en' ? DEFAULT_PAGE_CONTENT : ''),
      seoTitle: existing?.seoTitle ?? '',
      seoDescription: existing?.seoDescription ?? '',
      seoKeywords: existing?.seoKeywords ?? '',
      ogTitle: existing?.ogTitle ?? '',
      ogDescription: existing?.ogDescription ?? '',
      ogImage: existing?.ogImage ?? '',
      canonicalUrl: existing?.canonicalUrl ?? '',
      robots: existing?.robots ?? '',
    }
  })

  const form = useForm<CmsPageFormSchema>({
    resolver: zodResolver(cmsPageFormSchema),
    defaultValues: {
      status: initialData?.status ?? 'draft',
      translations: defaultTranslations,
    },
  })

  const { fields } = useFieldArray({
    control: form.control,
    name: 'translations',
  })

  const currentTranslationIndex = fields.findIndex(
    (f) => f.locale === currentLocale
  )

  const handleSubmit = form.handleSubmit((data) => {
    const validTranslations = data.translations.filter(
      (t) => t.title && t.content && t.content !== DEFAULT_PAGE_CONTENT
    )

    if (validTranslations.length === 0) {
      toast.error('At least one translation must have both Title and Content')
      return
    }

    for (const [index, t] of data.translations.entries()) {
      const hasTitle = !!t.title
      const hasContent = !!t.content && t.content !== DEFAULT_PAGE_CONTENT

      if (hasTitle && !hasContent) {
        form.setError(`translations.${index}.content`, {
          type: 'manual',
          message: 'Content is required',
        })
        toast.error(
          `Please provide content for ${t.locale.toUpperCase()} translation`
        )
        return
      }
      if (hasContent && !hasTitle) {
        form.setError(`translations.${index}.title`, {
          type: 'manual',
          message: 'Title is required',
        })
        toast.error(
          `Please provide title for ${t.locale.toUpperCase()} translation`
        )
        return
      }
    }

    onSubmit({
      ...data,
      translations: validTranslations as any,
    })
  })

  const currentSlug = useWatch({
    control: form.control,
    name: `translations.${currentTranslationIndex}.slug`,
  })

  return (
    <Form {...form}>
      <form
        onSubmit={handleSubmit}
        className='bg-background flex h-full min-h-0 flex-col overflow-hidden'
      >
        <div className='border-border flex h-14 shrink-0 items-center justify-between border-b px-4'>
          <div className='flex items-center gap-3'>
            <div className='truncate text-sm font-medium'>
              {initialData
                ? t('cmsPages.form.editTitle')
                : t('cmsPages.form.createTitle')}
            </div>
            <div className='text-muted-foreground truncate text-xs'>
              {currentSlug || t('cmsPages.form.draftPage')}
            </div>
          </div>
          <div className='flex items-center gap-4'>
            <div className='border-border flex items-center gap-2 border-r pr-4'>
              <FormLabel>{t('cmsPages.form.locale')}:</FormLabel>
              <Select value={currentLocale} onValueChange={setCurrentLocale}>
                <SelectTrigger className='h-8 w-[140px]'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOCALES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='flex items-center gap-2'>
              <Button
                variant='outline'
                type='button'
                onClick={() => navigate(-1)}
              >
                <ArrowLeftIcon className='mr-2 h-4 w-4' />
                {t('buttons.cancel')}
              </Button>
              <Button type='submit' disabled={isSubmitting}>
                <SaveIcon className='mr-2 h-4 w-4' />
                {t('buttons.save')}
              </Button>
            </div>
          </div>
        </div>

        <div className='flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden'>
          <div className='flex-1 p-4 md:p-6 lg:overflow-y-auto'>
            <div className='mx-auto max-w-4xl space-y-4'>
              <FormField
                control={form.control}
                name={`translations.${currentTranslationIndex}.content`}
                render={({ field }) => (
                  <FormItem className='space-y-2'>
                    <RequiredLabel>{t('cmsPages.form.content')}</RequiredLabel>
                    <FormControl>
                      <TiptapEditor
                        output='html'
                        content={field.value}
                        onChangeContent={field.onChange}
                        disabled={isSubmitting ?? false}
                        className={cn(
                          'min-h-[500px]',
                          form.formState.errors.translations?.[
                            currentTranslationIndex
                          ]?.content &&
                            'border-destructive ring-destructive rounded-lg ring-1'
                        )}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className='border-border w-full shrink-0 border-t bg-slate-50/50 lg:w-[320px] lg:overflow-y-auto lg:border-t-0 lg:border-l dark:bg-slate-900/50'>
            <Tabs defaultValue='page' className='flex flex-col'>
              <TabsList className='mx-4 mt-4 grid grid-cols-2'>
                <TabsTrigger value='page'>
                  {t('cmsPages.form.settings')}
                </TabsTrigger>
                <TabsTrigger value='seo'>{t('cmsPages.form.seo')}</TabsTrigger>
              </TabsList>

              <TabsContent value='page' className='p-4 pt-4'>
                <div className='space-y-4'>
                  <FormField
                    control={form.control}
                    name={`translations.${currentTranslationIndex}.title`}
                    render={({ field }) => (
                      <FormItem>
                        <RequiredLabel required>
                          {t('cmsPages.form.title')}
                        </RequiredLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`translations.${currentTranslationIndex}.slug`}
                    render={({ field }) => (
                      <FormItem>
                        <RequiredLabel>{t('cmsPages.form.slug')}</RequiredLabel>
                        <FormControl>
                          <Input placeholder='about-us' {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name='status'
                    render={({ field }) => (
                      <FormItem>
                        <RequiredLabel>
                          {t('cmsPages.form.status')}
                        </RequiredLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className='w-full'>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value='draft'>
                              {t('cmsPages.form.statusDraft')}
                            </SelectItem>
                            <SelectItem value='published'>
                              {t('cmsPages.form.statusPublished')}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value='seo' className='p-4 pt-4'>
                <div className='space-y-4'>
                  <FormField
                    control={form.control}
                    name={`translations.${currentTranslationIndex}.seoTitle`}
                    render={({ field }) => (
                      <FormItem>
                        <RequiredLabel>
                          {t('cmsPages.form.seoTitle')}
                        </RequiredLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`translations.${currentTranslationIndex}.seoDescription`}
                    render={({ field }) => (
                      <FormItem>
                        <RequiredLabel>
                          {t('cmsPages.form.seoDescription')}
                        </RequiredLabel>
                        <FormControl>
                          <Textarea {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`translations.${currentTranslationIndex}.seoKeywords`}
                    render={({ field }) => (
                      <FormItem>
                        <RequiredLabel>
                          {t('cmsPages.form.seoKeywords')}
                        </RequiredLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`translations.${currentTranslationIndex}.ogTitle`}
                    render={({ field }) => (
                      <FormItem>
                        <RequiredLabel>
                          {t('cmsPages.form.ogTitle')}
                        </RequiredLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`translations.${currentTranslationIndex}.ogDescription`}
                    render={({ field }) => (
                      <FormItem>
                        <RequiredLabel>
                          {t('cmsPages.form.ogDescription')}
                        </RequiredLabel>
                        <FormControl>
                          <Textarea {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`translations.${currentTranslationIndex}.ogImage`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <ImagePickerInput
                            {...field}
                            label={t('cmsPages.form.ogImage')}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`translations.${currentTranslationIndex}.canonicalUrl`}
                    render={({ field }) => (
                      <FormItem>
                        <RequiredLabel>
                          {t('cmsPages.form.canonicalUrl')}
                        </RequiredLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`translations.${currentTranslationIndex}.robots`}
                    render={({ field }) => (
                      <FormItem>
                        <RequiredLabel>
                          {t('cmsPages.form.robots')}
                        </RequiredLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </form>
    </Form>
  )
}

function RequiredLabel({
  children,
  required,
}: {
  children: ReactNode
  required?: boolean
}) {
  return (
    <FormLabel>
      {children}
      {required && <span className='text-destructive ms-1'>*</span>}
    </FormLabel>
  )
}
