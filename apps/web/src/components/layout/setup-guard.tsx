import { useLocation, Navigate, Outlet } from 'react-router'
import Loader from '@/components/loader'
import { useGetSetupStatusQuery } from '@/pages/setup/queries'

export function SetupGuard() {
  const location = useLocation()
  const { data, isLoading, error } = useGetSetupStatusQuery()

  if (isLoading) {
    return <Loader />
  }

  // If there's an error fetching status, we probably shouldn't block the whole app,
  // or maybe we should show an error page. Let's just proceed for now or show error.
  if (error) {
    return (
      <div className='flex h-screen w-screen items-center justify-center'>
        <p className='text-destructive'>
          Failed to connect to server. Please try again later.
        </p>
      </div>
    )
  }

  const initialized = data?.initialized ?? true
  const isSetupRoute = location.pathname === '/setup'

  if (!initialized && !isSetupRoute) {
    // If not initialized and trying to access any other route, redirect to /setup
    return <Navigate to='/setup' replace />
  }

  if (initialized && isSetupRoute) {
    // If already initialized and trying to access /setup, redirect to /sign-in
    return <Navigate to='/sign-in' replace />
  }

  // Allow through
  return <Outlet />
}
