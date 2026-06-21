import { LockIcon, Palette, ShieldCheck, UserCog, Wrench } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Outlet } from 'react-router'
import { Separator } from '@/components/ui/separator'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { SidebarNav } from './components/sidebar-nav'

const sidebarNavItems = [
  {
    title: 'navigation.other.profiles',
    href: '/settings',
    icon: <UserCog size={18} />,
  },
  {
    title: 'navigation.other.account',
    href: '/settings/account',
    icon: <Wrench size={18} />,
  },
  {
    title: 'navigation.other.password',
    href: '/settings/password',
    icon: <LockIcon size={18} />,
  },
  {
    title: 'navigation.other.security',
    href: '/settings/security',
    icon: <ShieldCheck size={18} />,
  },
  {
    title: 'navigation.other.appearance',
    href: '/settings/appearance',
    icon: <Palette size={18} />,
  },
]

export function Settings() {
  const { t } = useTranslation()
  return (
    <>
      {/* ===== Top Heading ===== */}
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
            {t('settings.title')}
          </h1>
          <p className='text-muted-foreground'>{t('settings.description')}</p>
        </div>
        <Separator className='my-4 lg:my-6' />
        <div className='flex flex-1 flex-col space-y-2 overflow-hidden md:space-y-2 lg:flex-row lg:space-y-0 lg:space-x-12'>
          <aside className='top-0 lg:sticky lg:w-1/5'>
            <SidebarNav items={sidebarNavItems} />
          </aside>
          <div className='flex w-full overflow-y-hidden p-1'>
            <Outlet />
          </div>
        </div>
      </Main>
    </>
  )
}
