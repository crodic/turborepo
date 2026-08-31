import z from 'zod'
import { useQuery } from '@tanstack/react-query'
import {
  type ApiMetadata,
  apiMetadataSchema,
  type PaginateQueryParams,
} from '@/global'
import http from '@/lib/http'
import {
  activeWhiteLabelSchema,
  type ActiveWhiteLabelSchema,
  type WhiteLabelFormSchema,
  whiteLabelSchema,
  type WhiteLabelSchema,
  type WhiteLabelTarget,
} from './schema'

export const WHITE_LABEL_ACTIVE_STORAGE_KEY = 'active_white_label_cache'

export const whiteLabelQueryKeys = {
  all: ['white-labels'] as const,
  list: (params: PaginateQueryParams) => [...whiteLabelQueryKeys.all, params],
  detail: (id: string) => [...whiteLabelQueryKeys.all, id],
  active: (target: WhiteLabelTarget = 'admin') =>
    ['active-white-label', target] as const,
}

function buildWhiteLabelFormData(data: WhiteLabelFormSchema): FormData {
  const formData = new FormData()

  formData.append('name', data.name)
  if (data.description) formData.append('description', data.description)
  if (data.target) formData.append('target', data.target)
  formData.append('isActive', String(data.isActive ?? false))
  if (data.brandName) formData.append('brandName', data.brandName)
  if (data.siteTitle) formData.append('siteTitle', data.siteTitle)
  if (data.siteTagline) formData.append('siteTagline', data.siteTagline)
  if (data.copyrightText) formData.append('copyrightText', data.copyrightText)
  if (data.metaTitle) formData.append('metaTitle', data.metaTitle)
  if (data.metaDescription)
    formData.append('metaDescription', data.metaDescription)
  if (data.canonicalUrl) formData.append('canonicalUrl', data.canonicalUrl)

  formData.append('styles', JSON.stringify(data.styles))

  formData.append('remove_site_logo', String(data.remove_site_logo ?? false))
  formData.append(
    'remove_site_dark_logo',
    String(data.remove_site_dark_logo ?? false)
  )
  formData.append(
    'remove_site_favicon',
    String(data.remove_site_favicon ?? false)
  )
  formData.append('remove_og_image', String(data.remove_og_image ?? false))
  formData.append(
    'remove_twitter_image',
    String(data.remove_twitter_image ?? false)
  )

  if (data.site_logo instanceof File) {
    formData.append('site_logo', data.site_logo)
  }
  if (data.site_dark_logo instanceof File) {
    formData.append('site_dark_logo', data.site_dark_logo)
  }
  if (data.site_favicon instanceof File) {
    formData.append('site_favicon', data.site_favicon)
  }
  if (data.og_image instanceof File) {
    formData.append('og_image', data.og_image)
  }
  if (data.twitter_image instanceof File) {
    formData.append('twitter_image', data.twitter_image)
  }

  return formData
}

export async function apiGetWhiteLabelListing(
  params: PaginateQueryParams
): Promise<ApiMetadata & { data: WhiteLabelSchema[] }> {
  const response = await http.get('/white-labels', { params })

  return apiMetadataSchema
    .extend({
      data: z.array(whiteLabelSchema),
    })
    .parse(response.data)
}

export async function apiGetWhiteLabelById(id: string) {
  const response = await http.get(`/white-labels/${id}`)
  return whiteLabelSchema.parse(response.data)
}

export async function apiGetActiveWhiteLabel(
  target: WhiteLabelTarget = 'admin'
): Promise<ActiveWhiteLabelSchema | null> {
  const response = await http.get('/white-labels/active', {
    params: { target },
  })

  if (!response.data) return null
  const parsed = activeWhiteLabelSchema.parse(response.data)

  if (target === 'admin') {
    localStorage.setItem(WHITE_LABEL_ACTIVE_STORAGE_KEY, JSON.stringify(parsed))
  }

  return parsed
}

export function getCachedActiveWhiteLabel():
  | ActiveWhiteLabelSchema
  | undefined {
  const value = localStorage.getItem(WHITE_LABEL_ACTIVE_STORAGE_KEY)
  if (!value) return undefined

  try {
    const result = activeWhiteLabelSchema.safeParse(JSON.parse(value))
    return result.success ? result.data : undefined
  } catch {
    localStorage.removeItem(WHITE_LABEL_ACTIVE_STORAGE_KEY)
    return undefined
  }
}

export async function apiCreateWhiteLabel(data: WhiteLabelFormSchema) {
  const formData = buildWhiteLabelFormData(data)
  const response = await http.post('/white-labels', formData)
  return whiteLabelSchema.parse(response.data)
}

export async function apiUpdateWhiteLabel({
  id,
  data,
}: {
  id: string
  data: WhiteLabelFormSchema
}) {
  const formData = buildWhiteLabelFormData(data)
  const response = await http.put(`/white-labels/${id}`, formData)
  return whiteLabelSchema.parse(response.data)
}

export async function apiActivateWhiteLabel(id: string) {
  const response = await http.post(`/white-labels/${id}/activate`)
  return whiteLabelSchema.parse(response.data)
}

export async function apiDeactivateWhiteLabel(id: string) {
  const response = await http.post(`/white-labels/${id}/deactivate`)
  return whiteLabelSchema.parse(response.data)
}

export async function apiDuplicateWhiteLabel(id: string) {
  const response = await http.post(`/white-labels/${id}/duplicate`)
  return whiteLabelSchema.parse(response.data)
}

export async function apiDeleteWhiteLabel(id: string) {
  return http.delete(`/white-labels/${id}`)
}

export const useDataWhiteLabelOverview = (params: PaginateQueryParams) =>
  useQuery({
    queryKey: whiteLabelQueryKeys.list(params),
    queryFn: () => apiGetWhiteLabelListing(params),
  })

export const useDataWhiteLabelById = (id: string) =>
  useQuery({
    queryKey: whiteLabelQueryKeys.detail(id),
    queryFn: () => apiGetWhiteLabelById(id),
  })

export const useDataActiveWhiteLabel = (target: WhiteLabelTarget = 'admin') =>
  useQuery({
    queryKey: whiteLabelQueryKeys.active(target),
    queryFn: () => apiGetActiveWhiteLabel(target),
    initialData: target === 'admin' ? getCachedActiveWhiteLabel : undefined,
    staleTime: 5 * 60 * 1000,
  })
