import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { Socket } from 'socket.io-client'
import { useAuthStore } from '@/stores/auth-store'
import { getWsClient } from '@/lib/ws-client'

interface SocketProviderProps {
  children: ReactNode
}

const SocketContext = createContext<Socket | null>(null)

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const accessToken = useAuthStore((state) => state.meta.accessToken)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const [socket, setSocket] = useState<Socket | null>(
    () => getWsClient().rawSocket
  )

  useEffect(() => {
    const wsClient = getWsClient()

    if (!isAuthenticated || !accessToken) {
      wsClient.disconnect()
      setSocket(null)
      return
    }

    const unsubscribe = wsClient.onStatusChange((_status, currentSocket) => {
      setSocket(currentSocket)
    })

    void wsClient.connect()

    return () => {
      unsubscribe()
    }
  }, [accessToken, isAuthenticated])

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  )
}

export const useSocket = (): Socket | null => {
  return useContext(SocketContext)
}
