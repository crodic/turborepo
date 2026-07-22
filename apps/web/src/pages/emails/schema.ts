import z from 'zod'

export const emailStatusSchema = z.enum([
  'scheduled',
  'sent',
  'failed',
  'cancelled',
])

export const emailLogSchema = z.object({
  id: z.string(),
  source: z.string(),
  status: emailStatusSchema,
  subject: z.string(),
  from: z.string(),
  to: z.array(z.string()).default([]),
  cc: z.array(z.string()).nullish(),
  bcc: z.array(z.string()).nullish(),
  body: z.string().nullish(),
  renderedBody: z.string().nullish(),
  templateName: z.string().nullish(),
  email: z.string().nullish(),
  attachments: z.array(z.record(z.string(), z.any())).nullish(),
  scheduledAt: z.string().nullish(),
  sentAt: z.string().nullish(),
  failedAt: z.string().nullish(),
  cancelledAt: z.string().nullish(),
  errorMessage: z.string().nullish(),
  queueJobId: z.string().nullish(),
  jobName: z.string().nullish(),
  attempts: z.number().default(0),
  createdByAdminId: z.string().nullish(),
  createdByAdmin: z
    .object({
      id: z.string(),
      email: z.string(),
      fullName: z.string().nullish(),
    })
    .nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type EmailLogSchema = z.infer<typeof emailLogSchema>

export const emailRecipientOptionSchema = z.object({
  id: z.string(),
  type: z.enum(['admin', 'user']),
  name: z.string(),
  email: z.string(),
})

export type EmailRecipientOptionSchema = z.infer<
  typeof emailRecipientOptionSchema
>

function parseEmailText(value?: string) {
  return (value ?? '')
    .split(/[\n,;]/)
    .map((email) => email.trim())
    .filter(Boolean)
}

function hasOnlyValidEmails(value?: string) {
  return parseEmailText(value).every(
    (email) => z.email().safeParse(email).success
  )
}

function stripHtml(value: string) {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim()
}

export const emailFormSchema = z.object({
  to: z
    .string()
    .refine((value) => parseEmailText(value).length > 0, {
      message: 'At least one recipient is required',
    })
    .refine(hasOnlyValidEmails, {
      message: 'Recipient emails are invalid',
    }),
  cc: z.string().optional().refine(hasOnlyValidEmails, {
    message: 'Cc emails are invalid',
  }),
  bcc: z.string().optional().refine(hasOnlyValidEmails, {
    message: 'Bcc emails are invalid',
  }),
  subject: z.string().trim().min(1, 'Subject is required'),
  body: z.string().refine((value) => stripHtml(value).length > 0, {
    message: 'Body is required',
  }),
  scheduledAt: z.string().optional(),
})

export type EmailFormSchema = z.infer<typeof emailFormSchema>

export const ColumnKey = {
  id: 'id',
  status: 'status',
  subject: 'subject',
  source: 'source',
  scheduledAt: 'scheduledAt',
  sentAt: 'sentAt',
  createdAt: 'createdAt',
} as const
