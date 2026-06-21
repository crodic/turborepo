import z from 'zod'
import { useQuery } from '@tanstack/react-query'
import {
  type ApiMetadata,
  apiMetadataSchema,
  type PaginateQueryParams,
} from '@/global'
import http from '@/lib/http'
import {
  emailRecipientOptionSchema,
  emailLogSchema,
  type EmailFormSchema,
  type EmailRecipientOptionSchema,
  type EmailLogSchema,
} from './schema'

function parseEmails(value?: string) {
  if (!value) return []

  const emails = value
    .split(/[\n,;]/)
    .map((email) => email.trim())
    .filter(Boolean)

  return [...new Set(emails.map((email) => email.toLowerCase()))]
}

function toPayload(data: EmailFormSchema) {
  return {
    to: parseEmails(data.to),
    cc: parseEmails(data.cc),
    bcc: parseEmails(data.bcc),
    subject: data.subject,
    body: data.body,
    scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
  }
}

async function getMyEmails(
  params: PaginateQueryParams
): Promise<ApiMetadata & { data: EmailLogSchema[] }> {
  const response = await http.get('/emails/my', { params })

  return apiMetadataSchema
    .extend({ data: z.array(emailLogSchema) })
    .parse(response.data)
}

async function getEmailLogs(
  params: PaginateQueryParams
): Promise<ApiMetadata & { data: EmailLogSchema[] }> {
  const response = await http.get('/email-logs', { params })

  return apiMetadataSchema
    .extend({ data: z.array(emailLogSchema) })
    .parse(response.data)
}

export async function apiGetMyEmail(id: string): Promise<EmailLogSchema> {
  const response = await http.get(`/emails/${id}`)

  return emailLogSchema.parse(response.data)
}

export async function apiGetEmailLog(id: string): Promise<EmailLogSchema> {
  const response = await http.get(`/email-logs/${id}`)

  return emailLogSchema.parse(response.data)
}

export async function apiCreateEmail(data: EmailFormSchema) {
  const response = await http.post('/emails', toPayload(data))

  return emailLogSchema.parse(response.data)
}

export async function apiUpdateEmail({
  id,
  data,
}: {
  id: string
  data: EmailFormSchema
}) {
  const response = await http.patch(`/emails/${id}`, toPayload(data))

  return emailLogSchema.parse(response.data)
}

export async function apiCancelEmail(id: string) {
  const response = await http.post(`/emails/${id}/cancel`)

  return emailLogSchema.parse(response.data)
}

export async function apiSearchEmailRecipients(
  search?: string
): Promise<EmailRecipientOptionSchema[]> {
  const response = await http.get('/emails/recipients', {
    params: { search },
  })

  return z.array(emailRecipientOptionSchema).parse(response.data)
}

export const useDataMyEmails = (params: PaginateQueryParams) =>
  useQuery({
    queryKey: ['my_emails', params],
    queryFn: () => getMyEmails(params),
  })

export const useDataEmailLogs = (params: PaginateQueryParams) =>
  useQuery({
    queryKey: ['email_logs', params],
    queryFn: () => getEmailLogs(params),
  })

export const useDataMyEmailDetail = (id: string) =>
  useQuery({
    queryKey: ['my_email', id],
    queryFn: () => apiGetMyEmail(id),
  })

export const useDataEmailLogDetail = (id: string) =>
  useQuery({
    queryKey: ['email_log', id],
    queryFn: () => apiGetEmailLog(id),
  })
