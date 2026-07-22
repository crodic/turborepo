import z from 'zod'
import { useQuery } from '@tanstack/react-query'
import {
  type ApiMetadata,
  apiMetadataSchema,
  type PaginateQueryParams,
} from '@/global'
import http from '@/lib/http'
import {
  cmsPageFormSchema,
  cmsPageSchema,
  type CmsPageFormSchema,
  type CmsPageSchema,
} from './schema'

export async function apiGetCmsPageListing(
  params: PaginateQueryParams
): Promise<ApiMetadata & { data: CmsPageSchema[] }> {
  const response = await http.get('/cms-pages', { params })

  return apiMetadataSchema
    .extend({
      data: z.array(cmsPageSchema),
    })
    .parse(response.data)
}

export async function apiGetCmsPageById(id: string) {
  const response = await http.get(`/cms-pages/${id}`)

  return cmsPageSchema.parse(response.data)
}

export async function apiCreateCmsPage(data: CmsPageFormSchema) {
  const response = await http.post('/cms-pages', cmsPageFormSchema.parse(data))

  return cmsPageSchema.parse(response.data)
}

export async function apiUpdateCmsPage({
  id,
  data,
}: {
  id: string
  data: CmsPageFormSchema
}) {
  const response = await http.put(
    `/cms-pages/${id}`,
    cmsPageFormSchema.parse(data)
  )

  return cmsPageSchema.parse(response.data)
}

export async function apiDeleteCmsPage(id: string) {
  return http.delete(`/cms-pages/${id}`)
}

export const useDataCmsPageOverview = (params: PaginateQueryParams) =>
  useQuery({
    queryKey: ['cms-pages', params],
    queryFn: () => apiGetCmsPageListing(params),
  })

export const useDataCmsPageById = (id: string) =>
  useQuery({
    queryKey: ['cms-page', id],
    queryFn: () => apiGetCmsPageById(id),
  })
