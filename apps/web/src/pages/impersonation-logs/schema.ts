import z from 'zod'

export const ColumnKey = {
  id: 'id',
  sessionId: 'sessionId',
  adminId: 'adminId',
  targetUserId: 'targetUserId',
  action: 'action',
  method: 'method',
  endpoint: 'endpoint',
  status: 'status',
  createdAt: 'createdAt',
} as const

export const impersonationLogSchema = z.object({
  id: z.string(),
  sessionId: z.string().nullish(),
  adminId: z.string().nullish(),
  targetUserId: z.string().nullish(),
  action: z.string().nullish(),
  method: z.string().nullish(),
  endpoint: z.string().nullish(),
  entityType: z.string().nullish(),
  entityId: z.string().nullish(),
  input: z.any().nullish(),
  output: z.any().nullish(),
  before: z.any().nullish(),
  after: z.any().nullish(),
  changedFields: z.any().nullish(),
  status: z.string(),
  errorMessage: z.string().nullish(),
  ipAddress: z.string().nullish(),
  userAgent: z.string().nullish(),
  createdAt: z.string(),
})

export type ImpersonationLogSchema = z.infer<typeof impersonationLogSchema>
