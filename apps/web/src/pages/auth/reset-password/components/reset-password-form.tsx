import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
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
import { apiResetPassword } from '../../queries'
import { resetPasswordSchema, type ResetPasswordSchema } from '../../schema'

type ResetPasswordFormProps = React.HTMLAttributes<HTMLFormElement>

export function ResetPasswordForm({
  className,
  ...props
}: ResetPasswordFormProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') as string
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<ResetPasswordSchema>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  })

  function onSubmit(data: ResetPasswordSchema) {
    setIsLoading(true)
    toast.promise(apiResetPassword(data, token), {
      loading: 'Waiting...',
      success: () => {
        setIsLoading(false)
        form.reset()
        navigate(`/sign-in`)
        return `Reset password successfully.`
      },
      error: 'Error',
    })
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('grid gap-2', className)}
        {...props}
      >
        <FormField
          control={form.control}
          name='newPassword'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('auth.resetPassword.password')}</FormLabel>
              <FormControl>
                <PasswordInput
                  placeholder='************'
                  autoComplete='new-password'
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='confirmPassword'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('auth.resetPassword.confirmPassword')}</FormLabel>
              <FormControl>
                <PasswordInput
                  placeholder='************'
                  autoComplete='new-password'
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type='submit' disabled={isLoading} className='mt-2'>
          {isLoading
            ? t('auth.resetPassword.buttonResetting')
            : t('auth.resetPassword.buttonReset')}
        </Button>
      </form>
    </Form>
  )
}
