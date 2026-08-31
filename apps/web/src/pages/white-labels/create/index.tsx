import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router'
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
import { apiCreateWhiteLabel, whiteLabelQueryKeys } from '../queries'
import type { WhiteLabelFormSchema } from '../schema'

export function PageWhiteLabelCreate() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: apiCreateWhiteLabel,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: whiteLabelQueryKeys.all })
      toast.success('White-label profile created successfully')
      navigate(`/white-labels/${data.id}/show`)
    },
    onError: restApiErrorHandler,
  })

  const handleSubmit = (formData: WhiteLabelFormSchema) => {
    createMutation.mutate(formData)
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
              Create White Label Profile
            </h2>
            <p className='text-muted-foreground text-sm'>
              Customize brand logos, typography, metadata, and color themes with
              live preview.
            </p>
          </div>
        </div>

        <WhiteLabelForm
          isSubmitting={createMutation.isPending}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/white-labels')}
        />
      </Main>
    </>
  )
}
