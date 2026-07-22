import { format } from 'date-fns'
import { ArrowLeftIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DescriptionItem, Descriptions } from '@/components/common/descriptions'
import { ConfigDrawer } from '@/components/config-drawer'
import DataLoader from '@/components/layout/data-loader'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { NotFoundError } from '@/pages/errors/not-found-error'
import { useDataGetLogDetail } from '../queries'
import LogTable from './log-table'

export default function PageActivityLogShow() {
  const { t } = useTranslation()
  const params = useParams()
  const navigate = useNavigate()

  const { data, isFetching } = useDataGetLogDetail(params.id as string)

  if (isFetching) return <DataLoader />

  if (!data) return <NotFoundError />

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
        <div className='space-y-8'>
          <div className='flex items-center justify-between'>
            <h1 className='text-2xl font-bold'>
              {t('activityLogs.show.title')}
            </h1>
            <div className='flex items-center gap-2'>
              <Button onClick={() => navigate(-1)} variant='outline'>
                <ArrowLeftIcon size={16} />
                <span>{t('buttons.back')}</span>
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('activityLogs.show.cardTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Descriptions>
                <DescriptionItem
                  label={t('activityLogs.show.id')}
                  value={data.id}
                />
                <DescriptionItem
                  label={t('activityLogs.show.actor')}
                  value={
                    data.metadata?.actorName || data.metadata?.actorEmail
                      ? `${data.metadata.actorName || ''} ${data.metadata.actorEmail ? `(${data.metadata.actorEmail})` : ''} [#${data.userId}]`
                      : data.userId || '-'
                  }
                />
                <DescriptionItem
                  label={t('activityLogs.show.action')}
                  value={data.action || ''}
                />
                <DescriptionItem
                  label={t('activityLogs.show.entity')}
                  value={
                    data.metadata?.entityName
                      ? `[${data.entity} #${data.entityId}] ${data.metadata.entityName}`
                      : `[${data.entity} #${data.entityId}]`
                  }
                />
                <DescriptionItem
                  label={t('activityLogs.show.timestamp')}
                  value={format(data.timestamp, 'yyyy-MM-dd HH:mm aa')}
                />

                <div className='col-span-1 sm:col-span-2 md:col-span-3'>
                  <LogTable
                    oldValue={data.oldValue ?? undefined}
                    newValue={data.newValue ?? undefined}
                  />
                </div>
              </Descriptions>
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  )
}
