import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Loader2, AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { apiResendVerifyEmail } from '../../queries'

interface UnverifiedEmailAlertProps {
  email: string
}

export function UnverifiedEmailAlert({ email }: UnverifiedEmailAlertProps) {
  const { t } = useTranslation()
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => setCooldown((prev) => prev - 1), 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  const resendMutation = useMutation({
    mutationFn: () => apiResendVerifyEmail({ email }),
    onSuccess: () => {
      toast.success(
        t('auth.resendVerification.success', {
          defaultValue: 'Verification email sent! Please check your inbox.',
        })
      )
      setCooldown(60) // 60 seconds cooldown to prevent spam
    },
    onError: () => {
      toast.error(
        t('auth.resendVerification.error', {
          defaultValue: 'Failed to send verification email. Please try again.',
        })
      )
    },
  })

  return (
    <Alert variant='destructive' className='mb-4'>
      <AlertCircle className='h-4 w-4' />
      <AlertTitle>{t('auth.signIn.unverifiedAlertTitle')}</AlertTitle>
      <AlertDescription className='mt-2 flex flex-col items-start gap-2'>
        <p>{t('auth.signIn.unverifiedAlertDesc')}</p>
        <Button
          variant='outline'
          size='sm'
          className='border-destructive/20 hover:bg-destructive/10 mt-1 h-8'
          onClick={() => resendMutation.mutate()}
          disabled={resendMutation.isPending || cooldown > 0}
        >
          {resendMutation.isPending && (
            <Loader2 className='mr-2 size-3 animate-spin' />
          )}
          {cooldown > 0
            ? `${t('auth.signIn.resendIn', { defaultValue: 'Resend in' })} ${cooldown}s`
            : t('auth.signIn.resendButton')}
        </Button>
      </AlertDescription>
    </Alert>
  )
}
