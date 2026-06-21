import { useEffect } from 'react'
import { isAxiosError } from 'axios'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeftIcon, SaveIcon } from 'lucide-react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ConfigDrawer } from '@/components/config-drawer'
import DataLoader from '@/components/layout/data-loader'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { NotFoundError } from '@/pages/errors/not-found-error'
import { apiEditPermission, useDataPermissionEdit } from '../queries'
import { permissionFormSchema, type PermissionFormSchema } from '../schema'

export function PagePermissionEdit() {
  const params = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data, isFetching } = useDataPermissionEdit(params.id as string)

  const form = useForm<PermissionFormSchema>({
    resolver: zodResolver(permissionFormSchema),
    defaultValues: {
      group: '',
      description: '',
    },
  })

  useEffect(() => {
    if (!data) return

    form.reset({
      group: data.group,
      description: data.description ?? '',
    })
  }, [data, form])

  const editPermissionMutation = useMutation({
    mutationFn: apiEditPermission,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] })
      queryClient.invalidateQueries({ queryKey: ['permission', params.id] })
      queryClient.invalidateQueries({ queryKey: ['permission_form_options'] })
      toast.success('Permission metadata updated successfully')
      navigate(-1)
    },
    onError: (error) => {
      if (isAxiosError(error)) {
        toast.error(
          error.response?.data?.message || 'Failed to update permission'
        )
      }
    },
  })

  const onSubmit = (values: PermissionFormSchema) => {
    if (!data) return

    editPermissionMutation.mutate({ id: data.id, data: values })
  }

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

      <Main>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
            <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
              <div>
                <h1 className='text-2xl font-bold tracking-tight'>
                  Edit Permission Metadata
                </h1>
                <p className='text-muted-foreground font-mono text-sm'>
                  {data.key}
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
                <Button
                  type='submit'
                  disabled={editPermissionMutation.isPending}
                >
                  <SaveIcon className='size-4' />
                  Save
                </Button>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{data.name}</CardTitle>
                <CardDescription>
                  Only group and description are editable. The permission key
                  and name are synced from source code.
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-6'>
                <FormField
                  control={form.control}
                  name='group'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Group</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder='Permission group' />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='description'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value ?? ''}
                          placeholder='Describe what this permission allows'
                          rows={5}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </form>
        </Form>
      </Main>
    </>
  )
}
