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

  const { featuresText, billingType, ...rest } = data
  return {
    ...rest,
    interval,
    features,
  }
}

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
