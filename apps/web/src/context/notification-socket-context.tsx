import React, { createContext, useContext, type ReactNode } from 'react'
import type { Socket } from 'socket.io-client'
import { useSocket } from './socket-context'

interface NotificationSocketProviderProps {
  children: ReactNode
}

const NotificationSocketContext = createContext<Socket | null>(null)

export const NotificationSocketProvider: React.FC<
  NotificationSocketProviderProps
> = ({ children }) => {
  const socket = useSocket()

  return (
    <NotificationSocketContext.Provider value={socket}>
      {children}
    </NotificationSocketContext.Provider>
  )
}

export const useNotificationSocket = (): Socket | null => {
  return useContext(NotificationSocketContext)
}
