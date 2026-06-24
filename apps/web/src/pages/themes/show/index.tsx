import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeftIcon, Edit2Icon, GlobeIcon, MonitorIcon } from 'lucide-react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import {
  applyRuntimeTheme,
  setCachedRuntimeTheme,
} from '@/lib/runtime-theme/runtime-theme'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ConfigDrawer } from '@/components/config-drawer'
import DataLoader from '@/components/layout/data-loader'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { NotFoundError } from '@/pages/errors/not-found-error'
import { ThemePreview } from '../components/theme-preview'
import {
  apiPublishTheme,
  apiUnpublishTheme,
  themeQueryKeys,
  useDataThemeById,
} from '../queries'
import type { ThemeTarget } from '../schema'

export default function PageThemeShow() {
  const params = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { ability } = useAuthStore()
  const themeId = params.id as string
  const { data, isFetching } = useDataThemeById(themeId)
  const canPublish = ability.can('publish', 'THEME')
  const canUpdate = ability.can('update', 'THEME')

  const publishMutation = useMutation({
    mutationFn: apiPublishTheme,
    onSuccess: (updatedTheme, variables) => {
      queryClient.invalidateQueries({ queryKey: themeQueryKeys.all })
      queryClient.invalidateQueries({
        queryKey: themeQueryKeys.detail(themeId),
      })
      queryClient.invalidateQueries({
        queryKey: themeQueryKeys.runtime(variables.target),
      })

      if (variables.target === 'admin') {
        setCachedRuntimeTheme(updatedTheme)
        applyRuntimeTheme(updatedTheme)
      }

      toast.success(
        variables.target === 'admin'
          ? 'Theme applied to admin portal'
          : 'Theme applied to client site'
      )
    },
  })

  const unpublishMutation = useMutation({
    mutationFn: apiUnpublishTheme,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: themeQueryKeys.all })
      queryClient.invalidateQueries({
        queryKey: themeQueryKeys.detail(themeId),
      })
      queryClient.invalidateQueries({
        queryKey: themeQueryKeys.runtime(variables.target),
      })
      toast.success(
        variables.target === 'admin'
          ? 'Theme removed from admin portal'
          : 'Theme removed from client site'
      )
    },
  })

  console.log(data)

  const setThemeFor = (target: ThemeTarget) => {
    publishMutation.mutate({ id: themeId, target })
  }

  const unsetThemeFor = (target: ThemeTarget) => {
    unpublishMutation.mutate({ id: themeId, target })
  }

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

      <Main fluid className='space-y-5'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div className='space-y-2'>
            <div className='flex flex-wrap items-center gap-2'>
              <h1 className='text-2xl font-bold tracking-tight'>{data.name}</h1>
              <Badge
                variant={data.status === 'published' ? 'default' : 'secondary'}
              >
                {data.status}
              </Badge>
              {data.isAdminDefault && <Badge>Admin runtime</Badge>}
              {data.isClientDefault && (
                <Badge variant='secondary'>Client runtime</Badge>
              )}
            </div>
            <p className='text-muted-foreground font-mono text-sm'>
              {data.slug}
            </p>
          </div>

          <div className='flex items-center gap-2'>
            <Button variant='outline' onClick={() => navigate(-1)}>
              <ArrowLeftIcon className='size-4' />
              Back
            </Button>
            {canPublish && (
              <>
                <Button
                  variant='outline'
                  onClick={() =>
                    data.isAdminDefault
                      ? unsetThemeFor('admin')
                      : setThemeFor('admin')
                  }
                  disabled={
                    publishMutation.isPending || unpublishMutation.isPending
                  }
                >
                  <MonitorIcon className='size-4' />
                  {data.isAdminDefault ? 'Unset admin' : 'Set admin'}
                </Button>
                <Button
                  variant='outline'
                  onClick={() =>
                    data.isClientDefault
                      ? unsetThemeFor('client')
                      : setThemeFor('client')
                  }
                  disabled={
                    publishMutation.isPending || unpublishMutation.isPending
                  }
                >
                  <GlobeIcon className='size-4' />
                  {data.isClientDefault ? 'Unset client' : 'Set client'}
                </Button>
              </>
            )}
            {canUpdate && (
              <Button onClick={() => navigate(`/themes/${data.id}/edit`)}>
                <Edit2Icon className='size-4' />
                Edit
              </Button>
            )}
          </div>
        </div>

        <div className='grid gap-4 md:grid-cols-3'>
          <Card>
            <CardContent className='p-4'>
              <p className='text-muted-foreground text-sm'>Description</p>
              <p className='mt-1 text-sm'>
                {data.description || 'No description provided.'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className='p-4'>
              <p className='text-muted-foreground text-sm'>Created</p>
              <p className='mt-1 text-sm'>
                {new Date(data.createdAt).toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className='p-4'>
              <p className='text-muted-foreground text-sm'>Updated</p>
              <p className='mt-1 text-sm'>
                {new Date(data.updatedAt).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className='grid gap-5 xl:grid-cols-2'>
          <ThemePreview styles={data.styles} mode='light' />
          <ThemePreview styles={data.styles} mode='dark' />
        </div>
      </Main>
    </>
  )
}
