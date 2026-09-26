import z from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type ApiMetadata,
  apiMetadataSchema,
  type PaginateQueryParams,
} from '@/global'
import { toast } from 'sonner'
import http from '@/lib/http'
import {
  polarBenefitSchema,
  type PolarBenefitSchema,
  paymentProductSchema,
  type PaymentProductFormSchema,
  type PaymentProductSchema,
} from './schema'

export const paymentProductQueryKeys = {
  all: ['payment-products'] as const,
  list: (params: PaginateQueryParams) => ['payment-products', params] as const,
  detail: (id: string) => ['payment-product', id] as const,
  benefits: ['polar-benefits'] as const,
}

export async function apiGetPolarBenefits(): Promise<PolarBenefitSchema[]> {
  const response = await http.get('/admin/payments/benefits')
  return z.array(polarBenefitSchema).parse(response.data)
}

export const useDataPolarBenefits = () =>
  useQuery({
    queryKey: paymentProductQueryKeys.benefits,
    queryFn: apiGetPolarBenefits,
    staleTime: 60 * 1000,
  })

// --- Benefit CRUD ---

export async function apiCreateBenefit(data: {
  type: string
  description: string
  properties?: { note?: string }
}) {
  const response = await http.post('/admin/payments/benefits', data)
  return response.data
}

export async function apiDeleteBenefit(id: string) {
  return http.delete(`/admin/payments/benefits/${id}`)
}

export const useMutationCreateBenefit = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: apiCreateBenefit,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: paymentProductQueryKeys.benefits,
      })
      toast.success('Benefit created successfully')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to create benefit.')
    },
  })
}

export const useMutationDeleteBenefit = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: apiDeleteBenefit,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: paymentProductQueryKeys.benefits,
      })
      toast.success('Benefit deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete benefit.')
    },
  })
}

// --- Products Listing ---

export async function apiGetPaymentProductsListing(
  params: PaginateQueryParams
): Promise<ApiMetadata & { data: PaymentProductSchema[] }> {
  const response = await http.get('/admin/payments/products', { params })

  return apiMetadataSchema
    .extend({
      data: z.array(paymentProductSchema),
    })
    .parse(response.data)
}

export async function apiGetPaymentProductById(
  id: string
): Promise<PaymentProductSchema> {
  const response = await http.get(`/admin/payments/products/${id}`)
  return paymentProductSchema.parse(response.data)
}

// --- Payload Preparation ---

function preparePayload(data: PaymentProductFormSchema) {
  const features = data.featuresText
    ? data.featuresText
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean)
    : []

  const interval =
    data.billingType === 'one_time'
      ? 'one_time'
      : data.interval === 'one_time'
        ? 'monthly'
        : data.interval

  // Convert metadata array [{key, value}] to object {key: value}
  const metadata: Record<string, string> = {}
  for (const entry of data.metadata) {
    if (entry.key.trim()) {
      metadata[entry.key.trim()] = entry.value
    }
  }

  // Use the first price as primary price/currency for backward compatibility
  const primaryPrice = data.prices[0] || { amount: 0, currency: 'usd' }

  // Map product media IDs
  const medias = Array.isArray(data.medias)
    ? data.medias
        .map((m: any) => (typeof m === 'string' ? m : m?.id))
        .filter(Boolean)
    : []

  const { featuresText, billingType, trialEnabled, medias: _m, ...rest } = data

  return {
    ...rest,
    interval,
    intervalCount:
      data.billingType === 'recurring' ? data.intervalCount : undefined,
    price: primaryPrice.amount,
    currency: primaryPrice.currency,
    prices: data.prices,
    features,
    metadata,
    medias,
    // Only send trial fields when enabled
    trialInterval: trialEnabled ? data.trialInterval : null,
    trialIntervalCount: trialEnabled ? data.trialIntervalCount : null,
  }
}

// --- Product Media Upload ---

export async function apiUploadProductMedia(file: File): Promise<{
  id: string
  publicUrl: string
  name: string
  size: number
  mimeType: string
}> {
  const formData = new FormData()
  formData.append('file', file)
  const response = await http.post('/admin/payments/products/media', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

// --- Products CRUD ---

export async function apiCreatePaymentProduct(data: PaymentProductFormSchema) {
  const payload = preparePayload(data)
  const response = await http.post('/admin/payments/products', payload)
  return paymentProductSchema.parse(response.data)
}

export async function apiUpdatePaymentProduct({
  id,
  data,
}: {
  id: string
  data: PaymentProductFormSchema
}) {
  const payload = preparePayload(data)
  const response = await http.put(`/admin/payments/products/${id}`, payload)
  return paymentProductSchema.parse(response.data)
}

export async function apiDeletePaymentProduct(id: string) {
  return http.delete(`/admin/payments/products/${id}`)
}

export const useDataPaymentProductsOverview = (params: PaginateQueryParams) =>
  useQuery({
    queryKey: paymentProductQueryKeys.list(params),
    queryFn: () => apiGetPaymentProductsListing(params),
  })

export const useDataPaymentProductById = (id: string) =>
  useQuery({
    queryKey: paymentProductQueryKeys.detail(id),
    queryFn: () => apiGetPaymentProductById(id),
    enabled: !!id,
  })

export async function apiSyncProductsFromPolar() {
  const response = await http.post('/admin/payments/products/sync-polar')
  return response.data
}

export const useMutationSyncProductsFromPolar = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: apiSyncProductsFromPolar,
    onSuccess: (data: any) => {
      void queryClient.invalidateQueries({
        queryKey: paymentProductQueryKeys.all,
      })
      toast.success(
        `Successfully synced ${data?.syncedCount ?? 0} products from Polar!`
      )
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'Failed to sync products from Polar.'
      )
    },
  })
}
