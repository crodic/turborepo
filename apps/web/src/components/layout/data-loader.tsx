import { Loader2 } from 'lucide-react'
import { ConfigDrawer } from '../config-drawer'
import { ProfileDropdown } from '../profile-dropdown'
import { Search } from '../search'
import { ThemeSwitch } from '../theme-switch'
import { Header } from './header'
import { Main } from './main'

export default function DataLoader() {
  return (
    <>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <Loader2 className='animate-spin' />
      </Main>
    </>
  )
}
