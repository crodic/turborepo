import z from 'zod'

export const notificationSchema = z.object({
  id: z.string(),
  adminId: z.string(),
  type: z.string(),
  title: z.string(),
  message: z.string(),
  data: z.record(z.string(), z.unknown()).nullish(),
  readAt: z.string().nullish(),
  createdAt: z.string(),
})

export const notificationUnreadCountSchema = z.object({
  unreadCount: z.number(),
})

export type NotificationSchema = z.infer<typeof notificationSchema>
export type NotificationUnreadCountSchema = z.infer<
  typeof notificationUnreadCountSchema
>
