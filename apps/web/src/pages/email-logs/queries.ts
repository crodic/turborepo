import z from 'zod'
import { useQuery } from '@tanstack/react-query'
import {
  type ApiMetadata,
  apiMetadataSchema,
  type PaginateQueryParams,
} from '@/global'
import http from '@/lib/http'
import { emailLogSchema, type EmailLogSchema } from './schema'

async function getEmailLogs(
  params: PaginateQueryParams
): Promise<ApiMetadata & { data: EmailLogSchema[] }> {
  const response = await http.get('/email-logs', { params })

  return apiMetadataSchema
    .extend({ data: z.array(emailLogSchema) })
    .parse(response.data)
}

export async function apiGetEmailLog(id: string): Promise<EmailLogSchema> {
  const response = await http.get(`/email-logs/${id}`)

  return emailLogSchema.parse(response.data)
}

export const useDataEmailLogs = (params: PaginateQueryParams) =>
  useQuery({
    queryKey: ['email_logs', params],
    queryFn: () => getEmailLogs(params),
    refetchInterval: (query) => {
      const stateData = query.state.data as any
      const hasPending = stateData?.data?.some(
        (e: any) =>
          e.status === 'scheduled' &&
          (!e.scheduledAt || new Date(e.scheduledAt) <= new Date())
      )
      return hasPending ? 3000 : false
    },
  })

export const useDataEmailLogDetail = (id: string) =>
  useQuery({
    queryKey: ['email_log', id],
    queryFn: () => apiGetEmailLog(id),
    refetchInterval: (query) => {
      const e = query.state.data as any
      const isPending =
        e?.status === 'scheduled' &&
        (!e.scheduledAt || new Date(e.scheduledAt) <= new Date())
      return isPending ? 3000 : false
    },
  })
