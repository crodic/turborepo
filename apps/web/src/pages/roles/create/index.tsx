import { isAxiosError } from 'axios'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeftIcon, SaveIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { useDataPermissionFormOptions } from '@/pages/permissions/queries'
import { RolePermissionsField } from '../components/role-permissions-field'
import { apiCreateRole } from '../queries'
import { roleFormSchema, type RoleFormSchema } from '../schema'

export default function PageRoleCreate() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const form = useForm<RoleFormSchema>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      name: '',
      permissionIds: [],
    },
  })

  const permissionsQuery = useDataPermissionFormOptions()

  const createRoleMutate = useMutation({
    mutationFn: apiCreateRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      toast.success('Role created successfully')
      navigate('/roles')
    },
    onError: (error) => {
      if (isAxiosError(error)) toast.error(error.response?.data.message)
    },
  })

  const onSubmit = (values: RoleFormSchema) => {
    const assignablePermissionIds = new Set(
      (permissionsQuery.data ?? []).map((permission) => permission.id)
    )

    if (
      values.permissionIds.some(
        (permissionId) => !assignablePermissionIds.has(permissionId)
      )
    ) {
      form.setError('permissionIds', {
        message: 'Invalid permission selected',
      })
      toast.error('Invalid permission selected')
      return
    }

    createRoleMutate.mutate(values)
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
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-8'>
            <div className='flex items-center justify-between'>
              <h3 className='text-2xl font-bold'>{t('roles.create.title')}</h3>
              <div className='flex items-center gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => navigate(-1)}
                >
                  <ArrowLeftIcon size={16} />
                  {t('buttons.cancel')}
                </Button>
                <Button
                  type='submit'
                  disabled={
                    createRoleMutate.isPending ||
                    permissionsQuery.isLoading ||
                    permissionsQuery.isError
                  }
                >
                  <SaveIcon size={16} />
                  {t('buttons.save')}
                </Button>
              </div>
            </div>

            <Card>
              <CardContent className='grid grid-cols-1 items-start gap-8 md:grid-cols-3'>
                <FormField
                  control={form.control}
                  name='name'
                  render={({ field }) => (
                    <FormItem className='md:col-span-3'>
                      <FormLabel required>{t('roles.create.name')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t('roles.create.name')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <RolePermissionsField
                  form={form}
                  permissions={permissionsQuery.data ?? []}
                  isLoading={permissionsQuery.isLoading}
                  isError={permissionsQuery.isError}
                  disabled={createRoleMutate.isPending}
                />
              </CardContent>
            </Card>
          </form>
        </Form>
      </Main>
    </>
  )
}
