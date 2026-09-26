import { z } from 'zod'

// ==========================================
// DISCOUNTS
// ==========================================

export const polarDiscountSchema = z.object({
  id: z.coerce.number(),
  polarDiscountId: z.string(),
  name: z.string(),
  type: z.enum(['fixed', 'percentage']),
  amount: z.coerce.number().nullable().optional(),
  basisPoints: z.coerce.number().nullable().optional(),
  currency: z.string().nullable().optional(),
  amounts: z.record(z.string(), z.coerce.number()).nullable().optional(),
  code: z.string().nullable().optional(),
  duration: z.enum(['once', 'forever', 'repeating']),
  durationInMonths: z.coerce.number().nullable().optional(),
  maxRedemptions: z.coerce.number().nullable().optional(),
  redemptionsCount: z.coerce.number().default(0),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  productIds: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.any()).nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type PolarDiscountSchema = z.infer<typeof polarDiscountSchema>

export const createDiscountFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['fixed', 'percentage']),
  amount: z.number().min(1).optional(),
  basisPoints: z.number().min(1).max(10000).optional(),
  currency: z.string().optional(),
  code: z.string().optional(),
  duration: z.enum(['once', 'forever', 'repeating']),
  durationInMonths: z.number().min(1).optional(),
  maxRedemptions: z.number().min(1).optional(),
  maxRedemptionsPerCustomer: z.number().min(1).optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  productIds: z.array(z.string()).optional(),
})

export type CreateDiscountFormValues = z.infer<typeof createDiscountFormSchema>
export const createDiscountSchema = createDiscountFormSchema
export type CreateDiscountSchema = CreateDiscountFormValues

// ==========================================
// CUSTOM FIELDS
// ==========================================

