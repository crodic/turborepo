import z from 'zod'
import { useQuery } from '@tanstack/react-query'
import http from '@/lib/http'
import {
  notificationSchema,
  notificationUnreadCountSchema,
  type NotificationSchema,
  type NotificationUnreadCountSchema,
} from './schema'

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (limit = 20) => [...notificationKeys.all, 'list', limit] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
}

export async function apiGetNotifications(
  limit = 20
): Promise<NotificationSchema[]> {
  const response = await http.get('/notifications', {
    params: { limit },
  })

  return z.array(notificationSchema).parse(response.data)
}

export async function apiGetNotificationUnreadCount(): Promise<NotificationUnreadCountSchema> {
  const response = await http.get('/notifications/unread-count')

  return notificationUnreadCountSchema.parse(response.data)
}

export async function apiMarkNotificationRead(id: string) {
  const response = await http.patch(`/notifications/${id}/read`)

  return notificationSchema.parse(response.data)
}

export async function apiMarkAllNotificationsRead() {
  const response = await http.patch('/notifications/read-all')

  return notificationUnreadCountSchema.parse(response.data)
}

export async function apiDeleteNotification(id: string) {
  const response = await http.delete(`/notifications/${id}`)

  return notificationUnreadCountSchema.parse(response.data)
}

export const useNotifications = (limit = 20) =>
  useQuery({
    queryKey: notificationKeys.list(limit),
    queryFn: () => apiGetNotifications(limit),
  })

export const useNotificationUnreadCount = () =>
  useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: apiGetNotificationUnreadCount,
  })
