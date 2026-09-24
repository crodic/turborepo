import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import {
  type ApiMetadata,
  apiMetadataSchema,
  type PaginateQueryParams,
} from '@/global'
import http from '@/lib/http'
import {
  paymentOrderSchema,
  type PaymentOrderSchema,
  paymentSubscriptionSchema,
  type PaymentSubscriptionSchema,
  paymentTransactionSchema,
  type PaymentTransactionSchema,
  userPaymentSummarySchema,
  type UserPaymentSummarySchema,
} from './schema'

export async function apiGetAdminOrders(
  params: PaginateQueryParams
): Promise<ApiMetadata & { data: PaymentOrderSchema[] }> {
  const response = await http.get('/admin/payments/orders', { params })

  return apiMetadataSchema
    .extend({ data: z.array(paymentOrderSchema) })
    .parse(response.data)
}

export async function apiGetAdminSubscriptions(
  params: PaginateQueryParams
): Promise<ApiMetadata & { data: PaymentSubscriptionSchema[] }> {
  const response = await http.get('/admin/payments/subscriptions', { params })

  return apiMetadataSchema
    .extend({ data: z.array(paymentSubscriptionSchema) })
    .parse(response.data)
}

export async function apiGetAdminTransactions(
  params: PaginateQueryParams
): Promise<ApiMetadata & { data: PaymentTransactionSchema[] }> {
  const response = await http.get('/admin/payments/transactions', { params })

  return apiMetadataSchema
    .extend({ data: z.array(paymentTransactionSchema) })
    .parse(response.data)
}

export async function apiGetUserPaymentSummary(
  userId: string
): Promise<UserPaymentSummarySchema> {
  const response = await http.get(`/admin/payments/users/${userId}/summary`)

  return userPaymentSummarySchema.parse(response.data)
}

export const useDataAdminOrders = (params: PaginateQueryParams) =>
  useQuery({
    queryKey: ['admin-payment-orders', params],
    queryFn: () => apiGetAdminOrders(params),
  })

export const useDataAdminSubscriptions = (params: PaginateQueryParams) =>
  useQuery({
    queryKey: ['admin-payment-subscriptions', params],
    queryFn: () => apiGetAdminSubscriptions(params),
  })

export const useDataAdminTransactions = (params: PaginateQueryParams) =>
  useQuery({
    queryKey: ['admin-payment-transactions', params],
    queryFn: () => apiGetAdminTransactions(params),
  })

export const useDataUserPaymentSummary = (userId: string) =>
  useQuery({
    queryKey: ['admin-user-payment-summary', userId],
    queryFn: () => apiGetUserPaymentSummary(userId),
    enabled: !!userId,
  })
