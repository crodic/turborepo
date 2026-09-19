import { useCallback } from 'react'
import { Building2, Compass, Flag, Globe } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { CitiesTab } from './tabs/cities-tab'
import { CountriesTab } from './tabs/countries-tab'
import { RegionsTab } from './tabs/regions-tab'
import { StatesTab } from './tabs/states-tab'

export function PageLocationOverview() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'countries'

  const handleTabChange = useCallback(
    (nextTab: string) => {
      // Khi chuyển tab, reset sạch toàn bộ query params (filter, sort, search, page) trên URL, chỉ giữ lại tab mới
      navigate(`?tab=${nextTab}`, { replace: true })
    },
    [navigate]
  )

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
      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>
              {t('locations.overview.title', 'Location Management')}
            </h2>
            <p className='text-muted-foreground'>
              {t(
                'locations.overview.description',
                'Manage global regions, countries, states/provinces, and cities.'
              )}
            </p>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className='w-full space-y-4'
        >
          <TabsList className='grid w-full grid-cols-2 sm:inline-flex sm:w-auto'>
            <TabsTrigger value='countries' className='gap-2'>
              <Flag className='size-4' />
              <span>{t('locations.tabs.countries', 'Countries')}</span>
            </TabsTrigger>
            <TabsTrigger value='states' className='gap-2'>
              <Building2 className='size-4' />
              <span>{t('locations.tabs.states', 'States / Provinces')}</span>
            </TabsTrigger>
            <TabsTrigger value='cities' className='gap-2'>
              <Globe className='size-4' />
              <span>{t('locations.tabs.cities', 'Cities / Districts')}</span>
            </TabsTrigger>
            <TabsTrigger value='regions' className='gap-2'>
              <Compass className='size-4' />
              <span>{t('locations.tabs.regions', 'Regions')}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value='countries' className='mt-2'>
            {activeTab === 'countries' && <CountriesTab />}
          </TabsContent>

          <TabsContent value='states' className='mt-2'>
            {activeTab === 'states' && <StatesTab />}
          </TabsContent>

          <TabsContent value='cities' className='mt-2'>
            {activeTab === 'cities' && <CitiesTab />}
          </TabsContent>

          <TabsContent value='regions' className='mt-2'>
            {activeTab === 'regions' && <RegionsTab />}
          </TabsContent>
        </Tabs>
      </Main>
    </>
  )
}
