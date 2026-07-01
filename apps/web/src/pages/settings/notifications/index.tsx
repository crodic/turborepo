import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { apiGetMe } from '@/pages/auth/queries'
import { NotFoundError } from '@/pages/errors/not-found-error'
import { ContentSection } from '../components/content-section'
import { NotificationsForm } from './notifications-form'

export function SettingsNotifications() {
  const { t } = useTranslation()
  const { data: currentUser, isFetching } = useQuery({
    queryKey: ['authenticated_user'],
    queryFn: apiGetMe,
  })

  if (isFetching)
    return (
      <ContentSection
        title={t('settings.notifications.title', 'Notifications')}
        desc={t(
          'settings.notifications.description',
          'Configure how you receive notifications.'
        )}
      >
        <div className='flex min-h-40 items-center justify-center'>
          <Loader2 className='animate-spin' />
        </div>
      </ContentSection>
    )

  if (!currentUser) return <NotFoundError />

  return (
    <ContentSection
      title='Notifications'
      desc='Configure how you receive notifications.'
    >
      <NotificationsForm user={currentUser} />
    </ContentSection>
  )
}
