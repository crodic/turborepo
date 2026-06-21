import { useTranslation } from 'react-i18next'
import { Separator } from '@/components/ui/separator'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import WebsiteForm from './website-form'

export function SettingsWebsite() {
  const { t } = useTranslation()

  return (
    <>
      <Header fixed>
        <div className='ms-auto flex items-center space-x-4'>
          <Search />
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='space-y-0.5'>
          <h1 className='text-2xl font-bold tracking-tight md:text-xl'>
            {t('settings.website.title')}
          </h1>
          <p className='text-muted-foreground'>
            {t('settings.website.description')}
          </p>
        </div>
        <Separator className='my-4 lg:my-6' />
        <WebsiteForm />
      </Main>
    </>
  )
}
