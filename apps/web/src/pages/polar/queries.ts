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
  polarDiscountSchema,
  type PolarDiscountSchema,
  polarCustomFieldSchema,
  type PolarCustomFieldSchema,
  polarCustomerSchema,
  type PolarCustomerSchema,
  polarSubscriptionSchema,
  type PolarSubscriptionSchema,
  polarOrderSchema,
  type PolarOrderSchema,
  polarCheckoutLinkSchema,
  polarBenefitSchema,
} from './schema'

// ==========================================
// DISCOUNTS
// ==========================================

export async function apiGetDiscounts(
  params: PaginateQueryParams
): Promise<ApiMetadata & { data: PolarDiscountSchema[] }> {
  const response = await http.get('/admin/polar/discounts', { params })
  const result = apiMetadataSchema
    .extend({ data: z.array(polarDiscountSchema) })
    .safeParse(response.data)

  if (!result.success) {
    return response.data as any
  }
  return result.data
}

export function useDataPolarDiscounts(params: PaginateQueryParams) {
  return useQuery({
    queryKey: ['polar-discounts', params],
    queryFn: () => apiGetDiscounts(params),
  })
}

export function useMutationCreateDiscount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: any) => {
      const response = await http.post('/admin/polar/discounts', payload)
      return polarDiscountSchema.parse(response.data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['polar-discounts'] })
      toast.success('Discount created successfully')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create discount')
    },
  })
}

export function useMutationUpdateDiscount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: any }) => {
      const response = await http.put(`/admin/polar/discounts/${id}`, payload)
      return polarDiscountSchema.parse(response.data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['polar-discounts'] })
      toast.success('Discount updated successfully')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update discount')
    },
  })
}

export function useMutationDeleteDiscount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await http.delete(`/admin/polar/discounts/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['polar-discounts'] })
      toast.success('Discount deleted successfully')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete discount')
    },
  })
}

export function useMutationSyncDiscounts() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const response = await http.post('/admin/polar/discounts/sync')
      return response.data
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['polar-discounts'] })
      toast.success(`Synced ${data.synced || 0} discounts from Polar`)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to sync discounts')
    },
  })
}

// ==========================================
// CUSTOM FIELDS
// ==========================================

export async function apiGetCustomFields(
  params: PaginateQueryParams
): Promise<ApiMetadata & { data: PolarCustomFieldSchema[] }> {
  const response = await http.get('/admin/polar/custom-fields', { params })
  const result = apiMetadataSchema
    .extend({ data: z.array(polarCustomFieldSchema) })
    .safeParse(response.data)

  if (!result.success) {
    return response.data as any
  }
  return result.data
}

export function useDataPolarCustomFields(params: PaginateQueryParams) {
  return useQuery({
    queryKey: ['polar-custom-fields', params],
    queryFn: () => apiGetCustomFields(params),
  })
}

export function useMutationCreateCustomField() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: any) => {
      const response = await http.post('/admin/polar/custom-fields', payload)
      return polarCustomFieldSchema.parse(response.data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['polar-custom-fields'] })
      toast.success('Custom field created successfully')
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.message || 'Failed to create custom field'
      )
    },
  })
}

export function useMutationDeleteCustomField() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await http.delete(`/admin/polar/custom-fields/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['polar-custom-fields'] })
      toast.success('Custom field deleted successfully')
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.message || 'Failed to delete custom field'
      )
    },
  })
}

export function useMutationSyncCustomFields() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const response = await http.post('/admin/polar/custom-fields/sync')
      return response.data
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['polar-custom-fields'] })
      toast.success(`Synced ${data.synced || 0} custom fields from Polar`)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to sync custom fields')
    },
  })
}

// ==========================================
// CUSTOMERS
// ==========================================

export async function apiGetCustomers(
  params: PaginateQueryParams
): Promise<ApiMetadata & { data: PolarCustomerSchema[] }> {
  const response = await http.get('/admin/polar/customers', { params })
  const result = apiMetadataSchema
    .extend({ data: z.array(polarCustomerSchema) })
    .safeParse(response.data)

  if (!result.success) {
    return response.data as any
  }
  return result.data
}

export function useDataPolarCustomers(params: PaginateQueryParams) {
  return useQuery({
    queryKey: ['polar-customers', params],
    queryFn: () => apiGetCustomers(params),
  })
}

