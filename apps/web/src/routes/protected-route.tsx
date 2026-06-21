import { Navigate } from 'react-router'
import { useAuthStore } from '@/stores/auth-store'
import { usePermissionLoader } from '@/hooks/use-permission-loader'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import Loader from '@/components/loader'

export default function ProtectedRoutes() {
  const { permissionStatus } = usePermissionLoader()
  const { isAuthenticated } = useAuthStore()

  if (isAuthenticated && permissionStatus === 'loading') return <Loader />

  if (!isAuthenticated) return <Navigate to='/sign-in' />

  return <AuthenticatedLayout />
}
