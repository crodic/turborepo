import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { CmsPageForm } from '../cms-page-form'
import { apiCreateCmsPage } from '../queries'
import type { CmsPageFormSchema } from '../schema'

export function PageCmsPageCreate() {
  const navigate = useNavigate()
  const mutation = useMutation({
    mutationFn: apiCreateCmsPage,
    onSuccess: (page) => {
      toast.success('Page created successfully')
      navigate(`/cms-pages/${page.id}/show`)
    },
    onError: () => toast.error('Could not create page'),
  })

  const handleSubmit = (data: CmsPageFormSchema) => {
    mutation.mutate(data)
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
      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>Create Page</h2>
          <p className='text-muted-foreground'>
            Create a dynamic client page with UI Builder compatible JSON.
          </p>
        </div>
        <CmsPageForm
          isSubmitting={mutation.isPending}
          onSubmit={handleSubmit}
        />
      </Main>
    </>
  )
}
