import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { apiGetMe } from '@/pages/auth/queries'
import { NotFoundError } from '@/pages/errors/not-found-error'
import { ContentSection } from '../components/content-section'
import { AccountForm } from './account-form'

export function SettingsAccount() {
  const { t } = useTranslation()
  const { data: currentUser, isFetching } = useQuery({
    queryKey: ['authenticated_user'],
    queryFn: apiGetMe,
  })

  if (isFetching)
    return (
      <ContentSection
        title={t('settings.account.title')}
        desc={t('settings.account.description')}
      >
        <div className='flex min-h-40 items-center justify-center'>
          <Loader2 className='animate-spin' />
        </div>
      </ContentSection>
    )

  if (!currentUser) return <NotFoundError />

  return (
    <ContentSection
      title={t('settings.account.title')}
      desc={t('settings.account.description')}
    >
      <div className='space-y-8'>
        <AccountForm user={currentUser} />
        {/* <DeleteAccount /> */}
      </div>
    </ContentSection>
  )
}
