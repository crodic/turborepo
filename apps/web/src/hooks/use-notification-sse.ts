import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { notificationKeys } from '@/pages/notifications/queries'
import {
  notificationSchema,
  type NotificationSchema,
  type NotificationUnreadCountSchema,
} from '@/pages/notifications/schema'

const NOTIFICATION_LIMIT = 20

/**
 * Hook to listen for realtime notifications via Server-Sent Events (SSE).
 * Replaces WebSocket connection with native HTTP streaming.
 *
 * Automatically:
 * - Subscribes to /api/v1/notifications/stream using the user's access token
 * - Updates React Query caches for notification list and unread count
 * - Shows toast and native browser notifications when new messages arrive
 * - Handles automatic reconnects via native EventSource behavior
 */
export function useNotificationSse() {
  const queryClient = useQueryClient()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const accessToken = useAuthStore((state) => state.meta.accessToken)
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      return
    }

    const apiUrl =
      (import.meta.env.VITE_API_URL as string | undefined) ||
      'http://localhost:8000/api/v1'
    const cleanApiUrl = apiUrl.replace(/\/+$/, '')
    const streamUrl = `${cleanApiUrl}/notifications/stream?token=${encodeURIComponent(accessToken)}`

    const eventSource = new EventSource(streamUrl, { withCredentials: true })
    eventSourceRef.current = eventSource

    const handleNewNotification = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data)
        const parsed = notificationSchema.safeParse(payload)

        if (!parsed.success) return

        queryClient.setQueryData<NotificationSchema[]>(
          notificationKeys.list(NOTIFICATION_LIMIT),
          (current = []) => {
            const filtered = current.filter(
              (item) => item.id !== parsed.data.id
            )
            return [parsed.data, ...filtered].slice(0, NOTIFICATION_LIMIT)
          }
        )

        queryClient.invalidateQueries({
          queryKey: notificationKeys.unreadCount(),
        })

        toast.info(parsed.data.title, {
          description: parsed.data.message,
          position: 'top-right',
          duration: 8000,
        })

        if ('Notification' in window && Notification.permission === 'granted') {
          const nativeNotification = new Notification(parsed.data.title, {
            body: parsed.data.message,
          })
          nativeNotification.onclick = () => {
            window.focus()
          }
        }
      } catch {
        // Silently ignore corrupted events
      }
    }

    const handleUnreadCount = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data)
        if (
          typeof payload === 'object' &&
          payload !== null &&
          'unreadCount' in payload
        ) {
          const unreadCount = Number(payload.unreadCount)
          if (Number.isFinite(unreadCount)) {
            queryClient.setQueryData<NotificationUnreadCountSchema>(
              notificationKeys.unreadCount(),
              { unreadCount }
            )
          }
        }
      } catch {
        // Silently ignore corrupted events
      }
    }

    eventSource.addEventListener('notification:new', handleNewNotification)
    eventSource.addEventListener('notification:unread-count', handleUnreadCount)

    return () => {
      eventSource.removeEventListener('notification:new', handleNewNotification)
      eventSource.removeEventListener(
        'notification:unread-count',
        handleUnreadCount
      )
      eventSource.close()
      eventSourceRef.current = null
    }
  }, [isAuthenticated, accessToken, queryClient])
}
