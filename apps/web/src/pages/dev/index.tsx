import { FlaskConical, Layers, TableProperties } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { FormExamplesDemo } from './examples'
import { ExpandingDataTableDemo } from './ui-preview'

export function PageDevPlayground() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'forms'

  const handleTabChange = (tab: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('tab', tab)
        return next
      },
      { replace: true }
    )
  }

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

      <Main className='space-y-6'>
        <div className='flex flex-col gap-1 border-b pb-5'>
          <div className='flex items-center gap-2.5'>
            <div className='bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg'>
              <FlaskConical className='size-5' />
            </div>
            <div className='flex items-center gap-2'>
              <h1 className='text-2xl font-bold tracking-tight'>
                {t('dev.playground.title')}
              </h1>
              <Badge
                variant='outline'
                className='border-amber-500/40 bg-amber-500/10 font-mono text-xs font-semibold text-amber-600 dark:text-amber-400'
              >
                {t('dev.playground.badge')}
              </Badge>
            </div>
          </div>
          <p className='text-muted-foreground pl-11.5 text-sm'>
            {t('dev.playground.description')}
          </p>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className='w-full space-y-6'
        >
          <TabsList className='bg-muted/70 h-10 p-1'>
            <TabsTrigger value='forms' className='gap-2 px-4'>
              <Layers className='size-4' />
              <span>{t('dev.playground.tabForms')}</span>
            </TabsTrigger>
            <TabsTrigger value='table' className='gap-2 px-4'>
              <TableProperties className='size-4' />
              <span>{t('dev.playground.tabTable')}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value='forms'
            className='space-y-6 focus-visible:outline-none'
          >
            <FormExamplesDemo />
          </TabsContent>

          <TabsContent
            value='table'
            className='space-y-6 focus-visible:outline-none'
          >
            <div className='space-y-6'>
              <div className='flex flex-col gap-1'>
                <h2 className='text-lg font-semibold tracking-tight'>
                  {t('dev.playground.uiPreviewTitle')}
                </h2>
                <p className='text-muted-foreground text-sm'>
                  {t('dev.playground.uiPreviewDesc')}
                </p>
              </div>
              <ExpandingDataTableDemo />
            </div>
          </TabsContent>
        </Tabs>
      </Main>
    </>
  )
}
