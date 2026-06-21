import { useEffect, useState } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCheck, Circle, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useNotificationSocket } from '@/context/notification-socket-context'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  apiDeleteNotification,
  apiMarkAllNotificationsRead,
  apiMarkNotificationRead,
  notificationKeys,
  useNotifications,
  useNotificationUnreadCount,
} from '@/pages/notifications/queries'
import {
  notificationSchema,
  type NotificationSchema,
  type NotificationUnreadCountSchema,
} from '@/pages/notifications/schema'

const NOTIFICATION_LIMIT = 20

export function NotificationDropdown() {
  const socket = useNotificationSocket()
  const queryClient = useQueryClient()
  const [selectedNotification, setSelectedNotification] =
    useState<NotificationSchema | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const notificationsQuery = useNotifications(NOTIFICATION_LIMIT)
  const unreadCountQuery = useNotificationUnreadCount()
  const unreadCount = unreadCountQuery.data?.unreadCount ?? 0

  const markReadMutation = useMutation({
    mutationFn: apiMarkNotificationRead,
    onSuccess: (notification) => {
      queryClient.setQueryData<NotificationSchema[]>(
        notificationKeys.list(NOTIFICATION_LIMIT),
        (current) =>
          current?.map((item) =>
            item.id === notification.id ? notification : item
          )
      )
      queryClient.invalidateQueries({
        queryKey: notificationKeys.unreadCount(),
      })
      setSelectedNotification((current) =>
        current?.id === notification.id ? notification : current
      )
    },
  })

  const markAllReadMutation = useMutation({
    mutationFn: apiMarkAllNotificationsRead,
    onSuccess: (data) => {
      queryClient.setQueryData<NotificationUnreadCountSchema>(
        notificationKeys.unreadCount(),
        data
      )
      queryClient.setQueryData<NotificationSchema[]>(
        notificationKeys.list(NOTIFICATION_LIMIT),
        (current) => {
          const readAt = new Date().toISOString()
          return current?.map((item) => ({
            ...item,
            readAt: item.readAt ?? readAt,
          }))
        }
      )
    },
  })

  const deleteMutation = useMutation({
    mutationFn: apiDeleteNotification,
    onSuccess: (data, notificationId) => {
      queryClient.setQueryData<NotificationSchema[]>(
        notificationKeys.list(NOTIFICATION_LIMIT),
        (current) => current?.filter((item) => item.id !== notificationId)
      )
      queryClient.setQueryData<NotificationUnreadCountSchema>(
        notificationKeys.unreadCount(),
        data
      )
      setSelectedNotification((current) =>
        current?.id === notificationId ? null : current
      )
    },
  })

  useEffect(() => {
    if (!socket) return

    const handleNewNotification = (payload: unknown) => {
      const parsed = notificationSchema.safeParse(payload)

      if (!parsed.success) return

      queryClient.setQueryData<NotificationSchema[]>(
        notificationKeys.list(NOTIFICATION_LIMIT),
        (current = []) => {
          const filtered = current.filter((item) => item.id !== parsed.data.id)
          return [parsed.data, ...filtered].slice(0, NOTIFICATION_LIMIT)
        }
      )
      queryClient.invalidateQueries({
        queryKey: notificationKeys.unreadCount(),
      })
      toast.message(parsed.data.title, {
        description: parsed.data.message,
      })
    }

    const handleUnreadCount = (payload: unknown) => {
      if (
        typeof payload !== 'object' ||
        payload === null ||
        !('unreadCount' in payload)
      ) {
        return
      }

      const unreadCount = Number(payload.unreadCount)

      if (!Number.isFinite(unreadCount)) return

      queryClient.setQueryData<NotificationUnreadCountSchema>(
        notificationKeys.unreadCount(),
        { unreadCount }
      )
    }

    socket.on('notification:new', handleNewNotification)
    socket.on('notification:unread-count', handleUnreadCount)

    return () => {
      socket.off('notification:new', handleNewNotification)
      socket.off('notification:unread-count', handleUnreadCount)
    }
  }, [queryClient, socket])

  const notifications = notificationsQuery.data ?? []

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' size='icon' className='relative rounded-full'>
            <Bell className='size-[1.15rem]' />
            {unreadCount > 0 ? (
              <span className='bg-destructive text-destructive-foreground absolute -top-0.5 -right-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-none font-semibold'>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            ) : null}
            <span className='sr-only'>Open notifications</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align='end'
          className='w-[min(24rem,calc(100vw-2rem))] p-0'
        >
          <div className='flex items-center justify-between gap-3 px-4 py-3'>
            <DropdownMenuLabel className='p-0'>Notifications</DropdownMenuLabel>
            <Button
              variant='ghost'
              size='sm'
              className='h-8 gap-2 px-2'
              disabled={unreadCount === 0 || markAllReadMutation.isPending}
              onClick={() => markAllReadMutation.mutate()}
            >
              <CheckCheck className='size-4' />
              Mark all read
            </Button>
          </div>
          <DropdownMenuSeparator />
          <ScrollArea className='max-h-[28rem]'>
            {notificationsQuery.isPending ? (
              <div className='text-muted-foreground px-4 py-8 text-center text-sm'>
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className='px-4 py-10 text-center'>
                <p className='text-sm font-medium'>No notifications yet</p>
                <p className='text-muted-foreground mt-1 text-xs'>
                  Security and email updates will appear here.
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className='focus:bg-accent cursor-pointer items-start gap-3 rounded-none px-4 py-3'
                  onSelect={() => {
                    setSelectedNotification(notification)
                    setIsDetailOpen(true)
                    if (!notification.readAt) {
                      markReadMutation.mutate(notification.id)
                    }
                  }}
                >
                  <Circle
                    className={cn(
                      'mt-1 size-2.5 shrink-0 fill-current',
                      notification.readAt
                        ? 'text-muted-foreground/30'
                        : 'text-primary'
                    )}
                  />
                  <div className='min-w-0 flex-1 space-y-1'>
                    <div className='flex items-start justify-between gap-3'>
                      <p className='line-clamp-1 text-sm font-medium'>
                        {notification.title}
                      </p>
                      <div className='flex shrink-0 items-center gap-1'>
                        <span className='text-muted-foreground text-[11px]'>
                          {formatDistanceToNow(
                            new Date(notification.createdAt),
                            {
                              addSuffix: true,
                            }
                          )}
                        </span>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='text-muted-foreground hover:text-destructive h-6 w-6'
                          disabled={deleteMutation.isPending}
                          onClick={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                            deleteMutation.mutate(notification.id)
                          }}
                        >
                          <Trash2 className='size-3.5' />
                          <span className='sr-only'>Delete notification</span>
                        </Button>
                      </div>
                    </div>
                    <p className='text-muted-foreground line-clamp-2 text-xs'>
                      {notification.message}
                    </p>
                  </div>
                </DropdownMenuItem>
              ))
            )}
          </ScrollArea>
        </DropdownMenuContent>
      </DropdownMenu>

      <NotificationDetailDialog
        notification={selectedNotification}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
      />
    </>
  )
}

