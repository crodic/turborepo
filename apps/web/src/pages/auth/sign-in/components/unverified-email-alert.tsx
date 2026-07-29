import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { apiResendVerifyEmail } from '../../queries'

interface UnverifiedEmailAlertProps {
  email: string
}

export function UnverifiedEmailAlert({ email }: UnverifiedEmailAlertProps) {
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => setCooldown((prev) => prev - 1), 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  const resendMutation = useMutation({
    mutationFn: () => apiResendVerifyEmail({ email }),
    onSuccess: () => {
      toast.success('Verification email sent! Please check your inbox.')
      setCooldown(60) // 60 seconds cooldown to prevent spam
    },
    onError: () => {
      toast.error('Failed to send verification email. Please try again.')
    },
  })

  return (
    <Alert variant='destructive' className='mb-4'>
      <AlertCircle className='h-4 w-4' />
      <AlertTitle>Email not verified</AlertTitle>
      <AlertDescription className='mt-2 flex flex-col items-start gap-2'>
        <p>Your account has not been verified yet. Please check your inbox.</p>
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
            ? `Resend in ${cooldown}s`
            : 'Resend verification email'}
        </Button>
      </AlertDescription>
    </Alert>
  )
}
