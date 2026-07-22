import { useCallback, useState, type ReactNode } from 'react'
import { ArrowLeftIcon, SaveIcon } from 'lucide-react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import {
  cmsPageFormSchema,
  DEFAULT_PAGE_CONTENT,
  type CmsPageFormSchema,
  type CmsPageSchema,
} from './schema'

type CmsPageFormErrors = Partial<Record<keyof CmsPageFormSchema, string>>

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
  const navigate = useNavigate()
  const [title, setTitle] = useState(initialData?.title ?? '')
  const [slug, setSlug] = useState(initialData?.slug ?? '')
  const [locale, setLocale] = useState(initialData?.locale ?? 'en')
  const [status, setStatus] = useState<CmsPageFormSchema['status']>(
    initialData?.status ?? 'draft'
  )
  const [content, setContent] = useState<string>(
    initialData?.content ?? DEFAULT_PAGE_CONTENT
  )
  const [seoTitle, setSeoTitle] = useState(initialData?.seoTitle ?? '')
  const [seoDescription, setSeoDescription] = useState(
    initialData?.seoDescription ?? ''
  )
  const [seoKeywords, setSeoKeywords] = useState(initialData?.seoKeywords ?? '')
  const [ogTitle, setOgTitle] = useState(initialData?.ogTitle ?? '')
  const [ogDescription, setOgDescription] = useState(
    initialData?.ogDescription ?? ''
  )
  const [ogImage, setOgImage] = useState(initialData?.ogImage ?? '')
  const [canonicalUrl, setCanonicalUrl] = useState(
    initialData?.canonicalUrl ?? ''
  )
  const [robots, setRobots] = useState(initialData?.robots ?? '')
  const [errors, setErrors] = useState<CmsPageFormErrors>({})

  const clearError = useCallback((field: keyof CmsPageFormSchema) => {
    setErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }, [])

  const setFieldValue = useCallback(
    (field: keyof CmsPageFormSchema, setter: (value: string) => void) =>
      (value: string) => {
        setter(value)
        clearError(field)
      },
    [clearError]
  )

  const handleSubmit = () => {
    const result = cmsPageFormSchema.safeParse({
      title,
      slug: slug || undefined,
      locale,
      status,
      content,
      seoTitle: seoTitle || undefined,
      seoDescription: seoDescription || undefined,
      seoKeywords: seoKeywords || undefined,
      ogTitle: ogTitle || undefined,
      ogDescription: ogDescription || undefined,
      ogImage: ogImage || undefined,
      canonicalUrl: canonicalUrl || undefined,
      robots: robots || undefined,
    })

    if (!result.success) {
      const nextErrors: CmsPageFormErrors = {}
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof CmsPageFormSchema | undefined
        if (field && !nextErrors[field]) {
          nextErrors[field] = issue.message
        }
      })
      setErrors(nextErrors)
      toast.error('Please fix the highlighted fields before saving.')
      return
    }

    setErrors({})
    onSubmit(result.data)
  }

  return (
    <div className='bg-background flex h-full min-h-0 flex-col overflow-hidden'>
      <div className='border-border flex h-14 shrink-0 items-center justify-between border-b px-4'>
        <div className='flex items-center gap-3'>
          <div className='truncate text-sm font-medium'>
            {initialData ? 'Edit page' : 'Create page'}
          </div>
          <div className='text-muted-foreground truncate text-xs'>
            {slug || 'Draft page'}
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <Button variant='outline' type='button' onClick={() => navigate(-1)}>
            <ArrowLeftIcon className='mr-2 h-4 w-4' />
            Cancel
          </Button>
          <Button type='button' disabled={isSubmitting} onClick={handleSubmit}>
            <SaveIcon className='mr-2 h-4 w-4' />
            Save
          </Button>
        </div>
      </div>

      <div className='flex min-h-0 flex-1 overflow-hidden'>
        <div className='flex-1 overflow-y-auto p-6'>
          <div className='mx-auto max-w-4xl space-y-4'>
            <div className='space-y-2'>
              <RequiredLabel>Content</RequiredLabel>
              <TiptapEditor
                output='html'
                content={content}
                onChangeContent={(val) => {
                  setContent(val)
                  clearError('content')
                }}
                disabled={isSubmitting ?? false}
                className={cn(
                  'min-h-[500px]',
                  errors.content &&
                    'border-destructive ring-destructive rounded-lg ring-1'
                )}
              />
              <FieldErrorMessage message={errors.content} />
            </div>
          </div>
        </div>

        <div className='border-border w-[320px] shrink-0 overflow-y-auto border-l bg-slate-50/50 dark:bg-slate-900/50'>
          <Tabs defaultValue='page' className='flex flex-col'>
            <TabsList className='mx-4 mt-4 grid grid-cols-2'>
              <TabsTrigger value='page'>Settings</TabsTrigger>
              <TabsTrigger value='seo'>SEO</TabsTrigger>
            </TabsList>

            <TabsContent value='page' className='p-4 pt-4'>
              <div className='space-y-4'>
                <InputBlock
                  label='Title'
                  required
                  value={title}
                  onChange={setFieldValue('title', setTitle)}
                  error={errors.title}
                />
                <InputBlock
                  label='Slug'
                  placeholder='about-us or docs/getting-started'
                  value={slug}
                  onChange={setFieldValue('slug', setSlug)}
                  error={errors.slug}
                />
                <div className='space-y-2'>
                  <RequiredLabel>Locale</RequiredLabel>
                  <Select
                    value={locale}
                    onValueChange={(v) => {
                      setLocale(v)
                      clearError('locale')
                    }}
                  >
                    <SelectTrigger
                      className={cn(
                        'w-full',
                        errors.locale &&
                          'border-destructive focus:ring-destructive'
                      )}
                    >
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
                  <FieldErrorMessage message={errors.locale} />
                </div>
                <div className='space-y-2'>
                  <RequiredLabel>Status</RequiredLabel>
                  <Select
                    value={status}
                    onValueChange={(v) =>
                      setStatus(v as CmsPageFormSchema['status'])
                    }
                  >
                    <SelectTrigger className='w-full'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='draft'>Draft</SelectItem>
                      <SelectItem value='published'>Published</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value='seo' className='p-4 pt-4'>
              <div className='space-y-4'>
                <InputBlock
                  label='SEO title'
                  value={seoTitle}
                  onChange={setFieldValue('seoTitle', setSeoTitle)}
                  error={errors.seoTitle}
                />
                <TextBlock
                  label='SEO description'
                  value={seoDescription}
                  onChange={setFieldValue('seoDescription', setSeoDescription)}
                  error={errors.seoDescription}
                />
                <InputBlock
                  label='SEO keywords'
                  value={seoKeywords}
                  onChange={setFieldValue('seoKeywords', setSeoKeywords)}
                  error={errors.seoKeywords}
                />
                <InputBlock
                  label='OG title'
                  value={ogTitle}
                  onChange={setFieldValue('ogTitle', setOgTitle)}
                  error={errors.ogTitle}
                />
                <TextBlock
                  label='OG description'
                  value={ogDescription}
                  onChange={setFieldValue('ogDescription', setOgDescription)}
                  error={errors.ogDescription}
                />
                <InputBlock
                  label='OG image'
                  value={ogImage}
                  onChange={setFieldValue('ogImage', setOgImage)}
                  error={errors.ogImage}
                />
                <InputBlock
                  label='Canonical URL'
                  value={canonicalUrl}
                  onChange={setFieldValue('canonicalUrl', setCanonicalUrl)}
                  error={errors.canonicalUrl}
                />
                <InputBlock
                  label='Robots'
                  value={robots}
                  onChange={setFieldValue('robots', setRobots)}
                  error={errors.robots}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

function InputBlock({
  label,
  value,
  onChange,
  placeholder,
  required,
  error,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  error?: string
}) {
  return (
    <div className='space-y-2'>
      <RequiredLabel required={required}>{label}</RequiredLabel>
      <Input
        placeholder={placeholder}
        value={value}
        aria-invalid={!!error}
        className={cn(
          error && 'border-destructive focus-visible:ring-destructive'
        )}
        onChange={(event) => onChange(event.target.value)}
      />
      <FieldErrorMessage message={error} />
    </div>
  )
}

function TextBlock({
  label,
  value,
  onChange,
  required,
  error,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  error?: string
}) {
  return (
    <div className='space-y-2'>
      <RequiredLabel required={required}>{label}</RequiredLabel>
      <Textarea
        value={value}
        aria-invalid={!!error}
        className={cn(
          error && 'border-destructive focus-visible:ring-destructive'
        )}
        onChange={(event) => onChange(event.target.value)}
      />
      <FieldErrorMessage message={error} />
    </div>
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
    <Label>
      {children}
      {required && <span className='text-destructive ms-1'>*</span>}
    </Label>
  )
}

function FieldErrorMessage({ message }: { message?: string }) {
  if (!message) return null

  return <p className='text-destructive text-sm'>{message}</p>
}
