import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Row } from '@tanstack/react-table'
import {
  CheckCircle2Icon,
  CopyIcon,
  Edit2Icon,
  EyeIcon,
  FileX2Icon,
  MonitorIcon,
  MoreHorizontalIcon,
  Trash2Icon,
} from 'lucide-react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { IS_RUNTIME_THEME_ENABLED } from '@/lib/feature-flags'
import {
  applyRuntimeTheme,
  clearRuntimeThemeStyles,
  hasPersonalThemeColor,
  setCachedRuntimeTheme,
} from '@/lib/runtime-theme/runtime-theme'
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
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  apiDeleteTheme,
  apiDuplicateTheme,
  apiPublishTheme,
  apiUnpublishTheme,
  apiUpdateThemeStatus,
  themeQueryKeys,
} from './queries'
import type { ThemeSchema, ThemeStatus, ThemeTarget } from './schema'

type RuntimeAction = {
  type: 'set' | 'unset'
  target: ThemeTarget
}

export default function ComponentTableRowActions({
  row,
}: {
  row: Row<ThemeSchema>
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { ability } = useAuthStore()
  const theme = row.original
  const canCreate = ability.can('create', 'THEME')
  const canUpdate = ability.can('update', 'THEME')
  const canDelete = ability.can('delete', 'THEME')
  const canPublish = ability.can('publish', 'THEME')
  const [runtimeAction, setRuntimeAction] = useState<RuntimeAction | null>(null)

  const duplicateMutation = useMutation({
    mutationFn: apiDuplicateTheme,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: themeQueryKeys.all })
      toast.success('Theme duplicated successfully')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: apiDeleteTheme,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: themeQueryKeys.all })
      toast.success('Theme deleted successfully')
    },
  })

  const statusMutation = useMutation({
    mutationFn: apiUpdateThemeStatus,
    onSuccess: (updatedTheme) => {
      queryClient.invalidateQueries({ queryKey: themeQueryKeys.all })
      queryClient.invalidateQueries({
        queryKey: themeQueryKeys.detail(theme.id),
      })
      queryClient.invalidateQueries({
        queryKey: themeQueryKeys.runtime,
      })

      if (theme.isAdminDefault && !updatedTheme.isAdminDefault) {
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

  const setRuntimeMutation = useMutation({
    mutationFn: apiPublishTheme,
    onSuccess: (updatedTheme, variables) => {
      queryClient.invalidateQueries({ queryKey: themeQueryKeys.all })
      queryClient.invalidateQueries({
        queryKey: themeQueryKeys.detail(theme.id),
      })
      queryClient.invalidateQueries({
        queryKey: themeQueryKeys.runtime,
      })

      setCachedRuntimeTheme(updatedTheme)
      if (!hasPersonalThemeColor()) {
        applyRuntimeTheme(updatedTheme)
      }

      toast.success('Theme applied to admin portal')
      setRuntimeAction(null)
    },
  })

  const unsetRuntimeMutation = useMutation({
    mutationFn: apiUnpublishTheme,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: themeQueryKeys.all })
      queryClient.invalidateQueries({
        queryKey: themeQueryKeys.detail(theme.id),
      })
      queryClient.invalidateQueries({
        queryKey: themeQueryKeys.runtime,
      })

      setCachedRuntimeTheme(null)
      if (!hasPersonalThemeColor()) {
        clearRuntimeThemeStyles()
      }

      toast.success('Theme removed from admin portal')
      setRuntimeAction(null)
    },
  })

  const handleDelete = () => {
    if (!window.confirm(`Delete "${theme.name}"?`)) return
    deleteMutation.mutate(theme.id)
  }

  const updateStatus = (status: ThemeStatus) => {
    statusMutation.mutate({ id: theme.id, status })
  }

  const confirmRuntimeAction = () => {
    if (!runtimeAction) return

    if (runtimeAction.type === 'set') {
      setRuntimeMutation.mutate({ id: theme.id, target: runtimeAction.target })
      return
    }

    unsetRuntimeMutation.mutate({
      id: theme.id,
      target: runtimeAction.target,
    })
  }

  const isPending =
    setRuntimeMutation.isPending ||
    unsetRuntimeMutation.isPending ||
    statusMutation.isPending
  const runtimeVerb = runtimeAction?.type === 'set' ? 'set' : 'unset'

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' size='icon'>
            <MoreHorizontalIcon className='size-4' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuItem
            onClick={() => navigate(`/themes/${theme.id}/show`)}
          >
            <EyeIcon className='size-4' />
            View
          </DropdownMenuItem>
          {canUpdate && (
            <DropdownMenuItem
              onClick={() => navigate(`/themes/${theme.id}/edit`)}
            >
              <Edit2Icon className='size-4' />
              Edit
            </DropdownMenuItem>
          )}
          {canCreate && (
            <DropdownMenuItem
              onClick={() => duplicateMutation.mutate(theme.id)}
            >
              <CopyIcon className='size-4' />
              Duplicate
            </DropdownMenuItem>
          )}
          {canPublish && (
            <>
              <DropdownMenuSeparator />
              {theme.status === 'published' ? (
                <DropdownMenuItem
                  onClick={() => updateStatus('draft')}
                  disabled={isPending}
                >
                  <FileX2Icon className='size-4' />
                  Move to draft
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => updateStatus('published')}
                  disabled={isPending}
                >
                  <CheckCircle2Icon className='size-4' />
                  Publish
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {IS_RUNTIME_THEME_ENABLED && (
                <DropdownMenuItem
                  onClick={() =>
                    setRuntimeAction({
                      type: theme.isAdminDefault ? 'unset' : 'set',
                      target: 'admin',
                    })
                  }
                  disabled={isPending || theme.status !== 'published'}
                >
                  <MonitorIcon className='size-4' />
                  {theme.isAdminDefault
                    ? 'Unset admin portal'
                    : 'Set for admin portal'}
                </DropdownMenuItem>
              )}
            </>
          )}
          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className='text-destructive focus:text-destructive'
                onClick={handleDelete}
              >
                <Trash2Icon className='size-4' />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

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
              This will {runtimeVerb} "{theme.name}" for the admin portal.
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
