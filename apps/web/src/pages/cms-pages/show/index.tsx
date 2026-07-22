import { useState } from 'react'
import { format } from 'date-fns'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeftIcon,
  EditIcon,
  ExternalLinkIcon,
  TrashIcon,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DeleteAlertDialog } from '@/components/common/delete-alert-dialog'
import { DescriptionItem } from '@/components/common/descriptions'
import { ConfigDrawer } from '@/components/config-drawer'
import DataLoader from '@/components/layout/data-loader'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { NotFoundError } from '@/pages/errors/not-found-error'
import { apiDeleteCmsPage, useDataCmsPageById } from '../queries'

export function PageCmsPageShow() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { id } = useParams()
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const { data, isFetching } = useDataCmsPageById(id ?? '')
  const deleteMutation = useMutation({
    mutationFn: apiDeleteCmsPage,
    onSuccess: () => {
      toast.success('Page deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['cms-pages'] })
      navigate('/cms-pages')
    },
    onError: () => toast.error('Could not delete page'),
  })

  if (isFetching) return <DataLoader />
  if (!id || !data) return <NotFoundError />

  return (
    <>
      <DeleteAlertDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        handleDelete={() => deleteMutation.mutate(id)}
        isLoading={deleteMutation.isPending}
      />
      <Header fixed>
        <div className='ms-auto flex items-center space-x-4'>
          <Search />
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>
      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>{data.title}</h2>
            <p className='text-muted-foreground'>
              /{data.slug} ({data.locale})
            </p>
          </div>
          <div className='flex flex-wrap gap-2'>
            <Button variant='outline' onClick={() => navigate(-1)}>
              <ArrowLeftIcon className='h-4 w-4' />
              Back
            </Button>
            <Button variant='outline' asChild>
              <a
                href={`${import.meta.env.VITE_CLIENT_URL || 'http://localhost:3000'}/page/${data.slug}`}
                target='_blank'
                rel='noreferrer'
              >
                <ExternalLinkIcon className='h-4 w-4' />
                Open
              </a>
            </Button>
            <Button onClick={() => navigate(`/cms-pages/${data.id}/edit`)}>
              <EditIcon className='h-4 w-4' />
              Edit
            </Button>
            <Button variant='destructive' onClick={() => setIsDeleteOpen(true)}>
              <TrashIcon className='h-4 w-4' />
              Delete
            </Button>
          </div>
        </div>

        <div className='grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]'>
          <Card className='h-max'>
            <CardHeader>
              <CardTitle>Page details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='flex flex-col gap-2'>
                <DescriptionItem label='Status' value={data.status} />
                <DescriptionItem
                  label='Published At'
                  value={
                    data.publishedAt
                      ? format(data.publishedAt, 'dd/MM/yyyy HH:mm aa')
                      : 'Not published'
                  }
                />
                <DescriptionItem
                  label='SEO Title'
                  value={data.seoTitle || '-'}
                />
                <DescriptionItem
                  label='SEO Description'
                  value={data.seoDescription || '-'}
                />
                <DescriptionItem
                  label='Updated At'
                  value={format(data.updatedAt, 'dd/MM/yyyy HH:mm aa')}
                />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='overflow-auto rounded-md border bg-white p-4 dark:bg-black'>
                <div
                  className='prose dark:prose-invert max-w-none'
                  dangerouslySetInnerHTML={{ __html: data.content }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  )
}
