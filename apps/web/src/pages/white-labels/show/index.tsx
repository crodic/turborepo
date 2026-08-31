import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Edit2, Loader2, Sparkles, Trash2 } from 'lucide-react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import {
  applyRuntimeTheme,
  hasPersonalThemeColor,
  setCachedRuntimeTheme,
} from '@/lib/runtime-theme/runtime-theme'
import { applyWebsiteMetadata } from '@/lib/website-metadata'
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
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { WhiteLabelPreview } from '../components/white-label-preview'
import {
  apiActivateWhiteLabel,
  apiDeleteWhiteLabel,
  useDataWhiteLabelById,
  WHITE_LABEL_ACTIVE_STORAGE_KEY,
  whiteLabelQueryKeys,
} from '../queries'

export default function PageWhiteLabelShow() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { ability } = useAuthStore()

  const { data: item, isLoading } = useDataWhiteLabelById(id!)

  const canUpdate = ability.can('update', 'WHITE_LABEL')
  const canDelete = ability.can('delete', 'WHITE_LABEL')
  const canPublish = ability.can('publish', 'WHITE_LABEL')

  const activateMutation = useMutation({
    mutationFn: apiActivateWhiteLabel,
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: whiteLabelQueryKeys.all })
      queryClient.invalidateQueries({
        queryKey: whiteLabelQueryKeys.detail(id!),
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
    },
  })

  const deleteMutation = useMutation({
    mutationFn: apiDeleteWhiteLabel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: whiteLabelQueryKeys.all })
      toast.success('White-label profile deleted')
      navigate('/white-labels')
    },
  })

  const handleDelete = () => {
    if (!item) return
    if (!window.confirm(`Delete profile "${item.name}"?`)) return
    deleteMutation.mutate(item.id)
  }

  if (isLoading) {
    return (
      <div className='flex h-screen items-center justify-center'>
        <Loader2 className='text-primary size-8 animate-spin' />
      </div>
    )
  }

  if (!item) {
    return (
      <Main className='flex flex-1 flex-col items-center justify-center'>
        <p className='text-muted-foreground'>White-label profile not found.</p>
        <Button
          variant='outline'
          className='mt-4'
          onClick={() => navigate('/white-labels')}
        >
          Back to list
        </Button>
      </Main>
    )
  }

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

      <Main className='flex flex-1 flex-col gap-6'>
        {/* Page header */}
        <div className='flex flex-wrap items-center justify-between gap-4'>
          <div className='flex items-center gap-3'>
            <Button
              variant='ghost'
              size='icon'
              onClick={() => navigate('/white-labels')}
            >
              <ArrowLeft className='size-5' />
            </Button>
            <div>
              <div className='flex items-center gap-2'>
                <h2 className='text-2xl font-bold tracking-tight'>
                  {item.name}
                </h2>
                <Badge
                  variant={item.target === 'admin' ? 'default' : 'secondary'}
                  className='capitalize'
                >
                  {item.target}
                </Badge>
                {item.isActive && (
                  <Badge className='gap-1 bg-emerald-600 text-white'>
                    <Sparkles className='size-3' />
                    Active
                  </Badge>
                )}
              </div>
              <p className='text-muted-foreground text-sm'>
                {item.description || item.slug}
              </p>
            </div>
          </div>

          <div className='flex items-center gap-2'>
            {canPublish && !item.isActive && (
              <Button
                variant='default'
                onClick={() => activateMutation.mutate(item.id)}
                disabled={activateMutation.isPending}
                className='gap-1.5'
              >
                <Sparkles className='size-4' />
                Activate for {item.target}
              </Button>
            )}
            {canUpdate && (
              <Button
                variant='outline'
                onClick={() => navigate(`/white-labels/${item.id}/edit`)}
                className='gap-1.5'
              >
                <Edit2 className='size-4' />
                Edit
              </Button>
            )}
            {canDelete && (
              <Button
                variant='destructive'
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className='gap-1.5'
              >
                <Trash2 className='size-4' />
                Delete
              </Button>
            )}
          </div>
        </div>

        {/* Content grid: Info cards + Preview */}
        <div className='grid gap-6 xl:grid-cols-[1fr_1.1fr]'>
          <div className='space-y-6'>
            <Card>
              <CardHeader>
                <CardTitle className='text-base font-semibold'>
                  Brand Summary
                </CardTitle>
                <CardDescription>
                  Registered brand identity details and metadata.
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-3 text-sm'>
                <div className='flex justify-between border-b pb-2'>
                  <span className='text-muted-foreground'>Brand Name:</span>
                  <span className='font-medium'>{item.brandName || '—'}</span>
                </div>
                <div className='flex justify-between border-b pb-2'>
                  <span className='text-muted-foreground'>Site Title:</span>
                  <span className='font-medium'>{item.siteTitle || '—'}</span>
                </div>
                <div className='flex justify-between border-b pb-2'>
                  <span className='text-muted-foreground'>Tagline:</span>
                  <span className='font-medium'>{item.siteTagline || '—'}</span>
                </div>
                <div className='flex justify-between border-b pb-2'>
                  <span className='text-muted-foreground'>Copyright:</span>
                  <span className='font-medium'>
                    {item.copyrightText || '—'}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Canonical URL:</span>
                  <span className='font-medium'>
                    {item.canonicalUrl || '—'}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className='text-base font-semibold'>
                  Uploaded Media Assets
                </CardTitle>
                <CardDescription>
                  Logos and icons associated with this profile.
                </CardDescription>
              </CardHeader>
              <CardContent className='grid gap-4 sm:grid-cols-3'>
                <div className='space-y-1.5'>
                  <p className='text-muted-foreground text-xs font-medium'>
                    Light Logo
                  </p>
                  <div className='bg-muted/30 flex aspect-video items-center justify-center rounded-md border p-2'>
                    {item.siteLogo ? (
                      <img
                        src={item.siteLogo}
                        alt='Light logo'
                        className='max-h-full max-w-full object-contain'
                      />
                    ) : (
                      <span className='text-muted-foreground text-xs'>
                        None
                      </span>
                    )}
                  </div>
                </div>

                <div className='space-y-1.5'>
                  <p className='text-muted-foreground text-xs font-medium'>
                    Dark Logo
                  </p>
                  <div className='bg-muted/30 flex aspect-video items-center justify-center rounded-md border p-2'>
                    {item.siteDarkLogo ? (
                      <img
                        src={item.siteDarkLogo}
                        alt='Dark logo'
                        className='max-h-full max-w-full object-contain'
                      />
                    ) : (
                      <span className='text-muted-foreground text-xs'>
                        None
                      </span>
                    )}
                  </div>
                </div>

                <div className='space-y-1.5'>
                  <p className='text-muted-foreground text-xs font-medium'>
                    Favicon Icon
                  </p>
                  <div className='bg-muted/30 flex aspect-video items-center justify-center rounded-md border p-2'>
                    {item.siteFavicon ? (
                      <img
                        src={item.siteFavicon}
                        alt='Favicon'
                        className='size-8 object-contain'
                      />
                    ) : (
                      <span className='text-muted-foreground text-xs'>
                        None
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <WhiteLabelPreview
              styles={item.styles}
              brandName={item.brandName}
              siteTitle={item.siteTitle}
              siteTagline={item.siteTagline}
              siteLogoUrl={item.siteLogo}
              siteDarkLogoUrl={item.siteDarkLogo}
              siteFaviconUrl={item.siteFavicon}
            />
          </div>
        </div>
      </Main>
    </>
  )
}
