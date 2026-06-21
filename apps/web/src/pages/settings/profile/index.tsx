import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import DataLoader from '@/components/layout/data-loader'
import { apiGetMe } from '@/pages/auth/queries'
import { NotFoundError } from '@/pages/errors/not-found-error'
import { ContentSection } from '../components/content-section'
import { ProfileForm } from './profile-form'

export function SettingsProfile() {
  const { t } = useTranslation()
  const { data: currentUser, isFetching } = useQuery({
    queryKey: ['authenticated_user'],
    queryFn: apiGetMe,
  })

  if (isFetching) return <DataLoader />

  if (!currentUser) return <NotFoundError />

  return (
    <ContentSection
      title={t('settings.profile.title')}
      desc={t('settings.profile.description')}
    >
      <ProfileForm user={currentUser} />
    </ContentSection>
  )
}
