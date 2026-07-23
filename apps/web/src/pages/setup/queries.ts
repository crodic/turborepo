import axios from 'axios'
import { useMutation, useQuery } from '@tanstack/react-query'
import type { SystemSetupSchema } from './schema'

export interface InitialStatusResDto {
  initialized: boolean
  message: string
}

export const apiGetSetupStatus = async (): Promise<InitialStatusResDto> => {
  const { data } = await axios.get('/api/v1/setup/status')
  return data
}

export const apiSystemSetup = async (payload: SystemSetupSchema) => {
  const { data } = await axios.post('/api/v1/setup', payload)
  return data
}

export const useGetSetupStatusQuery = () => {
  return useQuery({
    queryKey: ['setup_status'],
    queryFn: apiGetSetupStatus,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  })
}

export const useSystemSetupMutation = () => {
  return useMutation({
    mutationFn: apiSystemSetup,
  })
}
