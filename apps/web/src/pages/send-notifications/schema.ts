import z from 'zod'

export const sendNotificationSchema = z.object({
  targetAdminIds: z.array(z.number()).optional(),
  title: z.string().min(1, 'Title is required').max(255),
  message: z.string().min(1, 'Message is required'),
})

export type SendNotificationSchema = z.infer<typeof sendNotificationSchema>
