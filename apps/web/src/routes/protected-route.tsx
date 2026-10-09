import { Navigate } from 'react-router'
import { useAuthStore } from '@/stores/auth-store'
import { usePermissionLoader } from '@/hooks/use-permission-loader'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import Loader from '@/components/loader'
import { ServerOffline } from '@/pages/errors/server-offline'

export default function ProtectedRoutes() {
  const { permissionStatus, isError, refetch, isFetching } =
    usePermissionLoader()
  const { isAuthenticated, logout } = useAuthStore()

  if (!isAuthenticated) return <Navigate to='/sign-in' />

  if (isAuthenticated && permissionStatus === 'loading') {
    if (isError) {
      return (
        <ServerOffline
          onRetry={() => void refetch()}
          isRetrying={isFetching}
          onLogout={logout}
        />
      )
    }

    return <Loader />
  }

  return <AuthenticatedLayout />
}
