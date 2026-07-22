import { format } from 'date-fns'
import { ArrowLeftIcon } from 'lucide-react'
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
import { EmailPreview } from '@/pages/email-logs/show/email-preview'
import { NotFoundError } from '@/pages/errors/not-found-error'
import { useDataMyEmailDetail } from '../queries'

export default function PageMyEmailShow() {
  const params = useParams()
  const navigate = useNavigate()
  const { data, isFetching } = useDataMyEmailDetail(params.id as string)

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
        <div className='space-y-6'>
          <div className='flex items-center justify-between'>
            <div>
              <h1 className='text-2xl font-bold'>Email detail</h1>
              <p className='text-muted-foreground'>{data.subject}</p>
            </div>
            <Button onClick={() => navigate(-1)} variant='outline'>
              <ArrowLeftIcon size={16} />
              Back
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Delivery</CardTitle>
            </CardHeader>
            <CardContent>
              <Descriptions>
                <DescriptionItem
                  label='Status'
                  value={<Badge>{data.status}</Badge>}
                />
                <DescriptionItem label='From' value={data.from} />
                <DescriptionItem label='To' value={data.to.join(', ')} />
                <DescriptionItem
                  label='Cc'
                  value={data.cc?.join(', ') || '-'}
                />
                <DescriptionItem
                  label='Bcc'
                  value={data.bcc?.join(', ') || '-'}
                />
                <DescriptionItem
                  label='Scheduled at'
                  value={
                    data.scheduledAt
                      ? format(data.scheduledAt, 'dd/MM/yyyy HH:mm')
                      : '-'
                  }
                />
                <DescriptionItem
                  label='Sent at'
                  value={
                    data.sentAt ? format(data.sentAt, 'dd/MM/yyyy HH:mm') : '-'
                  }
                />
                <DescriptionItem
                  label='Error'
                  value={data.errorMessage || '-'}
                />
              </Descriptions>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Body preview</CardTitle>
            </CardHeader>
            <CardContent>
              <EmailPreview html={data.renderedBody || data.body || ''} />
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  )
}
