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
  interval: z.enum(['monthly', 'yearly']),
  price: z.number(),
  currency: z.string().default('usd'),
  polarProductId: z.string().nullish().default(''),
  features: z.array(z.string()).default([]),
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
  interval: z.enum(['monthly', 'yearly']),
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
