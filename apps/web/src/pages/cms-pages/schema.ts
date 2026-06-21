import z from 'zod'

export const cmsPageStatusSchema = z.enum(['draft', 'published'])

export const componentLayerSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    id: z.string(),
    name: z.string().optional(),
    type: z.string(),
    props: z.record(z.string(), z.any()).default({}),
    children: z
      .union([
        z.string(),
        z.array(componentLayerSchema),
        z.record(z.string(), z.any()),
      ])
      .optional(),
  })
)

export const cmsPageSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  status: cmsPageStatusSchema,
  content: componentLayerSchema,
  variables: z.array(z.any()).optional(),
  seoTitle: z.string().nullish(),
  seoDescription: z.string().nullish(),
  seoKeywords: z.string().nullish(),
  ogTitle: z.string().nullish(),
  ogDescription: z.string().nullish(),
  ogImage: z.string().nullish(),
  canonicalUrl: z.string().nullish(),
  robots: z.string().nullish(),
  publishedAt: z.string().nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type CmsPageSchema = z.infer<typeof cmsPageSchema>

export const cmsPageFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().optional(),
  status: cmsPageStatusSchema,
  content: componentLayerSchema,
  variables: z.array(z.any()).optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  seoKeywords: z.string().optional(),
  ogTitle: z.string().optional(),
  ogDescription: z.string().optional(),
  ogImage: z.string().optional(),
  canonicalUrl: z.string().optional(),
  robots: z.string().optional(),
})

export type CmsPageFormSchema = z.infer<typeof cmsPageFormSchema>

export const ColumnKey = {
  title: 'title',
  slug: 'slug',
  status: 'status',
  updatedAt: 'updatedAt',
}

export const DEFAULT_PAGE_CONTENT = {
  id: 'page-root',
  type: 'section',
  name: 'Page',
  props: {
    className: 'mx-auto max-w-5xl px-6 py-20',
  },
  children: [
    {
      id: 'page-title',
      type: 'h1',
      name: 'Title',
      props: {
        className: 'text-4xl font-bold tracking-tight',
      },
      children: 'New page',
    },
    {
      id: 'page-description',
      type: 'p',
      name: 'Description',
      props: {
        className: 'mt-4 text-lg text-muted-foreground',
      },
      children: 'Start editing this page content from the admin portal.',
    },
  ],
}
