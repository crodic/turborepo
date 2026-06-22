import z from 'zod'
import { useQuery } from '@tanstack/react-query'
import {
  type ApiMetadata,
  apiMetadataSchema,
  type PaginateQueryParams,
} from '@/global'
import http from '@/lib/http'
import {
  impersonationLogHistorySchema,
  impersonationLogItemSchema,
  type ImpersonationLogHistorySchema,
  type ImpersonationLogItemSchema,
} from './schema'

async function getImpersonationHistoryListing(
  params: PaginateQueryParams
): Promise<ApiMetadata & { data: ImpersonationLogHistorySchema[] }> {
  const response = await http.get('/impersonate-logs', { params })

  return apiMetadataSchema
    .extend({ data: z.array(impersonationLogHistorySchema) })
    .parse(response.data)
}

async function getImpersonationHistoryDetail(
  id: string
): Promise<ImpersonationLogHistorySchema> {
  const response = await http.get(`/impersonate-logs/${id}`)

  return impersonationLogHistorySchema.parse(response.data)
}

async function getImpersonationHistoryItems(
  id: string,
  params: PaginateQueryParams
): Promise<ApiMetadata & { data: ImpersonationLogItemSchema[] }> {
  const response = await http.get(`/impersonate-logs/${id}/items`, { params })

  return apiMetadataSchema
    .extend({ data: z.array(impersonationLogItemSchema) })
    .parse(response.data)
}

export const useDataImpersonationLogOverview = (params: PaginateQueryParams) =>
  useQuery({
    queryKey: ['impersonation_log_histories', params],
    queryFn: () => getImpersonationHistoryListing(params),
  })

export const useDataImpersonationLogDetail = (id: string) =>
  useQuery({
    queryKey: ['impersonation_log_history', id],
    queryFn: () => getImpersonationHistoryDetail(id),
    enabled: !!id,
  })

export const useDataImpersonationLogItems = (
  id: string,
  params: PaginateQueryParams
) =>
  useQuery({
    queryKey: ['impersonation_log_history_items', id, params],
    queryFn: () => getImpersonationHistoryItems(id, params),
    enabled: !!id,
  })
