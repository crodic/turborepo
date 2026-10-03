import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { apiSendPresenceHeartbeat } from '@/pages/dashboard/presence-queries'

const HEARTBEAT_INTERVAL_MS = 25_000

/**
 * Hook to send periodic presence heartbeats to the server via HTTP REST.
 * Replaces WebSocket connection-based presence pinging.
 *
 * Automatically:
 * - Sends heartbeat every 25s while authenticated and window is active.
 * - Pauses heartbeat when tab/browser is in background.
 * - Sends immediate heartbeat when window becomes visible again.
 */
export function usePresenceHeartbeat() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const accessToken = useAuthStore((state) => state.meta.accessToken)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      return
    }

    const sendHeartbeat = () => {
      if (typeof document !== 'undefined' && document.hidden) {
        return
      }
      apiSendPresenceHeartbeat().catch(() => {
        // Silently ignore heartbeat failure (will retry on next interval)
      })
    }

    // Send immediate heartbeat on mount / authentication
    sendHeartbeat()

    // Setup interval
    timerRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS)

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        sendHeartbeat()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isAuthenticated, accessToken])
}
