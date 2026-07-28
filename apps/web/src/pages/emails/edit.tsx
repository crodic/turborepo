import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { ConfigDrawer } from '@/components/config-drawer'
import DataLoader from '@/components/layout/data-loader'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { NotFoundError } from '@/pages/errors/not-found-error'
import { EmailForm } from './email-form'
import { apiUpdateEmail, useDataMyEmailDetail } from './queries'
import { type EmailFormSchema } from './schema'

export function PageEmailEdit() {
  const params = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const id = params.id as string
  const { data: email, isFetching } = useDataMyEmailDetail(id)

  const updateMutation = useMutation({
    mutationFn: (data: EmailFormSchema) => apiUpdateEmail({ id, data }),
    onSuccess: () => {
      toast.success('Email campaign updated successfully.')
      queryClient.invalidateQueries({ queryKey: ['emails'] })
      queryClient.invalidateQueries({ queryKey: ['emails', id] })
      navigate('/emails')
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'Failed to update email campaign.'
      )
    },
  })

  function submitEmail(form: EmailFormSchema) {
    updateMutation.mutate(form)
  }

  if (isFetching) return <DataLoader />
  if (!email) return <NotFoundError />

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
              Edit Email Campaign
            </h2>
            <p className='text-muted-foreground'>
              Update the scheduled email campaign.
            </p>
          </div>
        </div>

        <div className='max-w-4xl pt-4'>
          <EmailForm
            email={email}
            isPending={updateMutation.isPending}
            onSubmit={submitEmail}
            onCancel={() => navigate('/emails')}
          />
        </div>
      </Main>
    </>
  )
}
