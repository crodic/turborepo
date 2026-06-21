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
  CardDescription,
  CardHeader,
  CardTitle,
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
import { Textarea } from '@/components/ui/textarea'
import AutoCompleteSelectControl from '@/components/forms/auto-complete-select-control'
import { DatePickerForm } from '@/components/forms/date-picker-form'
import { PhoneInput } from '@/components/forms/phone-input'
import { Main } from '@/components/layout/main'
import { useDataRoleFormOptions } from '@/pages/roles/queries'
import { apiEditAdmin } from '../queries'
import {
  adminEditSchema,
  type AdminEditSchema,
  type AdminSchema,
} from '../schema'

export function AdminEditForm({ data }: { data: AdminSchema }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { data: roles, isLoading } = useDataRoleFormOptions()

  const form = useForm<AdminEditSchema>({
    defaultValues: {
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      roleIds: data.roleIds,
      bio: data.bio,
      birthday: data.birthday || undefined,
      phone: data.phone || undefined,
    },
    resolver: zodResolver(adminEditSchema),
  })

  const editAdminMutation = useMutation({
    mutationFn: apiEditAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] })
      queryClient.invalidateQueries({ queryKey: ['admins'] })
      queryClient.invalidateQueries({ queryKey: ['admin'] })
      toast.success('Admin updated successfully')
      navigate(-1)
    },
    onError: (error) => {
      if (isAxiosError(error)) {
        toast.error(error?.response?.data?.message || 'Failed to update admin')
      }
    },
  })

  const onSubmit = (values: AdminEditSchema) => {
    if (data.id) {
      editAdminMutation.mutate({ id: data.id, data: values })
    }
  }

  return (
    <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-8'>
          <div className='mb-2 flex flex-col items-baseline justify-between space-y-2 sm:flex-row sm:items-center'>
            <div className='flex flex-row space-x-2'>
              <h2 className='text-2xl font-bold tracking-tight'>
                {t('adminUsers.edit.title')}
              </h2>
            </div>
            <div className='flex w-full flex-wrap justify-end gap-2 sm:block sm:w-auto sm:justify-normal sm:space-x-2'>
              <Button
                variant='outline'
                type='button'
                onClick={() => {
                  void navigate(-1)
                }}
              >
                <ArrowLeftIcon className='h-4 w-4' />
                {t('buttons.cancel')}
              </Button>
              <Button type='submit'>
                <SaveIcon className='h-4 w-4' />
                {t('buttons.save')}
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('adminUsers.edit.title')}</CardTitle>
              <CardDescription>
                {t('adminUsers.edit.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className='mt-4 flex flex-col gap-4 sm:gap-8 md:grid md:grid-cols-3'>
              <FormField
                control={form.control}
                name='firstName'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>
                      {t('adminUsers.edit.firstName')}
                    </FormLabel>
                    <FormControl>
                      <Input placeholder='John' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='lastName'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>
                      {t('adminUsers.edit.lastName')}
                    </FormLabel>
                    <FormControl>
                      <Input placeholder='Doe' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='phone'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('adminUsers.edit.phoneNumber')}</FormLabel>
                    <FormControl>
                      <PhoneInput
                        placeholder={t(
                          'adminUsers.edit.phoneNumberPlaceholder'
                        )}
                        defaultCountry='VN'
                        international
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='birthday'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('adminUsers.edit.birthday')}</FormLabel>
                    <FormControl>
                      <DatePickerForm
                        placeholder={t('adminUsers.edit.birthdayPlaceholder')}
                        field={field}
                        disabled={(date: Date) =>
                          date > new Date() || date < new Date('1900-01-01')
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='roleIds'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>{t('adminUsers.edit.role')}</FormLabel>
                    <FormControl>
                      <AutoCompleteSelectControl
                        {...field}
                        options={
                          roles?.map((c) => ({
                            id: c.id,
                            name: c.name,
                          })) || []
                        }
                        isClearable={false}
                        isMulti
                        isLoading={isLoading}
                        placeholder='Select role'
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className='col-span-3'>
                <FormField
                  control={form.control}
                  name='bio'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('adminUsers.edit.bio')}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t('adminUsers.edit.bioPlaceholder')}
                          onChange={field.onChange}
                          value={field.value || ''}
                        ></Textarea>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <div className='mb-2 flex flex-col items-baseline justify-between space-y-2 sm:flex-row sm:items-center'>
            <div className='flex flex-row space-x-2'></div>
            <div className='flex w-full flex-wrap justify-end gap-2 sm:block sm:w-auto sm:justify-normal sm:space-x-2'>
              <Button
                variant='outline'
                type='button'
                onClick={() => {
                  void navigate(-1)
                }}
              >
                <ArrowLeftIcon className='h-4 w-4' />
                {t('buttons.cancel')}
              </Button>
              <Button type='submit'>
                <SaveIcon className='h-4 w-4' />
                {t('buttons.save')}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </Main>
  )
}
