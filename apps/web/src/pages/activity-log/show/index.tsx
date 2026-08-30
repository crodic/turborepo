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
import { getActionBadge } from '../columns'
import { useDataGetLogDetail } from '../queries'
import LogTable from './log-table'

export default function PageActivityLogShow() {
  const { t } = useTranslation()
  const params = useParams()
  const navigate = useNavigate()

  const { data, isFetching } = useDataGetLogDetail(params.id as string)

  if (isFetching) return <DataLoader />

  if (!data) return <NotFoundError />

  const entityLabel =
    data.metadata?.entityLabel ??
    data.entity?.replace(/Entity$/, '') ??
    'Resource'

  const entityDisplay = data.metadata?.entityName
    ? `[${entityLabel} #${data.entityId}] "${data.metadata.entityName}"`
    : `[${entityLabel} #${data.entityId}]`

  const actorRoles =
    Array.isArray(data.metadata?.roles) && data.metadata.roles.length > 0
      ? `(${data.metadata.roles.join(', ')})`
      : ''

  const actorDisplay =
    data.metadata?.actorName || data.metadata?.actorEmail
      ? `${data.metadata.actorName || ''} ${data.metadata.actorEmail ? `<${data.metadata.actorEmail}>` : ''} [#${data.userId ?? data.metadata?.actorId}] ${actorRoles}`.trim()
      : data.userId
        ? `User #${data.userId}`
        : 'System / Guest'

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
                  value={`#${data.id}`}
                />
                <DescriptionItem
                  label={t('activityLogs.show.action')}
                  value={getActionBadge(data.action)}
                />
                <DescriptionItem
                  label={t('activityLogs.show.description')}
                  value={
                    <span className='text-foreground font-semibold'>
                      {data.description || '-'}
                    </span>
                  }
                />
                <DescriptionItem
                  label={t('activityLogs.show.entity')}
                  value={entityDisplay}
                />
                <DescriptionItem
                  label={t('activityLogs.show.actor')}
                  value={actorDisplay}
                />
                <DescriptionItem
                  label={t('activityLogs.show.timestamp')}
                  value={format(
                    new Date(data.timestamp),
                    'yyyy-MM-dd HH:mm:ss aa'
                  )}
                />
                <DescriptionItem
                  label={t('activityLogs.show.ip')}
                  value={data.ip || '-'}
                />
                <DescriptionItem
                  label={t('activityLogs.show.requestId')}
                  value={
                    data.requestId ? (
                      <span className='font-mono text-xs'>
                        {data.requestId}
                      </span>
                    ) : (
                      '-'
                    )
                  }
                />
                <DescriptionItem
                  label={t('activityLogs.show.userAgent')}
                  value={
                    <span className='font-mono text-xs break-all'>
                      {data.userAgent || '-'}
                    </span>
                  }
                />

                <div className='col-span-1 pt-4 sm:col-span-2 md:col-span-3'>
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
