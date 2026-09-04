import { useState } from 'react'
import { AxiosError } from 'axios'
import { format } from 'date-fns'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeftIcon, EditIcon, KeyRoundIcon, TrashIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DeleteAlertDialog } from '@/components/common/delete-alert-dialog'
import { DescriptionItem, Descriptions } from '@/components/common/descriptions'
import { ConfigDrawer } from '@/components/config-drawer'
import DataLoader from '@/components/layout/data-loader'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { NotFoundError } from '@/pages/errors/not-found-error'
import { apiDeleteUser, useDataGetUserDetail } from '../queries'

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox='0 0 24 24' width='14' height='14'>
      <path
        fill='#4285F4'
        d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
      />
      <path
        fill='#34A853'
        d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
      />
      <path
        fill='#FBBC05'
        d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z'
      />
      <path
        fill='#EA4335'
        d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z'
      />
    </svg>
  )
}

export function PageUserShow() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const params = useParams()
  const id = params.id as string
  const { data, isFetching } = useDataGetUserDetail(id)
  const [isShowDeleteDialog, setIsShowDeleteDialog] = useState(false)
  const deleteUserMutation = useMutation({
    mutationFn: apiDeleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['users'],
      })
      toast.success('User deleted successfully')
      setIsShowDeleteDialog(false)
      navigate('/users')
    },
    onError: (error) => {
      if (error instanceof AxiosError) {
        toast.error(error.response?.data.message)
      }
    },
  })

  const handleDelete = () => {
    if (params.id) {
      deleteUserMutation.mutate(id)
    }
  }

  if (isFetching) return <DataLoader />

  if (!data) {
    return <NotFoundError />
  }

  const accountProviders = Array.from(
    new Set([
      ...(data.hasPassword ? ['local'] : []),
      ...(data.accounts?.map((acc) => acc.provider) ?? []),
    ])
  )

  return (
    <>
      {isShowDeleteDialog && (
        <DeleteAlertDialog
          open={isShowDeleteDialog}
          onOpenChange={(open) => setIsShowDeleteDialog(open)}
          handleDelete={handleDelete}
          isLoading={deleteUserMutation.isPending}
        />
      )}
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
              {t('users.show.title')}
            </h2>
            <p className='text-muted-foreground'>
              {t('users.show.description')}
            </p>
          </div>
          <div className='flex w-full flex-wrap justify-end gap-2 sm:block sm:w-auto sm:justify-normal sm:space-x-2'>
            <Button
              variant='outline'
              type='button'
              onClick={() => {
                void navigate(-1)
              }}
            >
              <ArrowLeftIcon className='h-4 w-4' />
              {t('buttons.cancel')}
            </Button>
            <Button onClick={() => navigate(`/users/${data?.id}/edit`)}>
              <EditIcon className='h-4 w-4' />
              {t('buttons.edit')}
            </Button>
            <Button
              variant='destructive'
              onClick={() => setIsShowDeleteDialog(true)}
            >
              <TrashIcon className='h-4 w-4' />
              {t('buttons.delete')}
            </Button>
          </div>
        </div>

        <div className='grid gap-8 md:grid-cols-[250px_1fr]'>
          <Card className='h-max'>
            <CardContent>
              <div className='flex flex-col items-center gap-4'>
                <Avatar className='inline-block h-24 w-24'>
                  <AvatarFallback>CN</AvatarFallback>
                  <AvatarImage
                    src={data?.avatar ?? undefined}
                    alt={data?.fullName}
                  />
                </Avatar>
                <h3 className='text-lg font-bold'>{data?.fullName}</h3>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('users.show.cardTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Descriptions>
                <DescriptionItem
                  label={t('users.show.email')}
                  value={data?.email}
                />
                <DescriptionItem
                  label={t('users.show.fullName')}
                  value={data?.fullName}
                />
                <DescriptionItem
                  label={t('users.show.emailVerified')}
                  value={data?.verifiedAt ? 'Active' : 'Inactive'}
                />
                <DescriptionItem label={t('users.show.accounts')}>
                  {accountProviders.length > 0 ? (
                    <div className='mt-2 flex flex-wrap gap-1.5'>
                      {accountProviders.map((provider) => {
                        if (provider === 'local') {
                          return (
                            <Badge
                              key={provider}
                              variant='outline'
                              className='flex items-center gap-1.5 px-2.5 py-1 font-normal'
                            >
                              <KeyRoundIcon className='text-muted-foreground h-3.5 w-3.5' />
                              <span>{t('users.show.provider.local')}</span>
                            </Badge>
                          )
                        }
                        if (provider === 'google') {
                          return (
                            <Badge
                              key={provider}
                              variant='outline'
                              className='flex items-center gap-1.5 px-2.5 py-1 font-normal'
                            >
                              <GoogleIcon className='h-3.5 w-3.5' />
                              <span>{t('users.show.provider.google')}</span>
                            </Badge>
                          )
                        }
                        return (
                          <Badge
                            key={provider}
                            variant='outline'
                            className='flex items-center gap-1.5 px-2.5 py-1 font-normal capitalize'
                          >
                            <span>{provider}</span>
                          </Badge>
                        )
                      })}
                    </div>
                  ) : null}
                </DescriptionItem>
                <DescriptionItem
                  label={t('users.show.createdAt')}
                  value={format(data.createdAt, 'dd/MM/yyyy HH:mm aa')}
                />
                <DescriptionItem
                  label={t('users.show.updatedAt')}
                  value={format(data.updatedAt, 'dd/MM/yyyy HH:mm aa')}
                />
              </Descriptions>
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  )
}
