import { isAxiosError } from 'axios'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeftIcon } from 'lucide-react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { cloneDefaultThemeStyles } from '@/lib/theme-builder/default-theme'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ThemeForm } from '../components/theme-form'
import { apiCreateTheme, themeQueryKeys } from '../queries'
import { themeFormSchema, type ThemeFormSchema } from '../schema'

export function PageThemeCreate() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const form = useForm<ThemeFormSchema>({
    resolver: zodResolver(themeFormSchema),
    defaultValues: {
      name: '',
      description: '',
      styles: cloneDefaultThemeStyles(),
      status: 'draft',
    },
  })

  const createMutation = useMutation({
    mutationFn: apiCreateTheme,
    onSuccess: (theme) => {
      queryClient.invalidateQueries({ queryKey: themeQueryKeys.all })
      toast.success('Theme created successfully')
      navigate(`/themes/${theme.id}/edit`)
    },
    onError: (error) => {
      toast.error(
        isAxiosError(error)
          ? error.response?.data?.message || 'Failed to create theme'
          : 'Failed to create theme'
      )
    },
  })

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
                  Create Theme
                </h1>
                <p className='text-muted-foreground'>
                  Build a runtime theme from TweakCN-compatible tokens.
                </p>
              </div>
              <div className='flex items-center gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => navigate(-1)}
                >
                  <ArrowLeftIcon className='size-4' />
                  Cancel
                </Button>
              </div>
            </div>
            <ThemeForm
              form={form}
              submitLabel='Save theme'
              isSubmitting={createMutation.isPending}
              onSubmit={(values) => createMutation.mutateAsync(values)}
            />
          </div>
        </Form>
      </Main>
    </>
  )
}
