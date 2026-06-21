/* eslint-disable no-console */
import { type ReactNode } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { type Subjects, type Actions } from '@/lib/permissions'

interface Props {
  action: Actions
  subject: Subjects
  children: ReactNode
  fallback?: ReactNode
}

export function Authorize({
  action,
  subject,
  children,
  fallback = null,
}: Props) {
  const { ability } = useAuthStore()

  const isAuthorized = ability.can(action, subject)

  /**
   * Development debugging
   */
  if (
    !isAuthorized &&
    process.env.NODE_ENV == 'development' &&
    children != null
  ) {
    let child = children as ReactNode & { _source: string }
    if (Array.isArray(children) && children.length > 0) {
      child = children[0] as ReactNode & { _source: string }
    }
    console.info('Missing permission', `${action}:${subject}`, child._source)
  }

  if (!isAuthorized) {
    return fallback
  }

  return children
}
