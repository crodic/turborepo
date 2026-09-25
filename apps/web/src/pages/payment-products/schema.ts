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

export const polarBenefitSchema = z.object({
  id: z.string(),
  type: z.string(),
  description: z.string(),
  selectable: z.boolean().optional(),
  deletable: z.boolean().optional(),
  organizationId: z.string().optional(),
  properties: z.record(z.string(), z.any()).optional(),
})

export type PolarBenefitSchema = z.infer<typeof polarBenefitSchema>

export const paymentProductSchema = z.object({
  id: z.coerce.string(),
  planSlug: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  interval: z.string(),
  intervalCount: z.number().nullish(),
  price: z.number(),
  currency: z.string().default('usd'),
  visibility: z.enum(['public', 'private']).default('public'),
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

// --- Form-level schemas ---

export const priceEntrySchema = z.object({
  amount: z.number().min(0, 'Price must be >= 0'),
  currency: z.string().min(1, 'Currency is required'),
})

export type PriceEntrySchema = z.infer<typeof priceEntrySchema>

export const metadataEntrySchema = z.object({
  key: z.string().min(1, 'Key is required'),
  value: z.string(),
})

export type MetadataEntrySchema = z.infer<typeof metadataEntrySchema>

export const paymentProductFormSchema = z
  .object({
    planSlug: z
      .string()
      .trim()
      .min(1, 'Plan slug is required (e.g. pro, enterprise)'),
    name: z.string().trim().min(1, 'Display name is required'),
    description: z.string().optional(),
    billingType: z.enum(['recurring', 'one_time']),
    interval: z.enum(['daily', 'weekly', 'monthly', 'yearly', 'one_time']),
    intervalCount: z.number().min(1).optional(),
    // Multi-currency prices
    prices: z.array(priceEntrySchema).min(1, 'At least one price is required'),
    // Trial period
    trialEnabled: z.boolean(),
    trialInterval: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
    trialIntervalCount: z.number().min(1).optional(),
    // Metadata key-value pairs
    metadata: z.array(metadataEntrySchema),
    // Benefits
    benefits: z.array(z.string()),
    // Visibility
    visibility: z.enum(['public', 'private']),
    // Polar
    polarProductId: z.string().optional(),
    // Marketing
    featuresText: z.string().optional(),
    badge: z.string().optional(),
    ctaText: z.string().min(1, 'Button label is required'),
    isPopular: z.boolean(),
    isFree: z.boolean(),
    isActive: z.boolean(),
    sortOrder: z.number(),
  })
  .superRefine((data, ctx) => {
    if (data.trialEnabled) {
      if (!data.trialInterval) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Trial interval is required when trial is enabled',
          path: ['trialInterval'],
        })
      }
      if (!data.trialIntervalCount || data.trialIntervalCount < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Trial count must be at least 1',
          path: ['trialIntervalCount'],
        })
      }
    }
  })

export type PaymentProductFormSchema = z.infer<typeof paymentProductFormSchema>
