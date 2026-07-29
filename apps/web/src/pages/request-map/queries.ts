import { useQuery } from '@tanstack/react-query'
import type { PaginateQueryParams, ApiMetadata } from '@/global'
import http from '@/lib/http'
import type { RequestLogSchema } from './schema'

export function useDataRequestLogs(params: PaginateQueryParams) {
  return useQuery({
    queryKey: ['request-logs', params],
    queryFn: () =>
      http
        .get<
          ApiMetadata & { data: RequestLogSchema[] }
        >('system/request-logs', { params })
        .then((res) => res.data),
    placeholderData: (previousData) => previousData,
    staleTime: 5 * 1000,
  })
}

export function useDataRequestMapLogs() {
  return useQuery({
    queryKey: ['request-map-logs'],
    queryFn: () =>
      http
        .get<RequestLogSchema[]>('system/request-logs/map')
        .then((res) => res.data),
    staleTime: 10 * 1000,
  })
}
