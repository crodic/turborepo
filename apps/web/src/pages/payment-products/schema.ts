import z from 'zod'

export const ColumnKey = {
  id: 'id',
  planSlug: 'planSlug',
  name: 'name',
  interval: 'interval',
  price: 'price',
  polarProductId: 'polarProductId',
  isPopular: 'isPopular',
  isFree: 'isFree',
  isActive: 'isActive',
  sortOrder: 'sortOrder',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
} as const

export const paymentProductSchema = z.object({
  id: z.coerce.string(),
  planSlug: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  interval: z.enum(['monthly', 'yearly', 'one_time']),
  price: z.number(),
  currency: z.string().default('usd'),
  prices: z
    .array(
      z.object({
        id: z.string().optional(),
        amount: z.number(),
        currency: z.string(),
        isArchived: z.boolean().optional(),
      })
    )
    .optional()
    .default([]),
  polarProductId: z.string().nullish().default(''),
  features: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.any()).optional().default({}),
  benefits: z.array(z.record(z.string(), z.any())).optional().default([]),
  medias: z.array(z.record(z.string(), z.any())).optional().default([]),
  trialInterval: z.string().nullish(),
  trialIntervalCount: z.number().nullish(),
  badge: z.string().nullish(),
  ctaText: z.string().default('Get Started'),
  isPopular: z.boolean().default(false),
  isFree: z.boolean().default(false),
  isActive: z.boolean().default(true),
  sortOrder: z.number().default(0),
  createdAt: z.string().nullish(),
  updatedAt: z.string().nullish(),
})

export type PaymentProductSchema = z.infer<typeof paymentProductSchema>

export const paymentProductFormSchema = z.object({
  planSlug: z
    .string()
    .trim()
    .min(1, 'Plan slug is required (e.g. pro, enterprise)'),
  name: z.string().trim().min(1, 'Display name is required'),
  description: z.string().optional(),
  interval: z.enum(['monthly', 'yearly', 'one_time']),
  price: z.number().min(0, 'Price must be >= 0'),
  currency: z.string(),
  polarProductId: z.string().optional(),
  featuresText: z.string().optional(),
  badge: z.string().optional(),
  ctaText: z.string().min(1, 'Button label is required'),
  isPopular: z.boolean(),
  isFree: z.boolean(),
  isActive: z.boolean(),
  sortOrder: z.number(),
})

export type PaymentProductFormSchema = z.infer<typeof paymentProductFormSchema>
