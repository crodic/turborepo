import z from 'zod'

export const ColumnKey = {
  id: 'id',
  entityId: 'entityId',
  entity: 'entity',
  action: 'action',
  userId: 'userId',
  timestamp: 'timestamp',
}

export const logSchema = z.object({
  id: z.string(),
  entity: z.string().nullable(),
  entityId: z.string().nullable(),
  action: z.string(),
  userId: z.string().nullish(),
  oldValue: z.any().nullish(),
  newValue: z.any().nullish(),
  metadata: z.any().nullish(),
  description: z.string().nullish(),
  requestId: z.string().nullish(),
  ip: z.string().nullish(),
  userAgent: z.string().nullish(),
  timestamp: z.string(),
})

export type ActivityLogSchema = z.infer<typeof logSchema>
