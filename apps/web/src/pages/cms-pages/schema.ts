import z from 'zod'

export const cmsPageStatusSchema = z.enum(['draft', 'published'])

export const DEFAULT_PAGE_CONTENT = '<p>Start editing this page content...</p>'

export const cmsPageTranslationSchema = z.object({
  locale: z.string(),
  title: z.string(),
  slug: z.string(),
  content: z.string(),
  seoTitle: z.string().nullish(),
  seoDescription: z.string().nullish(),
  seoKeywords: z.string().nullish(),
  ogTitle: z.string().nullish(),
  ogDescription: z.string().nullish(),
  ogImage: z.string().nullish(),
  canonicalUrl: z.string().nullish(),
  robots: z.string().nullish(),
})

export const cmsPageSchema = z.object({
  id: z.string(),
  status: cmsPageStatusSchema,
  translations: z.array(cmsPageTranslationSchema),
  publishedAt: z.string().nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type CmsPageTranslationSchema = z.infer<typeof cmsPageTranslationSchema>
export type CmsPageSchema = z.infer<typeof cmsPageSchema>

export const cmsPageTranslationFormSchema = z.object({
  locale: z
    .string()
    .trim()
    .min(1, 'Locale is required')
    .max(10, 'Locale must be at most 10 characters'),
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
  content: z.string().min(1, 'Content is required'),
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

export const cmsPageFormSchema = z.object({
  status: cmsPageStatusSchema,
  translations: z.array(cmsPageTranslationFormSchema),
})

export type CmsPageTranslationFormSchema = z.infer<
  typeof cmsPageTranslationFormSchema
>
export type CmsPageFormSchema = z.infer<typeof cmsPageFormSchema>

export const ColumnKey = {
  title: 'translations.title',
  slug: 'translations.slug',
  status: 'status',
  updatedAt: 'updatedAt',
}
