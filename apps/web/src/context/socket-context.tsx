import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { io, type Socket } from 'socket.io-client'
import { useAuthStore } from '@/stores/auth-store'

interface SocketProviderProps {
  children: ReactNode
}

const SocketContext = createContext<Socket | null>(null)

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL as string

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
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

    const newSocket = io(`${SOCKET_URL}/presence`, {
      auth: {
        token: accessToken,
        userType: 'admin',
      },
      transports: ['websocket', 'polling'],
    })

    socketRef.current = newSocket
    queueMicrotask(() => setSocket(newSocket))

    return () => {
      newSocket.disconnect()
    }
  }, [accessToken, isAuthenticated])

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  )
}

export const useSocket = (): Socket | null => {
  return useContext(SocketContext)
}