export function useMutationCreateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: any) => {
      const response = await http.post('/admin/polar/customers', payload)
      return polarCustomerSchema.parse(response.data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['polar-customers'] })
      toast.success('Customer created successfully')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create customer')
    },
  })
}

export function useMutationDeleteCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      anonymize,
    }: {
      id: number
      anonymize?: boolean
    }) => {
      await http.delete(`/admin/polar/customers/${id}`, {
        params: anonymize ? { anonymize: true } : undefined,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['polar-customers'] })
      toast.success('Customer removed successfully')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete customer')
    },
  })
}

export function useDataCustomerState(customerId?: number) {
  return useQuery({
    queryKey: ['polar-customer-state', customerId],
    queryFn: async () => {
      if (!customerId) return null
      const response = await http.get(
        `/admin/polar/customers/${customerId}/state`
      )
      return response.data
    },
    enabled: Boolean(customerId),
  })
}

export function useDataCustomerPaymentMethods(customerId?: number) {
  return useQuery({
    queryKey: ['polar-customer-payment-methods', customerId],
    queryFn: async () => {
      if (!customerId) return null
      const response = await http.get(
        `/admin/polar/customers/${customerId}/payment-methods`
      )
      return response.data
    },
    enabled: Boolean(customerId),
  })
}

export function useMutationSyncCustomers() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const response = await http.post('/admin/polar/customers/sync')
      return response.data
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['polar-customers'] })
      toast.success(`Synced ${data.synced || 0} customers from Polar`)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to sync customers')
    },
  })
}

// ==========================================
// SUBSCRIPTIONS
// ==========================================

export async function apiGetPolarSubscriptions(
  params: PaginateQueryParams
): Promise<ApiMetadata & { data: PolarSubscriptionSchema[] }> {
  const response = await http.get('/admin/payments/subscriptions', { params })
  const result = apiMetadataSchema
    .extend({ data: z.array(polarSubscriptionSchema) })
    .safeParse(response.data)

  if (!result.success) {
    return response.data as any
  }
  return result.data
}

export function useDataPolarSubscriptions(params: PaginateQueryParams) {
  return useQuery({
    queryKey: ['polar-subscriptions', params],
    queryFn: () => apiGetPolarSubscriptions(params),
  })
}

export function useMutationCancelSubscription() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await http.post(
        `/admin/payments/subscriptions/${id}/cancel`
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['polar-subscriptions'] })
      toast.success('Subscription scheduled to cancel at period end')
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.message || 'Failed to cancel subscription'
      )
    },
  })
}

export function useMutationRevokeSubscription() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await http.post(
        `/admin/payments/subscriptions/${id}/revoke`
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['polar-subscriptions'] })
      toast.success('Subscription revoked immediately')
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.message || 'Failed to revoke subscription'
      )
    },
  })
}

// ==========================================
// ORDERS
// ==========================================

export async function apiGetPolarOrders(
  params: PaginateQueryParams
): Promise<ApiMetadata & { data: PolarOrderSchema[] }> {
  const response = await http.get('/admin/payments/orders', { params })
  const result = apiMetadataSchema
    .extend({ data: z.array(polarOrderSchema) })
    .safeParse(response.data)

  if (!result.success) {
    return response.data as any
  }
  return result.data
}

export function useDataPolarOrders(params: PaginateQueryParams) {
  return useQuery({
    queryKey: ['polar-orders', params],
    queryFn: () => apiGetPolarOrders(params),
  })
}

export function useMutationDirectRefundOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string | number
      data: {
        reason: string
        comment?: string
        refundAmount?: number
      }
    }) => {
      const response = await http.post(
        `/admin/payments/orders/${id}/direct-refund`,
        data
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['polar-orders'] })
      queryClient.invalidateQueries({ queryKey: ['admin-payment-orders'] })
      toast.success('Order refunded successfully')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to refund order')
    },
  })
}

export async function apiGetOrderInvoice(
  id: number
): Promise<{ url?: string; invoiceUrl?: string }> {
  const response = await http.get(`/admin/polar/orders/${id}/invoice`)
  return response.data
}

export async function apiGetOrderReceipt(
  id: number
): Promise<{ url?: string; receiptUrl?: string }> {
  const response = await http.get(`/admin/polar/orders/${id}/receipt`)
  return response.data
}