function NotificationDetailDialog({
  notification,
  open,
  onOpenChange,
}: {
  notification: NotificationSchema | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[min(42rem,calc(100vh-2rem))] overflow-hidden p-0 sm:max-w-2xl'>
        {notification ? (
          <>
            <DialogHeader className='border-b px-6 py-5'>
              <DialogTitle className='pr-8 leading-6'>
                {notification.title}
              </DialogTitle>
              <DialogDescription>
                {format(new Date(notification.createdAt), 'PPpp')}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className='max-h-[calc(min(42rem,100vh-2rem)-6rem)]'>
              <div className='space-y-5 px-6 py-5'>
                <div className='space-y-2'>
                  <p className='text-muted-foreground text-xs font-medium tracking-wide uppercase'>
                    Message
                  </p>
                  <p className='text-sm leading-6 whitespace-pre-wrap'>
                    {notification.message}
                  </p>
                </div>

                <div className='grid gap-3 rounded-md border p-4 text-sm sm:grid-cols-2'>
                  <NotificationMeta label='Type' value={notification.type} />
                  <NotificationMeta
                    label='Status'
                    value={notification.readAt ? 'Read' : 'Unread'}
                  />
                  <NotificationMeta
                    label='Created'
                    value={format(new Date(notification.createdAt), 'PPpp')}
                  />
                  <NotificationMeta
                    label='Read at'
                    value={
                      notification.readAt
                        ? format(new Date(notification.readAt), 'PPpp')
                        : 'Not read yet'
                    }
                  />
                </div>

                {notification.data ? (
                  <div className='space-y-2'>
                    <p className='text-muted-foreground text-xs font-medium tracking-wide uppercase'>
                      Data
                    </p>
                    <pre className='bg-muted max-h-64 overflow-auto rounded-md p-4 text-xs whitespace-pre-wrap'>
                      {JSON.stringify(notification.data, null, 2)}
                    </pre>
                  </div>
                ) : null}
              </div>
            </ScrollArea>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function NotificationMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className='space-y-1'>
      <p className='text-muted-foreground text-xs'>{label}</p>
      <p className='font-medium break-words'>{value}</p>
    </div>
  )
}
