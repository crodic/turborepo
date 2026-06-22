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
import UIBuilder from '@/components/ui/ui-builder'
import { ConfigPanel } from '@/components/ui/ui-builder/internal/config-panel'
import LayersPanel from '@/components/ui/ui-builder/internal/layers-panel'
import { TailwindThemePanel } from '@/components/ui/ui-builder/internal/tailwind-theme-panel'
import { VariablesPanel } from '@/components/ui/ui-builder/internal/variables-panel'
import type { ComponentLayer, Variable } from '@/components/ui/ui-builder/types'
import {
  pageBuilderBlockRegistry,
  pageBuilderComponentRegistry,
} from '@/components/page-builder/registry'
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

export function CmsPageForm({
  initialData,
  isSubmitting,
  onSubmit,
}: CmsPageFormProps) {
  const navigate = useNavigate()
  const [title, setTitle] = useState(initialData?.title ?? '')
  const [slug, setSlug] = useState(initialData?.slug ?? '')
  const [status, setStatus] = useState<CmsPageFormSchema['status']>(
    initialData?.status ?? 'draft'
  )
  const [content, setContent] = useState<ComponentLayer[]>(
    (initialData?.content ?? [DEFAULT_PAGE_CONTENT]) as ComponentLayer[]
  )
  const [variables, setVariables] = useState<Variable[]>(
    (initialData?.variables ?? []) as Variable[]
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

  const handleLayersChange = useCallback(
    (layers: ComponentLayer[]) => {
      if (layers[0]) {
        setContent(layers)
        clearError('content')
      }
    },
    [clearError]
  )

  const handleVariablesChange = useCallback((nextVariables: Variable[]) => {
    setVariables(nextVariables)
  }, [])

  const handleSubmit = () => {
    const result = cmsPageFormSchema.safeParse({
      title,
      slug: slug || undefined,
      status,
      content,
      variables,
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

  const navLeft = (
    <div className='hidden min-w-0 items-center gap-3 xl:flex'>
      <div className='min-w-0'>
        <div className='truncate text-sm font-medium'>
          {initialData ? 'Edit page' : 'Create page'}
        </div>
        <div className='text-muted-foreground max-w-[280px] truncate text-xs'>
          {slug || 'Draft page'}
        </div>
      </div>
    </div>
  )

  const navRight = (
    <div className='flex items-center gap-2'>
      <Button variant='outline' type='button' onClick={() => navigate(-1)}>
        <ArrowLeftIcon className='h-4 w-4' />
        Cancel
      </Button>
      <Button type='button' disabled={isSubmitting} onClick={handleSubmit}>
        <SaveIcon className='h-4 w-4' />
        Save
      </Button>
    </div>
  )

  return (
    <div className='bg-background h-full min-h-0 overflow-hidden'>
      <UIBuilder
        componentRegistry={pageBuilderComponentRegistry}
        initialLayers={content}
        initialVariables={variables}
        onChange={handleLayersChange}
        onVariablesChange={handleVariablesChange}
        persistLayerStore={false}
        allowPagesCreation={false}
        allowPagesDeletion={false}
        showExport={false}
        blocks={pageBuilderBlockRegistry}
        navLeftChildren={navLeft}
        navRightChildren={navRight}
        panelConfig={{
          pageConfigPanel: (
            <PageBuilderSidePanel
              title={title}
              setTitle={setFieldValue('title', setTitle)}
              slug={slug}
              setSlug={setFieldValue('slug', setSlug)}
              status={status}
              setStatus={setStatus}
              seoTitle={seoTitle}
              setSeoTitle={setFieldValue('seoTitle', setSeoTitle)}
              seoDescription={seoDescription}
              setSeoDescription={setFieldValue(
                'seoDescription',
                setSeoDescription
              )}
              seoKeywords={seoKeywords}
              setSeoKeywords={setFieldValue('seoKeywords', setSeoKeywords)}
              ogTitle={ogTitle}
              setOgTitle={setFieldValue('ogTitle', setOgTitle)}
              ogDescription={ogDescription}
              setOgDescription={setFieldValue(
                'ogDescription',
                setOgDescription
              )}
              ogImage={ogImage}
              setOgImage={setFieldValue('ogImage', setOgImage)}
              canonicalUrl={canonicalUrl}
              setCanonicalUrl={setFieldValue('canonicalUrl', setCanonicalUrl)}
              robots={robots}
              setRobots={setFieldValue('robots', setRobots)}
              content={content}
              variables={variables}
              errors={errors}
            />
          ),
        }}
      />
    </div>
  )
}

function PageBuilderSidePanel({
  title,
  setTitle,
  slug,
  setSlug,
  status,
  setStatus,
  seoTitle,
  setSeoTitle,
  seoDescription,
  setSeoDescription,
  seoKeywords,
  setSeoKeywords,
  ogTitle,
  setOgTitle,
  ogDescription,
  setOgDescription,
  ogImage,
  setOgImage,
  canonicalUrl,
  setCanonicalUrl,
  robots,
  setRobots,
  content,
  variables,
  errors,
}: {
  title: string
  setTitle: (value: string) => void
  slug: string
  setSlug: (value: string) => void
  status: CmsPageFormSchema['status']
  setStatus: (value: CmsPageFormSchema['status']) => void
  seoTitle: string
  setSeoTitle: (value: string) => void
  seoDescription: string
  setSeoDescription: (value: string) => void
  seoKeywords: string
  setSeoKeywords: (value: string) => void
  ogTitle: string
  setOgTitle: (value: string) => void
  ogDescription: string
  setOgDescription: (value: string) => void
  ogImage: string
  setOgImage: (value: string) => void
  canonicalUrl: string
  setCanonicalUrl: (value: string) => void
  robots: string
  setRobots: (value: string) => void
  content: ComponentLayer[]
  variables: Variable[]
  errors: CmsPageFormErrors
}) {
  return (
    <Tabs
      defaultValue='page'
      className='relative flex size-full min-h-0 flex-col overflow-hidden pt-3'
    >
      <TabsList className='mx-3 grid grid-cols-4'>
        <TabsTrigger value='page'>Page</TabsTrigger>
        <TabsTrigger value='layers'>Layers</TabsTrigger>
        <TabsTrigger value='style'>Style</TabsTrigger>
        <TabsTrigger value='data'>Data</TabsTrigger>
      </TabsList>

      <TabsContent value='page' className='min-h-0 flex-1 overflow-y-auto p-4'>
        <div className='space-y-4'>
          <InputBlock
            label='Title'
            required
            value={title}
            onChange={setTitle}
            error={errors.title}
          />
          <InputBlock
            label='Slug'
            placeholder='about-us or docs/getting-started'
            value={slug}
            onChange={setSlug}
            error={errors.slug}
          />
          <div className='space-y-2'>
            <RequiredLabel>Status</RequiredLabel>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className='w-full'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='draft'>Draft</SelectItem>
                <SelectItem value='published'>Published</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className='border-border border-t pt-4'>
            <div className='mb-3 text-sm font-medium'>SEO</div>
            <div className='space-y-4'>
              <InputBlock
                label='SEO title'
                value={seoTitle}
                onChange={setSeoTitle}
                error={errors.seoTitle}
              />
              <TextBlock
                label='SEO description'
                value={seoDescription}
                onChange={setSeoDescription}
                error={errors.seoDescription}
              />
              <InputBlock
                label='SEO keywords'
                value={seoKeywords}
                onChange={setSeoKeywords}
                error={errors.seoKeywords}
              />
              <InputBlock
                label='OG title'
                value={ogTitle}
                onChange={setOgTitle}
                error={errors.ogTitle}
              />
              <TextBlock
                label='OG description'
                value={ogDescription}
                onChange={setOgDescription}
                error={errors.ogDescription}
              />
              <InputBlock
                label='OG image'
                value={ogImage}
                onChange={setOgImage}
                error={errors.ogImage}
              />
              <InputBlock
                label='Canonical URL'
                value={canonicalUrl}
                onChange={setCanonicalUrl}
                error={errors.canonicalUrl}
              />
              <InputBlock
                label='Robots'
                value={robots}
                onChange={setRobots}
                error={errors.robots}
              />
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value='layers' className='min-h-0 flex-1 overflow-y-auto'>
        <LayersPanel />
      </TabsContent>

      <TabsContent value='style' className='min-h-0 flex-1 overflow-y-auto p-4'>
        <div className='space-y-4'>
          <ConfigPanel />
          <TailwindThemePanel />
        </div>
      </TabsContent>

      <TabsContent value='data' className='min-h-0 flex-1 overflow-y-auto p-4'>
        <Tabs defaultValue='variables'>
          <TabsList className='grid w-full grid-cols-2'>
            <TabsTrigger value='variables'>Variables</TabsTrigger>
            <TabsTrigger value='json'>JSON</TabsTrigger>
          </TabsList>
          <TabsContent value='variables'>
            <VariablesPanel />
          </TabsContent>
          <TabsContent value='json' className='space-y-4 pt-3'>
            <ReadOnlyJsonBlock
              label='Content ComponentLayer JSON'
              value={content}
            />
            <ReadOnlyJsonBlock label='Variables JSON' value={variables} />
          </TabsContent>
        </Tabs>
      </TabsContent>
    </Tabs>
  )
}

function ReadOnlyJsonBlock({
  label,
  value,
}: {
  label: string
  value: unknown
}) {
  return (
    <div className='space-y-2'>
      <Label>{label}</Label>
      <Textarea
        readOnly
        className='min-h-48 font-mono text-xs'
        value={JSON.stringify(value, null, 2)}
      />
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
