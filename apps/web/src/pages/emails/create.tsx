import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { EmailForm } from './email-form'
import { apiCreateEmail } from './queries'
import { type EmailFormSchema } from './schema'

export function PageEmailCreate() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: apiCreateEmail,
    onSuccess: () => {
      toast.success('Email campaign created successfully.')
      queryClient.invalidateQueries({ queryKey: ['emails'] })
      navigate('/emails')
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'Failed to create email campaign.'
      )
    },
  })

  function submitEmail(form: EmailFormSchema) {
    createMutation.mutate(form)
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

      <Main>
        <div className='mb-2 flex items-center justify-between space-y-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>
              Create Email Campaign
            </h2>
            <p className='text-muted-foreground'>
              Draft and send a new email campaign.
            </p>
          </div>
        </div>

        <div className='max-w-4xl pt-4'>
          <EmailForm
            isPending={createMutation.isPending}
            onSubmit={submitEmail}
            onCancel={() => navigate('/emails')}
          />
        </div>
      </Main>
    </>
  )
}
