import { useState } from 'react'
import { AxiosError } from 'axios'
import { format } from 'date-fns'
import { Avatar } from '@radix-ui/react-avatar'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeftIcon, EditIcon, TrashIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
import { deleteAdmin, useDataGetAdminDetail } from '../queries'

export function PageAdminShow() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const params = useParams()
  const id = params.id as string
  const [isShowDeleteDialog, setIsShowDeleteDialog] = useState(false)
  const { id: userId } = useAuthStore()

  const { data, isFetching } = useDataGetAdminDetail(id)

  const deleteUserMutation = useMutation({
    mutationFn: deleteAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['admins'],
      })
      toast.success('Admin deleted successfully')
      setIsShowDeleteDialog(false)
      navigate('/admins')
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
              {t('adminUsers.show.title')}
            </h2>
            <p className='text-muted-foreground'>
              {t('adminUsers.show.description')}
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
            <Button
              onClick={() => navigate(`/admins/${data?.id}/edit`)}
              disabled={id === userId}
            >
              <EditIcon className='h-4 w-4' />
              {t('buttons.edit')}
            </Button>
            <Button
              variant='destructive'
              onClick={() => setIsShowDeleteDialog(true)}
              disabled={id === userId}
            >
              <TrashIcon className='h-4 w-4' />
              {t('buttons.delete')}
            </Button>
          </div>
        </div>

        <div className='grid grid-cols-1 gap-8 md:grid-cols-[250px_1fr]'>
          <Card className='h-max'>
            <CardContent>
              <div className='flex flex-col items-center gap-4'>
                <Avatar className='inline-block h-24 w-24'>
                  <AvatarFallback>CN</AvatarFallback>
                  <AvatarImage
                    src={data?.avatar || ''}
                    alt={data?.fullName || ''}
                    className='rounded-full'
                  />
                </Avatar>
                <h3 className='text-lg font-bold'>{data?.fullName || ''}</h3>
                <p className='text-sm font-normal italic'>
                  {data?.bio || 'Empty'}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t('adminUsers.show.cardTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Descriptions>
                <DescriptionItem label='Email' value={data?.email} />
                <DescriptionItem
                  label={t('adminUsers.show.fullName')}
                  value={data?.fullName}
                />
                <DescriptionItem
                  label={t('adminUsers.show.phoneNumber')}
                  value={data?.phone}
                />
                <DescriptionItem
                  label={t('adminUsers.show.birthday')}
                  value={
                    data.birthday
                      ? format(data.birthday, 'dd/MM/yyyy')
                      : undefined
                  }
                />
                <DescriptionItem
                  label={t('adminUsers.show.emailVerified')}
                  value={data?.verifiedAt ? 'Active' : 'Inactive'}
                />
                <DescriptionItem label={t('adminUsers.show.role')}>
                  <div className='mt-2 flex flex-wrap gap-1'>
                    {data.roles.map((role) => (
                      <Badge key={role.id} variant='secondary'>
                        {role.name}
                      </Badge>
                    ))}
                  </div>
                </DescriptionItem>
                <DescriptionItem
                  label={t('adminUsers.show.createdAt')}
                  value={format(data.createdAt, 'dd/MM/yyyy HH:mm aa')}
                />
                <DescriptionItem
                  label={t('adminUsers.show.updatedAt')}
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
