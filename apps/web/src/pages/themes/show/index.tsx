import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  Edit2Icon,
  FileX2Icon,
  MonitorIcon,
  MoonIcon,
  SunIcon,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { IS_RUNTIME_THEME_ENABLED } from '@/lib/feature-flags'
import {
  applyRuntimeTheme,
  clearRuntimeThemeStyles,
  hasPersonalThemeColor,
  setCachedRuntimeTheme,
} from '@/lib/runtime-theme/runtime-theme'
import type { ThemeMode } from '@/lib/theme-builder/default-theme'
import { useTheme } from '@/context/theme-provider'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
  apiUpdateThemeStatus,
  themeQueryKeys,
  useDataThemeById,
} from '../queries'
import type { ThemeStatus, ThemeTarget } from '../schema'

type RuntimeAction = {
  type: 'set' | 'unset'
  target: ThemeTarget
}

export default function PageThemeShow() {
  const params = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { ability } = useAuthStore()
  const themeId = params.id as string
  const { data, isFetching } = useDataThemeById(themeId)
  const canPublish = ability.can('publish', 'THEME')
  const canUpdate = ability.can('update', 'THEME')
  const [runtimeAction, setRuntimeAction] = useState<RuntimeAction | null>(null)
  const [previewMode, setPreviewMode] = useState<ThemeMode>('light')
  const { setColorKey, clearPersonalColor } = useTheme()

  const statusMutation = useMutation({
    mutationFn: apiUpdateThemeStatus,
    onSuccess: (updatedTheme) => {
      queryClient.invalidateQueries({ queryKey: themeQueryKeys.all })
      queryClient.invalidateQueries({
        queryKey: themeQueryKeys.detail(themeId),
      })
      queryClient.invalidateQueries({
        queryKey: themeQueryKeys.runtime,
      })

      if (data?.isAdminDefault && !updatedTheme.isAdminDefault) {
        setCachedRuntimeTheme(null)
        if (!hasPersonalThemeColor()) {
          clearRuntimeThemeStyles()
        }
      }

      toast.success(
        updatedTheme.status === 'published'
          ? 'Theme published successfully'
          : 'Theme moved to draft'
      )
    },
  })

  const publishMutation = useMutation({
    mutationFn: apiPublishTheme,
    onSuccess: (updatedTheme) => {
      queryClient.invalidateQueries({ queryKey: themeQueryKeys.all })
      queryClient.invalidateQueries({
        queryKey: themeQueryKeys.detail(themeId),
      })
      queryClient.invalidateQueries({
        queryKey: themeQueryKeys.runtime,
      })

      setCachedRuntimeTheme(updatedTheme)
      if (!hasPersonalThemeColor()) {
        applyRuntimeTheme(updatedTheme)
      } else {
        clearPersonalColor()
      }

      toast.success('Theme applied to admin portal')
      setRuntimeAction(null)
    },
  })

  const unpublishMutation = useMutation({
    mutationFn: apiUnpublishTheme,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: themeQueryKeys.all })
      queryClient.invalidateQueries({
        queryKey: themeQueryKeys.detail(themeId),
      })
      queryClient.invalidateQueries({
        queryKey: themeQueryKeys.runtime,
      })

      setCachedRuntimeTheme(null)
      if (!hasPersonalThemeColor()) {
        clearRuntimeThemeStyles()
        setColorKey('neutral')
      }

      toast.success('Theme removed from admin portal')
      setRuntimeAction(null)
    },
  })

  const updateStatus = (status: ThemeStatus) => {
    statusMutation.mutate({ id: themeId, status })
  }

  const confirmRuntimeAction = () => {
    if (!runtimeAction) return

    if (runtimeAction.type === 'set') {
      publishMutation.mutate({ id: themeId, target: runtimeAction.target })
      return
    }

    unpublishMutation.mutate({ id: themeId, target: runtimeAction.target })
  }

  if (isFetching) return <DataLoader />
  if (!data) return <NotFoundError />

  const isPending =
    publishMutation.isPending ||
    unpublishMutation.isPending ||
    statusMutation.isPending
  const runtimeVerb = runtimeAction?.type === 'set' ? 'set' : 'unset'

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
            </div>
            <p className='text-muted-foreground font-mono text-sm'>
              {data.slug}
            </p>
          </div>

          <div className='flex flex-wrap items-center gap-2'>
            <Button variant='outline' onClick={() => navigate(-1)}>
              <ArrowLeftIcon className='size-4' />
              Back
            </Button>
            {canPublish && (
              <>
                <Button
                  variant='outline'
                  onClick={() =>
                    updateStatus(
                      data.status === 'published' ? 'draft' : 'published'
                    )
                  }
                  disabled={isPending}
                >
                  {data.status === 'published' ? (
                    <FileX2Icon className='size-4' />
                  ) : (
                    <CheckCircle2Icon className='size-4' />
                  )}
                  {data.status === 'published' ? 'Move to draft' : 'Publish'}
                </Button>
                {IS_RUNTIME_THEME_ENABLED && (
                  <Button
                    variant='outline'
                    onClick={() =>
                      setRuntimeAction({
                        type: data.isAdminDefault ? 'unset' : 'set',
                        target: 'admin',
                      })
                    }
                    disabled={isPending || data.status !== 'published'}
                  >
                    <MonitorIcon className='size-4' />
                    {data.isAdminDefault ? 'Unset admin' : 'Set admin'}
                  </Button>
                )}
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

        <div className='space-y-3'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div>
              <h2 className='text-lg font-semibold'>Preview</h2>
              <p className='text-muted-foreground text-sm'>
                Switch between light and dark tokens for this theme.
              </p>
            </div>
            <div className='flex rounded-md border p-1'>
              <Button
                type='button'
                size='sm'
                variant={previewMode === 'light' ? 'default' : 'ghost'}
                onClick={() => setPreviewMode('light')}
              >
                <SunIcon className='size-4' />
                Light
              </Button>
              <Button
                type='button'
                size='sm'
                variant={previewMode === 'dark' ? 'default' : 'ghost'}
                onClick={() => setPreviewMode('dark')}
              >
                <MoonIcon className='size-4' />
                Dark
              </Button>
            </div>
          </div>
          <ThemePreview styles={data.styles} mode={previewMode} />
        </div>
      </Main>

      <AlertDialog
        open={!!runtimeAction}
        onOpenChange={(open) => {
          if (!open) setRuntimeAction(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {runtimeVerb === 'set'
                ? 'Set runtime theme?'
                : 'Unset runtime theme?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will {runtimeVerb} "{data.name}" for the admin portal.
              {runtimeAction?.type === 'unset' &&
                ' The admin portal will fall back to the static source-code theme.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRuntimeAction}
              disabled={isPending}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
