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

export const ColumnKey = {
  id: 'id',
  status: 'status',
  subject: 'subject',
  source: 'source',
  scheduledAt: 'scheduledAt',
  sentAt: 'sentAt',
  createdAt: 'createdAt',
} as const
