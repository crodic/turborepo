import { isAxiosError } from 'axios'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { showSubmittedData } from '@/lib/show-submitted-data'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { DatePickerForm } from '@/components/forms/date-picker-form'
import { PhoneInput } from '@/components/forms/phone-input'
import { type AdminSchema } from '@/pages/admins/schema'
import { apiUpdateCurrentAccount } from '@/pages/auth/queries'
import { accountFormSchema, type AccountFormSchema } from '../schema'

export function AccountForm({ user }: { user: AdminSchema }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const form = useForm<AccountFormSchema>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      firstName: user.firstName,
      lastName: user.lastName,
      birthday: user?.birthday,
      phone: user?.phone ?? undefined,
    },
  })

  const updateMeMutation = useMutation({
    mutationFn: apiUpdateCurrentAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['authenticated_user'] })
    },
    onError: (error) => {
      if (isAxiosError(error)) {
        toast.error(error?.response?.data?.message || 'Failed to update admin')
      }
    },
  })

  function onSubmit(data: AccountFormSchema) {
    showSubmittedData(data)
    updateMeMutation.mutate(data)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-8'>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          <FormField
            control={form.control}
            name='firstName'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('settings.account.firstName')}</FormLabel>
                <FormControl>
                  <Input placeholder={user.firstName} {...field} />
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
                <FormLabel>{t('settings.account.lastName')}</FormLabel>
                <FormControl>
                  <Input placeholder={user.lastName} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name='birthday'
          render={({ field }) => (
            <FormItem className='flex flex-col'>
              <FormLabel>{t('settings.account.birthday')}</FormLabel>
              <DatePickerForm
                field={field}
                disabled={(date: Date) =>
                  date > new Date() || date < new Date('1900-01-01')
                }
              />
              <FormDescription>
                {t('settings.account.messageBirthdayDescription')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='phone'
          render={({ field }) => (
            <FormItem className='flex flex-col'>
              <FormLabel>{t('settings.account.phoneNumber')}</FormLabel>
              <FormControl>
                <PhoneInput
                  placeholder={
                    user.phone || t('settings.account.phoneNumberPlaceholder')
                  }
                  defaultCountry='VN'
                  international
                  {...field}
                />
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        />
        <Button type='submit'>{t('settings.account.buttonUpdate')}</Button>
      </form>
    </Form>
  )
}
