import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import { useAuthStore } from '@/stores/auth-store'
import type { Actions, Subjects } from '@/lib/permissions'

interface RouteAuthorizeProps {
  children: ReactNode
  action?: Actions
  subject?: Subjects
  fallback?: ReactNode
  redirectTo?: string
  requireAuth?: boolean
  isAnyPermission?: boolean
}

export const RouteAuthorize: React.FC<RouteAuthorizeProps> = ({
  children,
  action,
  subject,
  fallback,
  redirectTo = '/errors/forbidden',
  isAnyPermission = false,
}) => {
  const { ability, permissions } = useAuthStore()

  let isAllowed = false

  if (isAnyPermission) {
    isAllowed = permissions.length > 0
  } else if (action && subject) {
    isAllowed = ability.can(action, subject)
  } else {
    isAllowed = true
  }

  if (!isAllowed) {
    if (fallback) return <>{fallback}</>
    return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}
