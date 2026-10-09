import { useEffect } from 'react'
import axios from 'axios'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'
import { getAdminPermissions } from '@/lib/admin-roles'
import { apiGetMe } from '@/pages/auth/queries'

export function usePermissionLoader() {
  const { permissionStatus, setAbilityFromPermissions } = useAuthStore()

  const authUserQuery = useQuery({
    enabled: permissionStatus == 'loading',
    queryKey: ['authenticated_user'],
    queryFn: apiGetMe,
    retry: (count, error) => {
      if (
        !axios.isAxiosError(error) ||
        count >= 2 ||
        error.response?.status === 401
      ) {
        return false
      }

      return true
    },
    throwOnError: false,
  })

  useEffect(() => {
    if (!authUserQuery.isFetched) {
      return
    }

    if (authUserQuery.data) {
      const permissions = getAdminPermissions(authUserQuery.data)
      setAbilityFromPermissions(permissions)
    }
  }, [authUserQuery.data, authUserQuery.isFetched, setAbilityFromPermissions])

  return {
    permissionStatus,
    isError: authUserQuery.isError,
    error: authUserQuery.error,
    refetch: authUserQuery.refetch,
    isFetching: authUserQuery.isFetching,
  }
}
