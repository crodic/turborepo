import { useState } from 'react'
import { AxiosError } from 'axios'
import { format } from 'date-fns'
import { Avatar } from '@radix-ui/react-avatar'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeftIcon, EditIcon, ShieldIcon, TrashIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Authorize } from '@/components/authorize'
import { DeleteAlertDialog } from '@/components/common/delete-alert-dialog'
import { DescriptionItem, Descriptions } from '@/components/common/descriptions'
import { ConfigDrawer } from '@/components/config-drawer'
import DataLoader from '@/components/layout/data-loader'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import {
  apiGetActiveUserImpersonationSession,
  apiImpersonateUser,
  apiStopUserImpersonation,
} from '@/pages/auth/queries'
import { NotFoundError } from '@/pages/errors/not-found-error'
import { apiDeleteUser, useDataGetUserDetail } from '../queries'

export function PageUserShow() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const params = useParams()
  const id = params.id as string
  const [isShowDeleteDialog, setIsShowDeleteDialog] = useState(false)
  const [impersonationReason, setImpersonationReason] = useState('')

  const { data, isFetching } = useDataGetUserDetail(id)
  const { data: activeImpersonationSession, isFetching: isCheckingSession } =
    useQuery({
      queryKey: ['user-active-impersonation-session', id],
      queryFn: () => apiGetActiveUserImpersonationSession(id),
      enabled: !!id,
    })

  const impersonateMutation = useMutation({
    mutationFn: apiImpersonateUser,
    onSuccess: (response) => {
      queryClient.invalidateQueries({
        queryKey: ['user-active-impersonation-session', id],
      })
      const redirectUrl = response.redirectUrl || response.callbackUrl

      toast.success('Impersonation session created')

      if (redirectUrl) {
        window.open(redirectUrl, '_blank', 'noopener,noreferrer')
      }

      setImpersonationReason('')
    },
    onError: (error) => {
      if (error instanceof AxiosError) {
        toast.error(
          error.response?.data.message || 'Failed to impersonate user'
        )
        return
      }

      toast.error('Failed to impersonate user')
    },
  })

  const stopImpersonationMutation = useMutation({
    mutationFn: () => apiStopUserImpersonation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['user-active-impersonation-session', id],
      })
      toast.success('Impersonation session stopped')
    },
    onError: (error) => {
      if (error instanceof AxiosError) {
        toast.error(
          error.response?.data.message || 'Failed to stop impersonation'
        )
        return
      }

      toast.error('Failed to stop impersonation')
    },
  })

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

  const handleImpersonate = () => {
    const reason = impersonationReason.trim()

    if (!reason) {
      toast.error('Please enter a reason for impersonation')
      return
    }

    const clientUrl = import.meta.env.VITE_CLIENT_URL || 'http://localhost:3000'
    const callbackUrl =
      import.meta.env.VITE_IMPERSONATION_CALLBACK_URL ||
      `${clientUrl}/auth/impersonation/callback`

    impersonateMutation.mutate({
      userId: id,
      reason,
      callbackUrl,
    })
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
            <Authorize action='impersonate' subject='USER'>
              {activeImpersonationSession ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant='destructive'
                      disabled={stopImpersonationMutation.isPending}
                    >
                      <ShieldIcon className='h-4 w-4' />
                      Stop impersonating
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Stop impersonation?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will revoke the active impersonation session for{' '}
                        {data.fullName || data.email}. The client tab will lose
                        access immediately.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel
                        disabled={stopImpersonationMutation.isPending}
                      >
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        disabled={stopImpersonationMutation.isPending}
                        onClick={() => stopImpersonationMutation.mutate()}
                      >
                        Stop impersonating
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant='secondary'
                      disabled={
                        impersonateMutation.isPending || isCheckingSession
                      }
                    >
                      <ShieldIcon className='h-4 w-4' />
                      Impersonate
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Start impersonation?</AlertDialogTitle>
                      <AlertDialogDescription>
                        You are about to open a new client tab and act as{' '}
                        {data.fullName || data.email}. This session is temporary
                        and all actions should be treated as sensitive.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className='grid gap-2'>
                      <Label htmlFor='impersonation-reason'>
                        Reason for impersonation
                      </Label>
                      <Textarea
                        id='impersonation-reason'
                        value={impersonationReason}
                        onChange={(event) =>
                          setImpersonationReason(event.target.value)
                        }
                        placeholder='Example: Investigating support ticket #1234'
                        disabled={impersonateMutation.isPending}
                        maxLength={500}
                      />
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel
                        disabled={impersonateMutation.isPending}
                      >
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        disabled={
                          impersonateMutation.isPending ||
                          !impersonationReason.trim()
                        }
                        onClick={handleImpersonate}
                      >
                        Start impersonating
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </Authorize>
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
