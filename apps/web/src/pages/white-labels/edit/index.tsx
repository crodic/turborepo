import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { restApiErrorHandler } from '@/lib/rest-api-handler'
import { Button } from '@/components/ui/button'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { WhiteLabelForm } from '../components/white-label-form'
import {
  apiUpdateWhiteLabel,
  useDataWhiteLabelById,
  WHITE_LABEL_ACTIVE_STORAGE_KEY,
  whiteLabelQueryKeys,
} from '../queries'
import type { WhiteLabelFormSchema } from '../schema'

export function PageWhiteLabelEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: whiteLabel, isLoading } = useDataWhiteLabelById(id!)

  const updateMutation = useMutation({
    mutationFn: apiUpdateWhiteLabel,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: whiteLabelQueryKeys.all })
      queryClient.invalidateQueries({
        queryKey: whiteLabelQueryKeys.detail(id!),
      })
      if (data.isActive) {
        queryClient.invalidateQueries({
          queryKey: whiteLabelQueryKeys.active(data.target),
        })
        if (data.target === 'admin') {
          localStorage.setItem(
            WHITE_LABEL_ACTIVE_STORAGE_KEY,
            JSON.stringify(data)
          )
        }
      }
      toast.success('White-label profile updated successfully')
      navigate(`/white-labels/${id}/show`)
    },
    onError: restApiErrorHandler,
  })

  const handleSubmit = (formData: WhiteLabelFormSchema) => {
    if (!id) return
    updateMutation.mutate({ id, data: formData })
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
        <div className='flex items-center gap-4'>
          <Button
            variant='ghost'
            size='icon'
            onClick={() => navigate('/white-labels')}
          >
            <ArrowLeft className='size-5' />
          </Button>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>
              Edit White Label Profile
            </h2>
            <p className='text-muted-foreground text-sm'>
              Modify brand assets, theme tokens, and metadata for{' '}
              {whiteLabel?.name || 'profile'}.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className='flex h-64 items-center justify-center'>
            <Loader2 className='text-primary size-8 animate-spin' />
          </div>
        ) : (
          <WhiteLabelForm
            initialData={whiteLabel}
            isSubmitting={updateMutation.isPending}
            onSubmit={handleSubmit}
            onCancel={() => navigate('/white-labels')}
          />
        )}
      </Main>
    </>
  )
}
