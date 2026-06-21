import { useState } from 'react'
import { AxiosError } from 'axios'
import { format } from 'date-fns'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeftIcon,
  CalendarClockIcon,
  Edit2Icon,
  HashIcon,
  LockKeyholeIcon,
  ShieldCheckIcon,
  Trash2Icon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { DeleteAlertDialog } from '@/components/common/delete-alert-dialog'
import { ConfigDrawer } from '@/components/config-drawer'
import DataLoader from '@/components/layout/data-loader'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { NotFoundError } from '@/pages/errors/not-found-error'
import { apiDeleteRole, useDataRoleById } from '../queries'
import { isProtectedRole } from '../schema'

type RolePermissionDetail = {
  id: string
  key: string
  name: string
  group: string
  description?: string | null
}

function getPermissionAction(permissionKey: string) {
  return permissionKey.split(':')[0] ?? permissionKey
}

function getFallbackPermissionDetails(
  permissions: string[]
): RolePermissionDetail[] {
  return permissions.map((permission) => ({
    id: permission,
    key: permission,
    name: permission,
    group: permission.split(':')[1] ?? 'Other',
    description: null,
  }))
}

export default function PageRoleShow() {
  const params = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const [isShowDeleteDialog, setIsShowDeleteDialog] = useState(false)

  const { data, isFetching } = useDataRoleById(params.id as string)

  const deleteRoleMutation = useMutation({
    mutationFn: apiDeleteRole,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['roles'],
      })
      toast.success('Role deleted successfully.')
      setIsShowDeleteDialog(false)
      navigate('/roles')
    },
    onError: (error) => {
      if (error instanceof AxiosError) {
        toast.error(error.response?.data.message)
      }
    },
  })

  const handleDelete = () => {
    if (data && isProtectedRole(data)) {
      toast.error('System roles cannot be deleted')
      return
    }

    if (params.id) {
      deleteRoleMutation.mutate(params.id)
    }
  }

  const isSuperAdmin = data?.permissions
    .map((perm) => ({
      action: perm.split(':')[0],
      subject: perm.split(':')[1],
    }))
    .some((claim) => claim.subject === 'all' && claim.action === 'manage')

  if (isFetching) return <DataLoader />

  if (!data) {
    return <NotFoundError />
  }

  const isProtected = isProtectedRole(data)
  const isSystemRole = data.isSystem
  const permissionDetails =
    data.permissionDetails.length > 0
      ? data.permissionDetails
      : getFallbackPermissionDetails(data.permissions)
  const groupedPermissions = permissionDetails.reduce<
    Record<string, RolePermissionDetail[]>
  >((groups, permission) => {
    const group = permission.group || 'Other'

    groups[group] = [...(groups[group] ?? []), permission]

    return groups
  }, {})
  const permissionCount = permissionDetails.length

  return (
    <>
      {isShowDeleteDialog && (
        <DeleteAlertDialog
          open={isShowDeleteDialog}
          onOpenChange={(open) => setIsShowDeleteDialog(open)}
          handleDelete={() => handleDelete()}
          isLoading={deleteRoleMutation.isPending}
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

      <Main>
        <div className='space-y-6'>
          <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
            <div className='space-y-2'>
              <div className='flex flex-wrap items-center gap-2'>
                <h1 className='text-2xl font-bold tracking-tight'>
                  {data.name}
                </h1>
                {isSystemRole ? (
                  <Badge variant='secondary'>System role</Badge>
                ) : (
                  <Badge variant='outline'>Custom role</Badge>
                )}
                {isSuperAdmin && <Badge>Full access</Badge>}
              </div>
              <p className='text-muted-foreground text-sm'>
                {data.description || t('roles.show.description')}
              </p>
            </div>

            <div className='flex flex-wrap items-center gap-2'>
              <Button onClick={() => navigate(-1)} variant='outline'>
                <ArrowLeftIcon size={16} />
                <span>{t('buttons.back')}</span>
              </Button>
              <Button
                onClick={() => navigate(`/roles/${data.id}/edit`)}
                variant='default'
                disabled={isProtected}
              >
                <Edit2Icon size={16} />
                <span>{t('buttons.edit')}</span>
              </Button>
              <Button
                variant='destructive'
                onClick={() => setIsShowDeleteDialog(true)}
                disabled={isProtected}
              >
                <Trash2Icon size={16} />
                <span>{t('buttons.delete')}</span>
              </Button>
            </div>
          </div>

          <div className='grid gap-4 md:grid-cols-4'>
            <Card>
              <CardContent className='flex items-center gap-3 p-4'>
                <div className='bg-primary/10 text-primary flex size-10 items-center justify-center rounded-md'>
                  <ShieldCheckIcon className='size-5' />
                </div>
                <div>
                  <p className='text-muted-foreground text-sm'>Permissions</p>
                  <p className='text-2xl font-semibold'>{permissionCount}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className='flex items-center gap-3 p-4'>
                <div className='bg-muted flex size-10 items-center justify-center rounded-md'>
                  <HashIcon className='size-5' />
                </div>
                <div>
                  <p className='text-muted-foreground text-sm'>Role ID</p>
                  <p className='font-mono text-sm font-medium'>{data.id}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className='flex items-center gap-3 p-4'>
                <div className='bg-muted flex size-10 items-center justify-center rounded-md'>
                  <CalendarClockIcon className='size-5' />
                </div>
                <div>
                  <p className='text-muted-foreground text-sm'>Created</p>
                  <p className='text-sm font-medium'>
                    {format(data.createdAt, 'yyyy-MM-dd HH:mm')}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className='flex items-center gap-3 p-4'>
                <div className='bg-muted flex size-10 items-center justify-center rounded-md'>
                  <LockKeyholeIcon className='size-5' />
                </div>
                <div>
                  <p className='text-muted-foreground text-sm'>Access type</p>
                  <p className='text-sm font-medium'>
                    {isSuperAdmin ? 'Full access' : 'Scoped access'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                <div>
                  <CardTitle>{t('roles.show.permissions')}</CardTitle>
                  <CardDescription>
                    Permissions are grouped by functional area for easier
                    review.
                  </CardDescription>
                </div>
                <Badge variant='secondary'>{permissionCount} permissions</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {permissionCount === 0 ? (
                <div className='text-muted-foreground rounded-md border p-6 text-center text-sm'>
                  No permissions assigned
                </div>
              ) : (
                <div className='grid gap-4 lg:grid-cols-2'>
                  {Object.entries(groupedPermissions).map(
                    ([group, permissions]) => (
                      <div
                        key={group}
                        className='overflow-hidden rounded-lg border'
                      >
                        <div className='bg-muted/40 flex items-center justify-between border-b p-4'>
                          <div>
                            <h3 className='font-semibold'>{group}</h3>
                            <p className='text-muted-foreground text-sm'>
                              {permissions.length} permissions
                            </p>
                          </div>
                          <ShieldCheckIcon className='text-muted-foreground size-4' />
                        </div>
                        <div className='divide-y'>
                          {permissions.map((permission) => (
                            <div key={permission.id} className='p-4'>
                              <div className='flex flex-wrap items-center gap-2'>
                                <p className='font-medium'>{permission.name}</p>
                                <Badge
                                  variant='outline'
                                  className='font-mono text-[11px]'
                                >
                                  {getPermissionAction(permission.key)}
                                </Badge>
                              </div>
                              {permission.description && (
                                <p className='text-muted-foreground mt-1 text-sm leading-relaxed'>
                                  {permission.description}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  )
}