export async function downloadCsv(endpoint: string, filename: string) {
  try {
    const response = await http.get(endpoint, { responseType: 'blob' })
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success(`${filename} exported successfully`)
  } catch (err: any) {
    toast.error(err.response?.data?.message || 'Failed to export CSV')
  }
}

// ==========================================
// CHECKOUT LINKS
// ==========================================

export function useDataPolarCheckoutLinks(productId?: string) {
  return useQuery({
    queryKey: ['polar-checkout-links', productId],
    queryFn: async () => {
      const response = await http.get('/admin/polar/checkout-links', {
        params: productId ? { productId } : undefined,
      })
      const items =
        response.data?.items ??
        response.data?.result?.items ??
        response.data ??
        []
      return z.array(polarCheckoutLinkSchema).parse(items)
    },
  })
}

export function useMutationCreateCheckoutLink() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: any) => {
      const response = await http.post('/admin/polar/checkout-links', payload)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['polar-checkout-links'] })
      toast.success('Checkout link created')
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.message || 'Failed to create checkout link'
      )
    },
  })
}

export function useMutationDeleteCheckoutLink() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await http.delete(`/admin/polar/checkout-links/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['polar-checkout-links'] })
      toast.success('Checkout link deleted')
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.message || 'Failed to delete checkout link'
      )
    },
  })
}

// ==========================================
// BENEFITS
// ==========================================

export function useDataPolarBenefits() {
  return useQuery({
    queryKey: ['polar-benefits'],
    queryFn: async () => {
      const response = await http.get('/admin/polar/benefits')
      const items = Array.isArray(response.data)
        ? response.data
        : (response.data?.items ?? response.data?.result?.items ?? [])
      return z.array(polarBenefitSchema).parse(items)
    },
  })
}

export function useMutationCreateBenefit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: any) => {
      const response = await http.post('/admin/polar/benefits', payload)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['polar-benefits'] })
      toast.success('Benefit created successfully')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create benefit')
    },
  })
}

export function useMutationDeleteBenefit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await http.delete(`/admin/polar/benefits/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['polar-benefits'] })
      toast.success('Benefit deleted successfully')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete benefit')
    },
  })
}

export function useDataPolarBenefitGrants(benefitId?: string) {
  return useQuery({
    queryKey: ['polar-benefit-grants', benefitId],
    queryFn: async () => {
      if (!benefitId) return []
      const response = await http.get(
        `/admin/polar/benefits/${benefitId}/grants`
      )
      return (
        response.data?.items ??
        response.data?.result?.items ??
        response.data ??
        []
      )
    },
    enabled: Boolean(benefitId),
  })
}

// ==========================================
// ANALYTICS & METRICS
// ==========================================

export function useDataPolarMetrics(params: {
  startDate: string
  endDate: string
  interval: 'day' | 'week' | 'month' | 'year'
  productId?: string
}) {
  return useQuery({
    queryKey: ['polar-metrics', params],
    queryFn: async () => {
      const response = await http.get('/admin/polar/analytics/metrics', {
        params,
      })
      return response.data
    },
    enabled: Boolean(params.startDate && params.endDate),
  })
}

export function useDataPolarMetricsLimits() {
  return useQuery({
    queryKey: ['polar-metrics-limits'],
    queryFn: async () => {
      const response = await http.get('/admin/polar/analytics/limits')
      return response.data
    },
  })
}

export function useDataPolarOrganizations() {
  return useQuery({
    queryKey: ['polar-organizations'],
    queryFn: async () => {
      const response = await http.get('/admin/polar/organizations')
      return response.data?.items ?? response.data?.result?.items ?? []
    },
  })
}

// ==========================================
// PRODUCTS (Read-only from Polar SDK)
// ==========================================

export async function apiGetPolarProducts() {
  const response = await http.get('/admin/payments/products')
  return (
    response.data?.items ?? response.data?.result?.items ?? response.data ?? []
  )
}

export function useDataPolarProducts() {
  return useQuery({
    queryKey: ['polar-admin-products'],
    queryFn: () => apiGetPolarProducts(),
  })
}

export async function apiGetPolarProduct(id: string) {
  const response = await http.get(`/admin/payments/products/${id}`)
  return response.data
}

export function useDataPolarProduct(id?: string) {
  return useQuery({
    queryKey: ['polar-admin-product', id],
    queryFn: () => apiGetPolarProduct(id!),
    enabled: Boolean(id),
  })
}
