import z from 'zod'
import { useQuery } from '@tanstack/react-query'
import {
  type ApiMetadata,
  apiMetadataSchema,
  type PaginateQueryParams,
} from '@/global'
import http from '@/lib/http'
import { impersonationLogSchema, type ImpersonationLogSchema } from './schema'

async function getImpersonationLogListing(
  params: PaginateQueryParams
): Promise<ApiMetadata & { data: ImpersonationLogSchema[] }> {
  const response = await http.get('/impersonate-logs', { params })

  return apiMetadataSchema
    .extend({ data: z.array(impersonationLogSchema) })
    .parse(response.data)
}

export const useDataImpersonationLogOverview = (params: PaginateQueryParams) =>
  useQuery({
    queryKey: ['impersonation_logs', params],
    queryFn: () => getImpersonationLogListing(params),
  })
