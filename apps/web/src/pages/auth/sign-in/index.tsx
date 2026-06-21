import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AuthLayout } from '../auth-layout'
import { UserAuthForm } from './user-auth-form'

export function SignIn() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'
  const verification = searchParams.get('verification')
  const handledVerificationRef = useRef<string | null>(null)

  useEffect(() => {
    if (
      !verification ||
      handledVerificationRef.current === verification ||
      (verification !== 'success' && verification !== 'failed')
    ) {
      return
    }

    handledVerificationRef.current = verification

    if (verification === 'success') {
      toast.success(t('auth.signIn.messageVerifySuccess'))
    }

    if (verification === 'failed') {
      toast.error(t('auth.signIn.messageVerifyFailed'))
    }

    const nextSearchParams = new URLSearchParams(searchParams)

    nextSearchParams.delete('verification')
    setSearchParams(nextSearchParams, { replace: true })
  }, [searchParams, setSearchParams, t, verification])

  return (
    <AuthLayout>
      <Card className='gap-4'>
        <CardHeader>
          <CardTitle className='text-lg tracking-tight'>
            {t('auth.signIn.title')}
          </CardTitle>
          <CardDescription>{t('auth.signIn.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <UserAuthForm redirectTo={redirect} />
        </CardContent>
        <CardFooter>
          <p className='text-muted-foreground px-8 text-center text-sm'>
            By clicking sign in, you agree to our{' '}
            <a
              href='/terms'
              className='hover:text-primary underline underline-offset-4'
            >
              Terms of Service
            </a>{' '}
            and{' '}
            <a
              href='/privacy'
              className='hover:text-primary underline underline-offset-4'
            >
              Privacy Policy
            </a>
            .
          </p>
        </CardFooter>
      </Card>
    </AuthLayout>
  )
}
