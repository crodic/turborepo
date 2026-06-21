import { useTranslation } from 'react-i18next'
import { ContentSection } from '../components/content-section'
import PasswordForm from './password-form'

export function SettingsPassword() {
  const { t } = useTranslation()
  return (
    <ContentSection
      title={t('settings.password.title')}
      desc={t('settings.password.description')}
    >
      <PasswordForm />
    </ContentSection>
  )
}
