import { isAxiosError } from 'axios'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeftIcon, SaveIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Form,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Main } from '@/components/layout/main'
import { useDataPermissionFormOptions } from '@/pages/permissions/queries'
import { apiEditRole } from '@/pages/roles/queries'
import { RolePermissionsField } from '../components/role-permissions-field'
import {
  isProtectedRole,
  roleFormSchema,
  type RoleFormSchema,
  type RoleSchema,
} from '../schema'

export function RoleEditForm({ data }: { data: RoleSchema }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const form = useForm<RoleFormSchema>({
    defaultValues: {
      name: data.name,
      description: data.description,
      permissionIds:
        data.permissionIds?.length > 0
          ? data.permissionIds
          : data.permissionDetails.map((permission) => permission.id),
    },
    resolver: zodResolver(roleFormSchema),
  })

  const permissionsQuery = useDataPermissionFormOptions()

  const editRoleMutation = useMutation({
    mutationFn: apiEditRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role'] })
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      toast.success('Role updated successfully')
      navigate(-1)
    },
    onError: (error) => {
      if (isAxiosError(error)) {
        toast.error(error?.response?.data?.message || 'Failed to update role')
      }
    },
  })

  const onSubmit = (values: RoleFormSchema) => {
    if (isProtectedRole(data)) {
      toast.error('System roles cannot be updated')
      return
    }

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

    if (data.id) {
      editRoleMutation.mutate({ id: data.id, data: values })
    }
  }

  const isProtected = isProtectedRole(data)

  return (
    <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-8'>
          <div className='mb-2 flex flex-col items-baseline justify-between space-y-2 sm:flex-row sm:items-center'>
            <h2 className='text-2xl font-bold tracking-tight'>
              {t('roles.edit.title')}
            </h2>
            <div className='flex w-full flex-wrap justify-end gap-2 sm:block sm:w-auto sm:justify-normal sm:space-x-2'>
              <Button
                variant='outline'
                type='button'
                onClick={() => navigate(-1)}
              >
                <ArrowLeftIcon className='h-4 w-4' />
                {t('buttons.cancel')}
              </Button>
              <Button
                type='submit'
                disabled={
                  isProtected ||
                  editRoleMutation.isPending ||
                  permissionsQuery.isLoading ||
                  permissionsQuery.isError
                }
              >
                <SaveIcon className='h-4 w-4' />
                {t('buttons.save')}
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('roles.edit.title')}</CardTitle>
              <CardDescription>{t('roles.edit.description')}</CardDescription>
            </CardHeader>
            <CardContent className='mt-4 flex flex-col gap-4 sm:gap-8 md:grid md:grid-cols-3'>
              {/* Name */}
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem className='md:col-span-3'>
                    <FormLabel required>{t('roles.edit.name')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t('roles.edit.name')}
                        disabled={isProtected}
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
                disabled={isProtected || editRoleMutation.isPending}
              />
            </CardContent>
          </Card>
        </form>
      </Form>
    </Main>
  )
}
