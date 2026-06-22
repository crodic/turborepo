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
      <Main fixed fluid className='h-[calc(100svh-4rem)] min-h-0 p-0'>
        <CmsPageForm
          isSubmitting={mutation.isPending}
          onSubmit={handleSubmit}
        />
      </Main>
    </>
  )
}
