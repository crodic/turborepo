import z from 'zod'
import { useQuery } from '@tanstack/react-query'
import {
  type ApiMetadata,
  apiMetadataSchema,
  type PaginateQueryParams,
} from '@/global'
import http from '@/lib/http'
import {
  themeFormSchema,
  themeSchema,
  type ThemeFormSchema,
  type ThemeSchema,
  type ThemeTarget,
} from './schema'

export const themeQueryKeys = {
  all: ['themes'] as const,
  list: (params: PaginateQueryParams) => [...themeQueryKeys.all, params],
  detail: (id: string) => [...themeQueryKeys.all, id],
  runtime: (target: ThemeTarget) => ['runtime-theme', target] as const,
}

export async function apiGetThemeListing(
  params: PaginateQueryParams
): Promise<ApiMetadata & { data: ThemeSchema[] }> {
  const response = await http.get('/themes', { params })

  return apiMetadataSchema
    .extend({
      data: z.array(themeSchema),
    })
    .parse(response.data)
}

export async function apiGetThemeById(id: string) {
  const response = await http.get(`/themes/${id}`)
  return themeSchema.parse(response.data)
}

export async function apiCreateTheme(data: ThemeFormSchema) {
  const response = await http.post('/themes', themeFormSchema.parse(data))
  return themeSchema.parse(response.data)
}

export async function apiEditTheme({
  id,
  data,
}: {
  id: string
  data: ThemeFormSchema
}) {
  const response = await http.put(`/themes/${id}`, themeFormSchema.parse(data))
  return themeSchema.parse(response.data)
}

export async function apiDeleteTheme(id: string) {
  return http.delete(`/themes/${id}`)
}

export async function apiDuplicateTheme(id: string) {
  const response = await http.post(`/themes/${id}/duplicate`)
  return themeSchema.parse(response.data)
}

export async function apiPublishTheme({
  id,
  target,
}: {
  id: string
  target: ThemeTarget
}) {
  const response = await http.post(`/themes/${id}/publish`, { target })
  return themeSchema.parse(response.data)
}

export async function apiUnpublishTheme({
  id,
  target,
}: {
  id: string
  target: ThemeTarget
}) {
  const response = await http.post(`/themes/${id}/unpublish`, { target })
  return themeSchema.parse(response.data)
}

export async function apiGetRuntimeTheme(target: ThemeTarget = 'admin') {
  const response = await http.get('/themes/runtime/current', {
    params: { target },
  })
  return response.data ? themeSchema.parse(response.data) : null
}

export const useDataThemeOverview = (params: PaginateQueryParams) =>
  useQuery({
    queryKey: themeQueryKeys.list(params),
    queryFn: () => apiGetThemeListing(params),
  })

export const useDataThemeById = (id: string) =>
  useQuery({
    queryKey: themeQueryKeys.detail(id),
    queryFn: () => apiGetThemeById(id),
  })

export const useDataRuntimeTheme = (target: ThemeTarget = 'admin') =>
  useQuery({
    queryKey: themeQueryKeys.runtime(target),
    queryFn: () => apiGetRuntimeTheme(target),
  })
