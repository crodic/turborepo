import { format } from 'date-fns'
import {
  ArrowLeftIcon,
  Edit2Icon,
  KeyRoundIcon,
  LayersIcon,
  ShieldCheckIcon,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ConfigDrawer } from '@/components/config-drawer'
import DataLoader from '@/components/layout/data-loader'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { NotFoundError } from '@/pages/errors/not-found-error'
import { useDataPermissionById } from '../queries'
import { FORBIDDEN_ROLE_PERMISSION_KEYS } from '../schema'

export default function PagePermissionShow() {
  const params = useParams()
  const navigate = useNavigate()
  const { data, isFetching } = useDataPermissionById(params.id as string)

  if (isFetching) return <DataLoader />

  if (!data) return <NotFoundError />

  const isReserved = FORBIDDEN_ROLE_PERMISSION_KEYS.includes(data.key)

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
          <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
            <div className='space-y-2'>
              <div className='flex flex-wrap items-center gap-2'>
                <h1 className='text-2xl font-bold tracking-tight'>
                  {data.name}
                </h1>
                <Badge variant='secondary'>{data.group}</Badge>
                {isReserved && <Badge>Reserved</Badge>}
              </div>
              <p className='text-muted-foreground font-mono text-sm'>
                {data.key}
              </p>
            </div>

            <div className='flex flex-wrap items-center gap-2'>
              <Button onClick={() => navigate(-1)} variant='outline'>
                <ArrowLeftIcon size={16} />
                Back
              </Button>
              <Button onClick={() => navigate(`/permissions/${data.id}/edit`)}>
                <Edit2Icon size={16} />
                Edit metadata
              </Button>
            </div>
          </div>

          <div className='grid gap-4 md:grid-cols-3'>
            <Card>
              <CardContent className='flex items-center gap-3 p-4'>
                <div className='bg-primary/10 text-primary flex size-10 items-center justify-center rounded-md'>
                  <ShieldCheckIcon className='size-5' />
                </div>
                <div>
                  <p className='text-muted-foreground text-sm'>Name</p>
                  <p className='font-medium'>{data.name}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className='flex items-center gap-3 p-4'>
                <div className='bg-muted flex size-10 items-center justify-center rounded-md'>
                  <LayersIcon className='size-5' />
                </div>
                <div>
                  <p className='text-muted-foreground text-sm'>Group</p>
                  <p className='font-medium'>{data.group}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className='flex items-center gap-3 p-4'>
                <div className='bg-muted flex size-10 items-center justify-center rounded-md'>
                  <KeyRoundIcon className='size-5' />
                </div>
                <div>
                  <p className='text-muted-foreground text-sm'>Updated</p>
                  <p className='text-sm font-medium'>
                    {format(data.updatedAt, 'yyyy-MM-dd HH:mm')}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
              <CardDescription>
                This text helps admins understand what the permission allows.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className='text-muted-foreground text-sm leading-relaxed'>
                {data.description || 'No description provided.'}
              </p>
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  )
}