export const polarCustomFieldSchema = z.object({
  id: z.coerce.number(),
  polarCustomFieldId: z.string(),
  type: z.enum(['text', 'number', 'date', 'checkbox', 'select']),
  slug: z.string(),
  name: z.string(),
  required: z.boolean().default(false),
  isActive: z.boolean().default(true),
  properties: z.record(z.string(), z.any()).default({}),
  metadata: z.record(z.string(), z.any()).nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type PolarCustomFieldSchema = z.infer<typeof polarCustomFieldSchema>

export const createCustomFieldFormSchema = z.object({
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(
      /^[a-z0-9-]+$/,
      'Slug may only contain lowercase alphanumeric characters and hyphens'
    ),
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['text', 'number', 'date', 'checkbox', 'select']),
  formLabel: z.string().optional(),
  formPlaceholder: z.string().optional(),
  formHelpText: z.string().optional(),
  required: z.boolean(),
})

export type CreateCustomFieldFormValues = z.infer<
  typeof createCustomFieldFormSchema
>
export const createCustomFieldSchema = createCustomFieldFormSchema
export type CreateCustomFieldSchema = CreateCustomFieldFormValues

// ==========================================
// CUSTOMERS
// ==========================================

export const polarCustomerSchema = z.object({
  id: z.coerce.number(),
  userId: z.coerce.number().nullable().optional(),
  polarCustomerId: z.string(),
  email: z.string().email(),
  name: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  billingAddress: z.record(z.string(), z.any()).nullable().optional(),
  taxId: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.any()).nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  user: z
    .object({
      id: z.coerce.number(),
      email: z.string(),
      fullName: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
})

export type PolarCustomerSchema = z.infer<typeof polarCustomerSchema>

export const createCustomerFormSchema = z.object({
  email: z.string().email('Valid email is required'),
  name: z.string().optional(),
  avatarUrl: z.string().url().optional().or(z.literal('')),
  taxId: z.string().optional(),
  line1: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
})

export type CreateCustomerFormValues = z.infer<typeof createCustomerFormSchema>
export const createCustomerSchema = createCustomerFormSchema
export type CreateCustomerSchema = CreateCustomerFormValues

// ==========================================
// SUBSCRIPTIONS
// ==========================================

export const polarSubscriptionSchema = z.object({
  id: z.coerce.number(),
  userId: z.string().nullable().optional(),
  customerId: z.coerce.number().nullable().optional(),
  customerEmail: z.string(),
  customerName: z.string().nullable().optional(),
  polarSubscriptionId: z.string(),
  polarCustomerId: z.string().nullable().optional(),
  productId: z.string(),
  productName: z.string().nullable().optional(),
  amount: z.coerce.number().nullable().optional(),
  currency: z.string().nullable().optional(),
  recurringInterval: z.string().nullable().optional(),
  status: z.enum([
    'active',
    'canceled',
    'past_due',
    'incomplete',
    'trialing',
    'unpaid',
    'paused',
  ]),
  currentPeriodStart: z.string().nullable().optional(),
  currentPeriodEnd: z.string().nullable().optional(),
  cancelAtPeriodEnd: z.boolean().default(false),
  startedAt: z.string().nullable().optional(),
  endedAt: z.string().nullable().optional(),
  discountId: z.string().nullable().optional(),
  customFieldData: z.record(z.string(), z.any()).nullable().optional(),
  metadata: z.record(z.string(), z.any()).nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  user: z
    .object({
      id: z.coerce.number(),
      email: z.string(),
      fullName: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
})

export type PolarSubscriptionSchema = z.infer<typeof polarSubscriptionSchema>

// ==========================================
// ORDERS
// ==========================================

export const polarOrderSchema = z.object({
  id: z.coerce.number(),
  orderNumber: z.string(),
  userId: z.string().nullable().optional(),
  customerEmail: z.string(),
  customerName: z.string().nullable().optional(),
  polarCheckoutId: z.string().nullable().optional(),
  polarOrderId: z.string().nullable().optional(),
  productId: z.string(),
  productTitle: z.string().nullable().optional(),
  amount: z.coerce.number(),
  currency: z.string(),
  subtotalAmount: z.coerce.number().nullable().optional(),
  taxAmount: z.coerce.number().nullable().optional(),
  discountAmount: z.coerce.number().nullable().optional(),
  discountId: z.string().nullable().optional(),
  customFieldData: z.record(z.string(), z.any()).nullable().optional(),
  invoiceUrl: z.string().nullable().optional(),
  receiptUrl: z.string().nullable().optional(),
  status: z.enum(['pending', 'paid', 'failed', 'canceled', 'refunded']),
  metadata: z.record(z.string(), z.any()).nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  user: z
    .object({
      id: z.coerce.number(),
      email: z.string(),
      fullName: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
})

export type PolarOrderSchema = z.infer<typeof polarOrderSchema>

export const directRefundSchema = z.object({
  reason: z.string().min(1, 'Reason is required'),
  comment: z
    .string()
    .max(500, 'Comment cannot exceed 500 characters')
    .optional(),
  refundAmount: z.number().positive('Amount must be positive').optional(),
})

export type DirectRefundSchema = z.infer<typeof directRefundSchema>

// ==========================================
// CHECKOUT LINKS
// ==========================================

export const polarCheckoutLinkSchema = z.object({
  id: z.string(),
  url: z.string(),
  label: z.string().nullable().optional(),
  productId: z.string().nullable().optional(),
  productPriceId: z.string().nullable().optional(),
  successUrl: z.string().nullable().optional(),
  product: z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .nullable()
    .optional(),
  createdAt: z.string().optional(),
})

export type PolarCheckoutLinkSchema = z.infer<typeof polarCheckoutLinkSchema>

export const createCheckoutLinkSchema = z.object({
  productId: z.string().optional(),
  productPriceId: z.string().optional(),
  label: z.string().optional(),
  successUrl: z.string().optional(),
})

export type CreateCheckoutLinkSchema = z.infer<typeof createCheckoutLinkSchema>

// ==========================================
// BENEFITS
// ==========================================

export const polarBenefitSchema = z.object({
  id: z.string(),
  type: z.string(),
  description: z.string(),
  selectable: z.boolean().optional(),
  deletable: z.boolean().optional(),
  organizationId: z.string().optional(),
  isTaxApplicable: z.boolean().optional(),
  properties: z.record(z.string(), z.any()).optional(),
  createdAt: z.string().optional(),
  modifiedAt: z.string().nullable().optional(),
})

export type PolarBenefitSchema = z.infer<typeof polarBenefitSchema>

export const createBenefitFormSchema = z.object({
  type: z.enum(['custom', 'license_keys']),
  description: z.string().min(1, 'Description is required'),
  note: z.string().optional(),
  isTaxApplicable: z.boolean().optional(),
})

export type CreateBenefitFormValues = z.infer<typeof createBenefitFormSchema>
export const createBenefitSchema = createBenefitFormSchema
export type CreateBenefitSchema = CreateBenefitFormValues
