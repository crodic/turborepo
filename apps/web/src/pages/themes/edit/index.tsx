import { useEffect } from 'react'
import { isAxiosError } from 'axios'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeftIcon } from 'lucide-react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { cloneDefaultThemeStyles } from '@/lib/theme-builder/default-theme'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { ConfigDrawer } from '@/components/config-drawer'
import DataLoader from '@/components/layout/data-loader'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { NotFoundError } from '@/pages/errors/not-found-error'
import { ThemeForm } from '../components/theme-form'
import { apiEditTheme, themeQueryKeys, useDataThemeById } from '../queries'
import { themeFormSchema, type ThemeFormSchema } from '../schema'

export function PageThemeEdit() {
  const params = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const themeId = params.id as string
  const { data, isFetching } = useDataThemeById(themeId)

  const form = useForm<ThemeFormSchema>({
    resolver: zodResolver(themeFormSchema),
    defaultValues: {
      name: '',
      description: '',
      styles: cloneDefaultThemeStyles(),
      status: 'draft',
    },
  })

  useEffect(() => {
    if (!data) return

    form.reset({
      name: data.name,
      description: data.description ?? '',
      styles: data.styles,
      status: data.status,
    })
  }, [data, form])

  const editMutation = useMutation({
    mutationFn: apiEditTheme,
    onSuccess: (theme) => {
      queryClient.invalidateQueries({ queryKey: themeQueryKeys.all })
      queryClient.invalidateQueries({
        queryKey: themeQueryKeys.detail(theme.id),
      })
      toast.success('Theme updated successfully')
    },
    onError: (error) => {
      toast.error(
        isAxiosError(error)
          ? error.response?.data?.message || 'Failed to update theme'
          : 'Failed to update theme'
      )
    },
  })

  if (isFetching) return <DataLoader />
  if (!data) return <NotFoundError />

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

      <Main fluid>
        <Form {...form}>
          <div className='space-y-5'>
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <div>
                <h1 className='text-2xl font-bold tracking-tight'>
                  Edit Theme
                </h1>
                <p className='text-muted-foreground font-mono text-sm'>
                  {data.slug}
                </p>
              </div>
              <div className='flex items-center gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => navigate(-1)}
                >
                  <ArrowLeftIcon className='size-4' />
                  Back
                </Button>
              </div>
            </div>
            <ThemeForm
              form={form}
              submitLabel='Update theme'
              isSubmitting={editMutation.isPending}
              onSubmit={(values) =>
                editMutation.mutateAsync({ id: themeId, data: values })
              }
            />
          </div>
        </Form>
      </Main>
    </>
  )
}
