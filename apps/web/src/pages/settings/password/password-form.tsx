import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { restApiErrorHandler } from '@/lib/rest-api-handler'
import { showSubmittedData } from '@/lib/show-submitted-data'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { PasswordInput } from '@/components/password-input'
import { apiChangePassword } from '../queries'
import { passwordFormSchema, type PasswordFormSchema } from '../schema'

export default function PasswordForm() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const form = useForm<PasswordFormSchema>({
    resolver: zodResolver(passwordFormSchema),
    mode: 'onChange',
    defaultValues: {
      password: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  })

  const changePasswordMutation = useMutation({
    mutationFn: apiChangePassword,
    onSuccess: () => {
      toast.success('Password updated successfully')
      form.reset()
      queryClient.invalidateQueries({ queryKey: ['authenticated_user'] })
    },
    onError: restApiErrorHandler,
  })

  function onSubmit(data: PasswordFormSchema) {
    showSubmittedData(data)
    changePasswordMutation.mutate(data)
  }
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-8'>
        <div className='grid grid-cols-1 gap-4'>
          <FormField
            control={form.control}
            name='password'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('settings.password.currentPassword')}</FormLabel>
                <FormControl>
                  <PasswordInput placeholder='***************' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='newPassword'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('settings.password.newPassword')}</FormLabel>
                <FormControl>
                  <PasswordInput placeholder='**************' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='confirmNewPassword'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('settings.password.confirmPassword')}</FormLabel>
                <FormControl>
                  <PasswordInput placeholder='**************' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button type='submit'>{t('settings.password.buttonUpdate')}</Button>
      </form>
    </Form>
  )
}
