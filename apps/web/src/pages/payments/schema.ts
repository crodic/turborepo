import { z } from 'zod'

export const PaymentOrderStatus = {
  PENDING: 'pending',
  PAID: 'paid',
  REFUNDED: 'refunded',
  FAILED: 'failed',
  EXPIRED: 'expired',
} as const

export type PaymentOrderStatus =
  (typeof PaymentOrderStatus)[keyof typeof PaymentOrderStatus]

export const paymentOrderSchema = z.object({
  id: z.union([z.string(), z.number()]),
  orderNumber: z.string(),
  userId: z.union([z.string(), z.number()]).nullish(),
  customerEmail: z.string(),
  customerName: z.string().nullish(),
  polarOrderId: z.string().nullish(),
  polarCheckoutId: z.string().nullish(),
  productId: z.string(),
  productTitle: z.string().nullish(),
  amount: z.number(),
  currency: z.string(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string().nullish(),
})

export type PaymentOrderSchema = z.infer<typeof paymentOrderSchema>

export const PaymentSubscriptionStatus = {
  INCOMPLETE: 'incomplete',
  INCOMPLETE_EXPIRED: 'incomplete_expired',
  TRIALING: 'trialing',
  ACTIVE: 'active',
  PAST_DUE: 'past_due',
  CANCELED: 'canceled',
  UNPAID: 'unpaid',
} as const

export type PaymentSubscriptionStatus =
  (typeof PaymentSubscriptionStatus)[keyof typeof PaymentSubscriptionStatus]

export const paymentSubscriptionSchema = z.object({
  id: z.union([z.string(), z.number()]),
  userId: z.union([z.string(), z.number()]).nullish(),
  customerEmail: z.string(),
  polarSubscriptionId: z.string(),
  polarCustomerId: z.string().nullish(),
  productId: z.string(),
  status: z.string(),
  currentPeriodStart: z.string().nullish(),
  currentPeriodEnd: z.string().nullish(),
  cancelAtPeriodEnd: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string().nullish(),
})

export type PaymentSubscriptionSchema = z.infer<
  typeof paymentSubscriptionSchema
>

export const PaymentTransactionType = {
  CHARGE: 'charge',
  REFUND: 'refund',
  DISPUTE: 'dispute',
} as const

export type PaymentTransactionType =
  (typeof PaymentTransactionType)[keyof typeof PaymentTransactionType]

export const PaymentTransactionStatus = {
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  PENDING: 'pending',
} as const

export type PaymentTransactionStatus =
  (typeof PaymentTransactionStatus)[keyof typeof PaymentTransactionStatus]

export const paymentTransactionSchema = z.object({
  id: z.union([z.string(), z.number()]),
  userId: z.union([z.string(), z.number()]).nullish(),
  orderId: z.union([z.string(), z.number()]).nullish(),
  subscriptionId: z.union([z.string(), z.number()]).nullish(),
  polarPaymentId: z.string().nullish(),
  type: z.string(),
  status: z.string(),
  amount: z.number(),
  feeAmount: z.number().nullish(),
  netAmount: z.number().nullish(),
  currency: z.string(),
  paymentMethod: z.string().nullish(),
  cardBrand: z.string().nullish(),
  cardLast4: z.string().nullish(),
  createdAt: z.string(),
  updatedAt: z.string().nullish(),
})

export type PaymentTransactionSchema = z.infer<typeof paymentTransactionSchema>

export const userPaymentSummarySchema = z.object({
  subscriptions: z.array(paymentSubscriptionSchema),
  recentOrders: z.array(paymentOrderSchema),
  totalSpent: z.number(),
  totalOrdersCount: z.number(),
  currency: z.string(),
})

export type UserPaymentSummarySchema = z.infer<typeof userPaymentSummarySchema>
