import { useMutation } from '@tanstack/react-query'
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
import { CmsPageForm } from '../cms-page-form'
import { apiUpdateCmsPage, useDataCmsPageById } from '../queries'
import type { CmsPageFormSchema } from '../schema'

export function PageCmsPageEdit() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { data, isFetching } = useDataCmsPageById(id ?? '')
  const mutation = useMutation({
    mutationFn: apiUpdateCmsPage,
    onSuccess: (page) => {
      toast.success('Page updated successfully')
      navigate(`/cms-pages/${page.id}/show`)
    },
    onError: () => toast.error('Could not update page'),
  })

  if (isFetching) return <DataLoader />
  if (!id || !data) return <NotFoundError />

  const handleSubmit = (formData: CmsPageFormSchema) => {
    mutation.mutate({ id, data: formData })
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
          <h2 className='text-2xl font-bold tracking-tight'>Edit Page</h2>
          <p className='text-muted-foreground'>
            Update page content, status, and SEO metadata.
          </p>
        </div>
        <CmsPageForm
          initialData={data}
          isSubmitting={mutation.isPending}
          onSubmit={handleSubmit}
        />
      </Main>
    </>
  )
}
