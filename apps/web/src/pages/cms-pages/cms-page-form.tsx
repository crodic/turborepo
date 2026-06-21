import { useCallback, useState } from 'react'
import { ArrowLeftIcon, SaveIcon } from 'lucide-react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import type { ComponentLayer, Variable } from '@/components/ui/ui-builder/types'
import { pageBuilderComponentRegistry } from '@/components/page-builder/registry'
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
  const [content, setContent] = useState<ComponentLayer>(
    (initialData?.content ?? DEFAULT_PAGE_CONTENT) as ComponentLayer
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

  const handleLayersChange = useCallback((layers: ComponentLayer[]) => {
    if (layers[0]) {
      setContent(layers[0])
    }
  }, [])

  const handleVariablesChange = useCallback((nextVariables: Variable[]) => {
    setVariables(nextVariables)
  }, [])

  const handleSubmit = () => {
    try {
      const data = cmsPageFormSchema.parse({
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

      onSubmit(data)
    } catch {
      toast.error('Please check required fields and page content.')
    }
  }

  return (
    <div className='space-y-4'>
      <Card>
        <CardHeader>
          <CardTitle>{initialData ? 'Edit page' : 'Create page'}</CardTitle>
        </CardHeader>
        <CardContent className='space-y-5'>
          <div className='grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(220px,320px)_180px]'>
            <div className='space-y-2'>
              <Label>Title *</Label>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
            <div className='space-y-2'>
              <Label>Slug</Label>
              <Input
                placeholder='about-us or docs/getting-started'
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
              />
            </div>
          </div>
          <div className='space-y-2'>
            <Label>Status</Label>
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as any)}
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

          <Tabs defaultValue='seo'>
            <TabsList>
              <TabsTrigger value='seo'>SEO</TabsTrigger>
              <TabsTrigger value='json'>Builder JSON</TabsTrigger>
            </TabsList>
            <TabsContent value='seo' className='space-y-4 pt-3'>
              <InputBlock
                label='SEO title'
                value={seoTitle}
                onChange={setSeoTitle}
              />
              <TextBlock
                label='SEO description'
                value={seoDescription}
                onChange={setSeoDescription}
              />
              <InputBlock
                label='SEO keywords'
                value={seoKeywords}
                onChange={setSeoKeywords}
              />
              <InputBlock
                label='OG title'
                value={ogTitle}
                onChange={setOgTitle}
              />
              <TextBlock
                label='OG description'
                value={ogDescription}
                onChange={setOgDescription}
              />
              <InputBlock
                label='OG image'
                value={ogImage}
                onChange={setOgImage}
              />
              <InputBlock
                label='Canonical URL'
                value={canonicalUrl}
                onChange={setCanonicalUrl}
              />
              <InputBlock label='Robots' value={robots} onChange={setRobots} />
            </TabsContent>
            <TabsContent
              value='json'
              className='grid gap-4 pt-3 lg:grid-cols-2'
            >
              <ReadOnlyJsonBlock
                label='Content ComponentLayer JSON'
                value={content}
              />
              <ReadOnlyJsonBlock label='Variables JSON' value={variables} />
            </TabsContent>
          </Tabs>

          <div className='flex justify-end gap-2'>
            <Button
              variant='outline'
              type='button'
              onClick={() => navigate(-1)}
            >
              <ArrowLeftIcon className='h-4 w-4' />
              Cancel
            </Button>
            <Button
              type='button'
              disabled={isSubmitting}
              onClick={handleSubmit}
            >
              <SaveIcon className='h-4 w-4' />
              Save
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className='overflow-hidden'>
        <CardHeader>
          <CardTitle>Visual page builder</CardTitle>
        </CardHeader>
        <CardContent className='p-0'>
          <div className='bg-background h-[760px] min-h-[70vh] overflow-hidden border-t'>
            <UIBuilder
              componentRegistry={pageBuilderComponentRegistry}
              initialLayers={[content]}
              initialVariables={variables}
              onChange={handleLayersChange}
              onVariablesChange={handleVariablesChange}
              persistLayerStore={false}
              allowPagesCreation={false}
              allowPagesDeletion={false}
              showExport={false}
            />
          </div>
        </CardContent>
      </Card>
    </div>
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
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className='space-y-2'>
      <Label>{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  )
}

function TextBlock({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className='space-y-2'>
      <Label>{label}</Label>
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}
