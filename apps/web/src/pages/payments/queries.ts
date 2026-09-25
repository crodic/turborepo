import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type ApiMetadata,
  apiMetadataSchema,
  type PaginateQueryParams,
} from '@/global'
import { toast } from 'sonner'
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
  paymentRefundRequestSchema,
  type PaymentRefundRequestSchema,
  type ReviewRefundRequestSchema,
  type DirectRefundSchema,
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

export async function apiGetAdminRefundRequests(
  params: PaginateQueryParams
): Promise<ApiMetadata & { data: PaymentRefundRequestSchema[] }> {
  const response = await http.get('/admin/payments/refund-requests', { params })

  return apiMetadataSchema
    .extend({ data: z.array(paymentRefundRequestSchema) })
    .parse(response.data)
}

export const useDataAdminRefundRequests = (params: PaginateQueryParams) =>
  useQuery({
    queryKey: ['admin-payment-refund-requests', params],
    queryFn: () => apiGetAdminRefundRequests(params),
  })

export const useMutationReviewRefundRequest = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string | number
      data: ReviewRefundRequestSchema
    }) => {
      const response = await http.post(
        `/admin/payments/refund-requests/${id}/review`,
        data
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['admin-payment-refund-requests'],
      })
      queryClient.invalidateQueries({
        queryKey: ['admin-payment-orders'],
      })
      queryClient.invalidateQueries({
        queryKey: ['admin-payment-transactions'],
      })
      toast.success('Refund request reviewed successfully.')
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'Failed to review refund request.'
      )
    },
  })
}

export const useMutationDirectRefundOrder = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string | number
      data: DirectRefundSchema
    }) => {
      const response = await http.post(
        `/admin/payments/orders/${id}/direct-refund`,
        data
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['admin-payment-orders'],
      })
      queryClient.invalidateQueries({
        queryKey: ['admin-payment-refund-requests'],
      })
      queryClient.invalidateQueries({
        queryKey: ['admin-payment-transactions'],
      })
      toast.success('Order refunded successfully.')
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'Failed to process refund for order.'
      )
    },
  })
}
