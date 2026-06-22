import z from 'zod'

export const HistoryColumnKey = {
  id: 'id',
  sessionId: 'sessionId',
  adminId: 'adminId',
  targetUserId: 'targetUserId',
  reason: 'reason',
  status: 'status',
  itemsCount: 'itemsCount',
  startedAt: 'startedAt',
  stoppedAt: 'stoppedAt',
} as const

export const ItemColumnKey = {
  id: 'id',
  action: 'action',
  method: 'method',
  endpoint: 'endpoint',
  entityType: 'entityType',
  entityId: 'entityId',
  status: 'status',
  createdAt: 'createdAt',
} as const

const logUserSchema = z
  .object({
    id: z.string().nullish(),
    firstName: z.string().nullish(),
    lastName: z.string().nullish(),
    fullName: z.string().nullish(),
    email: z.string().nullish(),
  })
  .nullish()

export const impersonationLogHistorySchema = z.object({
  id: z.string(),
  sessionId: z.string().nullish(),
  adminId: z.string().nullish(),
  targetUserId: z.string().nullish(),
  reason: z.string().nullish(),
  status: z.string(),
  ipAddress: z.string().nullish(),
  userAgent: z.string().nullish(),
  startedAt: z.string(),
  stoppedAt: z.string().nullish(),
  expiresAt: z.string().nullish(),
  createdAt: z.string(),
  itemsCount: z.number().nullish(),
  admin: logUserSchema,
  targetUser: logUserSchema,
})

export const impersonationLogItemSchema = z.object({
  id: z.string(),
  historyId: z.string().nullish(),
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

export type ImpersonationLogHistorySchema = z.infer<
  typeof impersonationLogHistorySchema
>
export type ImpersonationLogItemSchema = z.infer<
  typeof impersonationLogItemSchema
>
