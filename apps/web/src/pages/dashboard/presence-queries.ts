import { useQuery } from '@tanstack/react-query'
import http from '@/lib/http'

export type OnlinePresence = {
  id: number | string
  type: 'admin' | 'user'
  sessionId?: number | string
  email: string
  fullName?: string
  avatar?: string
  lastSeenAt: string
}

export type PresenceCounts = {
  admins: number
  users: number
  total: number
}

export type PresenceSnapshot = {
  admins: OnlinePresence[]
  users: OnlinePresence[]
  counts: PresenceCounts
}

export const emptySnapshot: PresenceSnapshot = {
  admins: [],
  users: [],
  counts: {
    admins: 0,
    users: 0,
    total: 0,
  },
}

export const presenceKeys = {
  all: ['presence'] as const,
  snapshot: () => [...presenceKeys.all, 'snapshot'] as const,
  counts: () => [...presenceKeys.all, 'counts'] as const,
}

export async function apiGetPresenceSnapshot(): Promise<PresenceSnapshot> {
  const response = await http.get<PresenceSnapshot>('/presence/snapshot')
  return response.data
}

export async function apiGetPresenceCounts(): Promise<PresenceCounts> {
  const response = await http.get<PresenceCounts>('/presence/counts')
  return response.data
}

export async function apiSendPresenceHeartbeat(): Promise<void> {
  await http.post('/presence/heartbeat')
}

export function usePresenceSnapshot(refetchInterval: number = 30_000) {
  return useQuery({
    queryKey: presenceKeys.snapshot(),
    queryFn: apiGetPresenceSnapshot,
    refetchInterval,
  })
}

export function usePresenceCounts(refetchInterval: number = 30_000) {
  return useQuery({
    queryKey: presenceKeys.counts(),
    queryFn: apiGetPresenceCounts,
    refetchInterval,
  })
}
