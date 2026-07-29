import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { io, type Socket } from 'socket.io-client'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'

interface NotificationSocketProviderProps {
  children: ReactNode
}

const NotificationSocketContext = createContext<Socket | null>(null)

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL as string

export const NotificationSocketProvider: React.FC<
  NotificationSocketProviderProps
> = ({ children }) => {
  const accessToken = useAuthStore((state) => state.meta.accessToken)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const socketRef = useRef<Socket | null>(null)
  const [socket, setSocket] = useState<Socket | null>(null)

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      socketRef.current?.disconnect()
      socketRef.current = null
      queueMicrotask(() => setSocket(null))
      return
    }

    const newSocket = io(`${SOCKET_URL}/notifications`, {
      auth: {
        token: accessToken,
      },
      transports: ['websocket', 'polling'],
    })

    socketRef.current = newSocket
    queueMicrotask(() => setSocket(newSocket))

    if ('Notification' in window && Notification.permission === 'default') {
      const hasAsked = localStorage.getItem('asked_browser_notification')
      if (!hasAsked) {
        toast('Enable Browser Notifications?', {
          description: 'Receive system alerts directly on your desktop.',
          duration: 10000,
          action: {
            label: 'Enable',
            onClick: async () => {
              localStorage.setItem('asked_browser_notification', 'true')
              const res = await Notification.requestPermission()
              if (res === 'granted') {
                toast.success('Browser notifications enabled')
              }
            },
          },
          cancel: {
            label: 'Not now',
            onClick: () => {
              localStorage.setItem('asked_browser_notification', 'true')
            },
          },
          onDismiss: () => {
            localStorage.setItem('asked_browser_notification', 'true')
          },
        })
      }
    }

    return () => {
      newSocket.disconnect()
    }
  }, [accessToken, isAuthenticated])

  return (
    <NotificationSocketContext.Provider value={socket}>
      {children}
    </NotificationSocketContext.Provider>
  )
}

export const useNotificationSocket = (): Socket | null => {
  return useContext(NotificationSocketContext)
}
