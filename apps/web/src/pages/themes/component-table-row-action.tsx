import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Row } from '@tanstack/react-table'
import {
  CopyIcon,
  Edit2Icon,
  EyeIcon,
  GlobeIcon,
  MonitorIcon,
  MoreHorizontalIcon,
  Trash2Icon,
} from 'lucide-react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import {
  applyRuntimeTheme,
  setCachedRuntimeTheme,
} from '@/lib/runtime-theme/runtime-theme'
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
  themeQueryKeys,
} from './queries'
import type { ThemeSchema, ThemeTarget } from './schema'

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

  const publishMutation = useMutation({
    mutationFn: apiPublishTheme,
    onSuccess: (updatedTheme, variables) => {
      queryClient.invalidateQueries({ queryKey: themeQueryKeys.all })
      queryClient.invalidateQueries({
        queryKey: themeQueryKeys.detail(theme.id),
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

  const handleDelete = () => {
    if (!window.confirm(`Delete "${theme.name}"?`)) return
    deleteMutation.mutate(theme.id)
  }

  const publishFor = (target: ThemeTarget) => {
    publishMutation.mutate({ id: theme.id, target })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' size='icon'>
          <MoreHorizontalIcon className='size-4' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        <DropdownMenuItem onClick={() => navigate(`/themes/${theme.id}/show`)}>
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
          <DropdownMenuItem onClick={() => duplicateMutation.mutate(theme.id)}>
            <CopyIcon className='size-4' />
            Duplicate
          </DropdownMenuItem>
        )}
        {canPublish && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => publishFor('admin')}
              disabled={publishMutation.isPending}
            >
              <MonitorIcon className='size-4' />
              Set for admin portal
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => publishFor('client')}
              disabled={publishMutation.isPending}
            >
              <GlobeIcon className='size-4' />
              Set for client site
            </DropdownMenuItem>
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
  )
}
