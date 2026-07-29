import { z } from 'zod'

export const requestLogSchema = z.object({
  id: z.string(),
  method: z.string(),
  path: z.string(),
  status: z.number(),
  ip: z.string().nullable(),
  browser: z.string().nullable(),
  os: z.string().nullable(),
  device: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  source: z.string().nullable(),
  duration: z.number().nullable(),
  userId: z.string().nullable(),
  guard: z.string().nullable(),
  timestamp: z.string(),
})

export type RequestLogSchema = z.infer<typeof requestLogSchema>

export enum ColumnKey {
  method = 'method',
  path = 'path',
  status = 'status',
  ip = 'ip',
  browser = 'browser',
  os = 'os',
  device = 'device',
  duration = 'duration',
  timestamp = 'timestamp',
}
