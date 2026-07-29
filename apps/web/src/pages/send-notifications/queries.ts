import { useQuery } from '@tanstack/react-query'
import http from '@/lib/http'
import type { SendNotificationSchema } from './schema'

export async function sendNotification(data: SendNotificationSchema) {
  return await http.post('/notifications/send', data)
}

export async function getOnlineAdmins(): Promise<number[]> {
  const response = await http.get('/notifications/online-admins')
  return response.data
}

export const useOnlineAdmins = () =>
  useQuery({
    queryKey: ['online-admins'],
    queryFn: getOnlineAdmins,
    refetchInterval: 10000, // Poll every 10 seconds
  })
