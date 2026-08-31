import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Row } from '@tanstack/react-table'
import {
  CopyIcon,
  Edit2Icon,
  EyeIcon,
  MoreHorizontalIcon,
  PowerOffIcon,
  SparklesIcon,
  Trash2Icon,
} from 'lucide-react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import {
  applyRuntimeTheme,
  clearRuntimeThemeStyles,
  hasPersonalThemeColor,
  setCachedRuntimeTheme,
} from '@/lib/runtime-theme/runtime-theme'
import { applyWebsiteMetadata } from '@/lib/website-metadata'
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
  apiActivateWhiteLabel,
  apiDeactivateWhiteLabel,
  apiDeleteWhiteLabel,
  apiDuplicateWhiteLabel,
  WHITE_LABEL_ACTIVE_STORAGE_KEY,
  whiteLabelQueryKeys,
} from './queries'
import type { WhiteLabelSchema } from './schema'

export default function ComponentTableRowActions({
  row,
}: {
  row: Row<WhiteLabelSchema>
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { ability } = useAuthStore()
  const item = row.original
  const canCreate = ability.can('create', 'WHITE_LABEL')
  const canUpdate = ability.can('update', 'WHITE_LABEL')
  const canDelete = ability.can('delete', 'WHITE_LABEL')
  const canPublish = ability.can('publish', 'WHITE_LABEL')
  const [activationTarget, setActivationTarget] = useState<
    'activate' | 'deactivate' | null
  >(null)

  const duplicateMutation = useMutation({
    mutationFn: apiDuplicateWhiteLabel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: whiteLabelQueryKeys.all })
      toast.success('White-label profile duplicated successfully')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: apiDeleteWhiteLabel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: whiteLabelQueryKeys.all })
      toast.success('White-label profile deleted successfully')
    },
  })

  const activateMutation = useMutation({
    mutationFn: apiActivateWhiteLabel,
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: whiteLabelQueryKeys.all })
      queryClient.invalidateQueries({
        queryKey: whiteLabelQueryKeys.detail(item.id),
      })
      queryClient.invalidateQueries({
        queryKey: whiteLabelQueryKeys.active(updated.target),
      })

      if (updated.target === 'admin') {
        localStorage.setItem(
          WHITE_LABEL_ACTIVE_STORAGE_KEY,
          JSON.stringify(updated)
        )
        setCachedRuntimeTheme({ id: updated.id, styles: updated.styles })
        if (!hasPersonalThemeColor()) {
          applyRuntimeTheme({ id: updated.id, styles: updated.styles })
        }
        applyWebsiteMetadata({
          site_brand: updated.brandName || undefined,
          site_title: updated.siteTitle || undefined,
          site_tagline: updated.siteTagline || undefined,
          meta_title: updated.metaTitle || undefined,
          meta_description: updated.metaDescription || undefined,
          canonical_url: updated.canonicalUrl || undefined,
          site_logo: updated.siteLogo || undefined,
          site_dark_logo: updated.siteDarkLogo || undefined,
          site_favicon: updated.siteFavicon || undefined,
          og_image: updated.ogImage || undefined,
          twitter_image: updated.twitterImage || undefined,
        })
      }

      toast.success(`"${updated.name}" is now active for ${updated.target}`)
      setActivationTarget(null)
    },
  })

  const deactivateMutation = useMutation({
    mutationFn: apiDeactivateWhiteLabel,
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: whiteLabelQueryKeys.all })
      queryClient.invalidateQueries({
        queryKey: whiteLabelQueryKeys.detail(item.id),
      })
      queryClient.invalidateQueries({
        queryKey: whiteLabelQueryKeys.active(updated.target),
      })

      if (updated.target === 'admin') {
        setCachedRuntimeTheme(null)
        if (!hasPersonalThemeColor()) {
          clearRuntimeThemeStyles()
        }
      }

      toast.success(`"${updated.name}" is deactivated`)
      setActivationTarget(null)
    },
  })

  const handleDelete = () => {
    if (!window.confirm(`Delete profile "${item.name}"?`)) return
    deleteMutation.mutate(item.id)
  }

  const confirmActivation = () => {
    if (activationTarget === 'activate') {
      activateMutation.mutate(item.id)
    } else if (activationTarget === 'deactivate') {
      deactivateMutation.mutate(item.id)
    }
  }

  const isPending =
    activateMutation.isPending ||
    deactivateMutation.isPending ||
    duplicateMutation.isPending ||
    deleteMutation.isPending

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
            onClick={() => navigate(`/white-labels/${item.id}/show`)}
          >
            <EyeIcon className='size-4' />
            View Studio
          </DropdownMenuItem>
          {canUpdate && (
            <DropdownMenuItem
              onClick={() => navigate(`/white-labels/${item.id}/edit`)}
            >
              <Edit2Icon className='size-4' />
              Edit Profile
            </DropdownMenuItem>
          )}
          {canCreate && (
            <DropdownMenuItem
              onClick={() => duplicateMutation.mutate(item.id)}
              disabled={isPending}
            >
              <CopyIcon className='size-4' />
              Duplicate
            </DropdownMenuItem>
          )}
          {canPublish && (
            <>
              <DropdownMenuSeparator />
              {item.isActive ? (
                <DropdownMenuItem
                  onClick={() => setActivationTarget('deactivate')}
                  disabled={isPending}
                >
                  <PowerOffIcon className='size-4' />
                  Deactivate
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => setActivationTarget('activate')}
                  disabled={isPending}
                >
                  <SparklesIcon className='size-4' />
                  Set as Active ({item.target})
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
                disabled={isPending}
              >
                <Trash2Icon className='size-4' />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={!!activationTarget}
        onOpenChange={(open) => {
          if (!open) setActivationTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {activationTarget === 'activate'
                ? `Activate "${item.name}"?`
                : `Deactivate "${item.name}"?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {activationTarget === 'activate'
                ? `This will immediately apply the branding, colors, logos, and typography of "${item.name}" to the ${item.target} target application.`
                : `This will deactivate "${item.name}". The ${item.target} will fall back to default styling.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmActivation} disabled={isPending}>
              {activationTarget === 'activate' ? 'Activate Now' : 'Deactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
