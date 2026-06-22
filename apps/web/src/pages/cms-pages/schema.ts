import z from 'zod'

export const cmsPageStatusSchema = z.enum(['draft', 'published'])

export const DEFAULT_PAGE_CONTENT: any = {
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

const strictComponentLayerSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    id: z.string(),
    name: z.string().optional(),
    type: z.string(),
    props: z
      .record(z.string(), z.any())
      .nullish()
      .transform((value) => value ?? {}),
    children: z
      .union([
        z.string(),
        z.array(strictComponentLayerSchema),
        z.record(z.string(), z.any()),
      ])
      .optional(),
  })
)

const isLayerLike = (value: unknown) => {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { id?: unknown }).id === 'string' &&
    typeof (value as { type?: unknown }).type === 'string'
  )
}

const normalizeLayer = (
  value: unknown,
  fallback = DEFAULT_PAGE_CONTENT
): any => {
  if (Array.isArray(value)) {
    const directLayer = value.find(isLayerLike)
    if (directLayer) {
      return normalizeLayer(directLayer, fallback)
    }

    const nestedLayer = value.find(
      (item) => isRecord(item) && getNestedLayerInput(item) !== undefined
    )
    return nestedLayer ? normalizeLayer(nestedLayer, fallback) : fallback
  }

  if (isRecord(value)) {
    const nestedContent = getNestedLayerInput(value)

    if (nestedContent !== undefined && nestedContent !== value) {
      return normalizeLayer(nestedContent, fallback)
    }
  }

  if (!isLayerLike(value)) {
    return fallback
  }

  const layer = value as Record<string, unknown>
  const rawChildren = layer.children
  const children = Array.isArray(rawChildren)
    ? rawChildren.map((child, index) =>
        normalizeLayer(child, {
          id: `${layer.id}-child-${index}`,
          type: 'div',
          name: 'Recovered layer',
          props: {},
          children: [],
        })
      )
    : rawChildren

  return {
    ...layer,
    props:
      typeof layer.props === 'object' && layer.props !== null
        ? layer.props
        : {},
    children,
  }
}

export const componentLayerSchema: z.ZodType<any> = z
  .any()
  .transform((value) => normalizeLayer(value))

export const componentLayersSchema: z.ZodType<any[]> = z
  .any()
  .transform((value) => normalizeLayers(value))

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getNestedLayerInput(value: Record<string, unknown>) {
  return (
    value.content ??
    value.page ??
    value.root ??
    value.layer ??
    value.data ??
    value.layers ??
    value.pages
  )
}

function normalizeLayers(value: unknown): any[] {
  if (Array.isArray(value)) {
    const layers = value
      .map((item) => normalizeLayer(item, null))
      .filter((item) => item !== null)

    return layers.length > 0 ? layers : [DEFAULT_PAGE_CONTENT]
  }

  return [normalizeLayer(value)]
}

export const cmsPageSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  status: cmsPageStatusSchema,
  content: componentLayersSchema,
  variables: z.array(z.any()).nullish().default([]),
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
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(255, 'Title must be at most 255 characters'),
  slug: z
    .string()
    .trim()
    .max(255, 'Slug must be at most 255 characters')
    .optional(),
  status: cmsPageStatusSchema,
  content: componentLayersSchema,
  variables: z.array(z.any()).optional(),
  seoTitle: z
    .string()
    .trim()
    .max(255, 'SEO title must be at most 255 characters')
    .optional(),
  seoDescription: z
    .string()
    .trim()
    .max(500, 'SEO description must be at most 500 characters')
    .optional(),
  seoKeywords: z
    .string()
    .trim()
    .max(500, 'SEO keywords must be at most 500 characters')
    .optional(),
  ogTitle: z
    .string()
    .trim()
    .max(255, 'OG title must be at most 255 characters')
    .optional(),
  ogDescription: z
    .string()
    .trim()
    .max(500, 'OG description must be at most 500 characters')
    .optional(),
  ogImage: z
    .string()
    .trim()
    .max(500, 'OG image must be at most 500 characters')
    .optional(),
  canonicalUrl: z
    .string()
    .trim()
    .max(500, 'Canonical URL must be at most 500 characters')
    .optional(),
  robots: z
    .string()
    .trim()
    .max(100, 'Robots must be at most 100 characters')
    .optional(),
})

export type CmsPageFormSchema = z.infer<typeof cmsPageFormSchema>

export const ColumnKey = {
  title: 'title',
  slug: 'slug',
  status: 'status',
  updatedAt: 'updatedAt',
}
