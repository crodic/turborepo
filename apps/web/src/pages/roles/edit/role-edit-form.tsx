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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Main } from '@/components/layout/main'
import { useDataPermissionFormOptions } from '@/pages/permissions/queries'
import { apiEditRole } from '@/pages/roles/queries'
import { RolePermissionsField } from '../components/role-permissions-field'
import {
  DomainType,
  isProtectedRole,
  roleFormSchema,
  type RoleFormSchema,
  type RoleSchema,
} from '../schema'

export function RoleEditForm({ data }: { data: RoleSchema }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const isProtected = isProtectedRole(data)

  const form = useForm<RoleFormSchema>({
    defaultValues: {
      name: data.name,
      domain: data.domain ?? DomainType.ADMIN,
      description: data.description,
      permissionIds:
        data.permissionIds?.length > 0
          ? data.permissionIds
          : data.permissionDetails.map((permission) => permission.id),
    },
    resolver: zodResolver(roleFormSchema),
  })

  const selectedDomain = form.watch('domain')
  const permissionsQuery = useDataPermissionFormOptions(selectedDomain)

  const editRoleMutation = useMutation({
    mutationFn: apiEditRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role'] })
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      toast.success(t('roles.message.updateRoleSuccess'))
      navigate(-1)
    },
    onError: (error) => {
      if (isAxiosError(error)) {
        toast.error(error?.response?.data?.message || 'Failed to update role')
      }
    },
  })

  const onSubmit = (values: RoleFormSchema) => {
    if (isProtected) {
      toast.error(t('roles.message.systemRoleCannotBeUpdated'))
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
        message: t('roles.message.invalidPermission'),
      })
      toast.error(t('roles.message.invalidPermission'))
      return
    }

    if (data.id) {
      editRoleMutation.mutate({ id: data.id, data: values })
    }
  }

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
              {isProtected && (
                <div className='rounded-md border border-amber-500/30 bg-amber-500/10 p-4 text-sm font-medium text-amber-600 md:col-span-3 dark:text-amber-400'>
                  {t('roles.systemRoleAlert')}
                </div>
              )}

              {/* Name */}
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem className='md:col-span-2'>
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

              {/* Domain */}
              <FormField
                control={form.control}
                name='domain'
                render={({ field }) => (
                  <FormItem className='md:col-span-1'>
                    <FormLabel required>{t('roles.edit.domain')}</FormLabel>
                    <Select
                      onValueChange={(val) => {
                        field.onChange(val)
                        form.setValue('permissionIds', [], {
                          shouldValidate: true,
                        })
                      }}
                      value={field.value}
                      disabled={isProtected}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t('roles.domain.placeholder')}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={DomainType.ADMIN}>
                          {t('roles.domain.admin')}
                        </SelectItem>
                        <SelectItem value={DomainType.CLIENT}>
                          {t('roles.domain.client')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
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
