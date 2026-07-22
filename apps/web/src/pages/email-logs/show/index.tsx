import { format } from 'date-fns'
import { ArrowLeftIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router'
import { Badge } from '@/components/ui/badge'
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
import { useDataEmailLogDetail } from '@/pages/emails/queries'
import { NotFoundError } from '@/pages/errors/not-found-error'
import { EmailPreview } from './email-preview'

export default function PageEmailLogShow() {
  const { t } = useTranslation()
  const params = useParams()
  const navigate = useNavigate()
  const { data, isFetching } = useDataEmailLogDetail(params.id as string)

  if (isFetching) return <DataLoader />
  if (!data) return <NotFoundError />

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DELIVERED':
      case 'SENT':
        return (
          <Badge className='bg-green-500 text-white hover:bg-green-600'>
            {status}
          </Badge>
        )
      case 'FAILED':
      case 'BOUNCED':
        return (
          <Badge className='bg-destructive hover:bg-destructive/90 text-white'>
            {status}
          </Badge>
        )
      case 'QUEUED':
      case 'PENDING':
        return (
          <Badge className='bg-yellow-500 text-white hover:bg-yellow-600'>
            {status}
          </Badge>
        )
      default:
        return <Badge variant='secondary'>{status}</Badge>
    }
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

      <Main>
        <div className='space-y-6'>
          <div className='flex items-center justify-between'>
            <div>
              <h1 className='text-2xl font-bold'>
                {t('emailLogs.show.title')}
              </h1>
              <p className='text-muted-foreground'>{data.subject}</p>
            </div>
            <Button onClick={() => navigate(-1)} variant='outline'>
              <ArrowLeftIcon size={16} />
              {t('buttons.back')}
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('emailLogs.show.delivery')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Descriptions>
                <DescriptionItem
                  label={t('emailLogs.show.status')}
                  value={getStatusBadge(data.status)}
                />
                <DescriptionItem
                  label={t('emailLogs.show.source')}
                  value={data.source}
                />
                <DescriptionItem
                  label={t('emailLogs.show.from')}
                  value={data.from}
                />
                <DescriptionItem
                  label={t('emailLogs.show.to')}
                  value={data.to.join(', ')}
                />
                <DescriptionItem
                  label={t('emailLogs.show.cc')}
                  value={data.cc?.join(', ') || '-'}
                />
                <DescriptionItem
                  label={t('emailLogs.show.bcc')}
                  value={data.bcc?.join(', ') || '-'}
                />
                <DescriptionItem
                  label={t('emailLogs.show.scheduledAt')}
                  value={
                    data.scheduledAt
                      ? format(data.scheduledAt, 'dd/MM/yyyy HH:mm')
                      : '-'
                  }
                />
                <DescriptionItem
                  label={t('emailLogs.show.sentAt')}
                  value={
                    data.sentAt ? format(data.sentAt, 'dd/MM/yyyy HH:mm') : '-'
                  }
                />
                <DescriptionItem
                  label={t('emailLogs.show.job')}
                  value={data.queueJobId || '-'}
                />
                <DescriptionItem
                  label={t('emailLogs.show.error')}
                  value={data.errorMessage || '-'}
                />
              </Descriptions>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('emailLogs.show.bodyPreview')}</CardTitle>
            </CardHeader>
            <CardContent>
              <EmailPreview html={data.body || ''} />
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  )
}
