import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Loader2, LogIn, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
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
import { Input } from '@/components/ui/input'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp'
import { PasswordInput } from '@/components/password-input'
import { apiLogin, apiVerifyTwoFactorLogin } from '../queries'
import {
  loginSchema,
  twoFactorLoginSchema,
  type LoginSchema,
  type TwoFactorLoginSchema,
} from '../schema'

interface UserAuthFormProps extends React.HTMLAttributes<HTMLFormElement> {
  redirectTo?: string
}

export function UserAuthForm({
  className,
  redirectTo,
  ...props
}: UserAuthFormProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [twoFactorToken, setTwoFactorToken] = useState<string | null>(null)
  const [pendingUserId, setPendingUserId] = useState<string | null>(null)
  const [twoFactorFocusNonce, setTwoFactorFocusNonce] = useState(0)

  function completeLogin(payload: {
    accessToken?: string
    refreshToken?: string
    userId: string
  }) {
    if (!payload.accessToken || !payload.refreshToken) {
      toast.error('Login response is missing tokens.')
      return
    }

    login({
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
      id: payload.userId,
    })

    const targetPath = redirectTo || '/'
    navigate(targetPath, { replace: true })

    toast.success('Welcome back!')
  }

  const loginMutation = useMutation({
    mutationFn: apiLogin,
    onSuccess: (payload) => {
      if (payload.twoFactorRequired && payload.twoFactorToken) {
        setTwoFactorToken(payload.twoFactorToken)
        setPendingUserId(payload.userId)
        twoFactorForm.reset({ code: '' })
        toast.info('Enter your two-factor authentication code.')
        return
      }

      completeLogin(payload)
    },
    onError: () => {
      toast.error('Login failed. Please try again.')
    },
  })

  const verifyTwoFactorMutation = useMutation({
    mutationFn: apiVerifyTwoFactorLogin,
    onSuccess: (payload) => {
      completeLogin(payload)
    },
    onError: () => {
      twoFactorForm.reset({ code: '' })
      twoFactorForm.setError('code', {
        type: 'server',
        message: 'Invalid two-factor code. Please try again.',
      })
      setTwoFactorFocusNonce((value) => value + 1)
      toast.error('Invalid two-factor code. Please try again.')
    },
  })

  const form = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const twoFactorForm = useForm<TwoFactorLoginSchema>({
    resolver: zodResolver(twoFactorLoginSchema),
    defaultValues: {
      code: '',
    },
  })

  function onSubmit(data: LoginSchema) {
    loginMutation.mutate(data)
  }

  function onTwoFactorSubmit(data: TwoFactorLoginSchema) {
    if (!twoFactorToken) return

    verifyTwoFactorMutation.mutate({
      ...data,
      twoFactorToken,
    })
  }

  useEffect(() => {
    if (import.meta.env.DEV) {
      form.reset({
        email: 'admin@email.com',
        password: 'admin@2025',
      })
    }
  }, [form])

  if (twoFactorToken) {
    return (
      <TwoFactorForm
        className={className}
        formProps={props}
        form={twoFactorForm}
        isPending={verifyTwoFactorMutation.isPending}
        pendingUserId={pendingUserId}
        focusNonce={twoFactorFocusNonce}
        onSubmit={onTwoFactorSubmit}
        onBack={() => {
          setTwoFactorToken(null)
          setPendingUserId(null)
          twoFactorForm.reset()
        }}
      />
    )
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('grid gap-3', className)}
        {...props}
      >
        <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('auth.signIn.email')}</FormLabel>
              <FormControl>
                <Input placeholder='name@example.com' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='password'
          render={({ field }) => (
            <FormItem className='relative'>
              <FormLabel>{t('auth.signIn.password')}</FormLabel>
              <FormControl>
                <PasswordInput placeholder='********' {...field} />
              </FormControl>
              <FormMessage />
              <Link
                to='/forgot-password'
                className='text-muted-foreground absolute end-0 -top-0.5 text-sm font-medium hover:opacity-75'
              >
                {t('auth.signIn.messageForgotPassword')}
              </Link>
            </FormItem>
          )}
        />
        <Button className='mt-2' disabled={loginMutation.isPending}>
          {loginMutation.isPending ? (
            <Loader2 className='animate-spin' />
          ) : (
            <LogIn />
          )}
          {t('auth.signIn.messageSignIn')}
        </Button>
      </form>
    </Form>
  )
}

function TwoFactorForm({
  className,
  formProps,
  form,
  isPending,
  pendingUserId,
  focusNonce,
  onSubmit,
  onBack,
}: {
  className?: string
  formProps: React.HTMLAttributes<HTMLFormElement>
  form: ReturnType<typeof useForm<TwoFactorLoginSchema>>
  isPending: boolean
  pendingUserId: string | null
  focusNonce: number
  onSubmit: (data: TwoFactorLoginSchema) => void
  onBack: () => void
}) {
  const { t } = useTranslation()
  const [useBackupCode, setUseBackupCode] = useState(false)
  const [validationFocusNonce, setValidationFocusNonce] = useState(0)
  const codeInputContainerRef = useRef<HTMLDivElement>(null)

  function focusCodeInput() {
    queueMicrotask(() => {
      codeInputContainerRef.current?.querySelector('input')?.focus()
    })
  }

  useEffect(() => {
    focusCodeInput()
  }, [focusNonce, useBackupCode, validationFocusNonce])

  function submitOtpCode(code: string) {
    if (isPending || useBackupCode || code.length !== 6) {
      return
    }

    queueMicrotask(() => {
      void form.handleSubmit(onSubmit, () => {
        setValidationFocusNonce((value) => value + 1)
      })()
    })
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit, () => {
          setValidationFocusNonce((value) => value + 1)
        })}
        className={cn('grid gap-4', className)}
        {...formProps}
      >
        <div className='bg-muted/40 rounded-lg border p-4'>
          <div className='flex items-start gap-3'>
            <div className='bg-primary/10 text-primary rounded-md p-2'>
              <ShieldCheck className='size-4' />
            </div>
            <div className='space-y-1'>
              <p className='text-sm font-medium'>{t('auth.twoFactor.title')}</p>
              <p className='text-muted-foreground text-sm'>
                {t('auth.twoFactor.description')}
              </p>
              {pendingUserId ? (
                <p className='text-muted-foreground text-xs'>
                  {t('auth.twoFactor.pendingUser', { id: pendingUserId })}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <FormField
          control={form.control}
          name='code'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('auth.twoFactor.code')}</FormLabel>
              <div ref={codeInputContainerRef}>
                <FormControl>
                  {useBackupCode ? (
                    <Input
                      autoFocus
                      autoComplete='one-time-code'
                      placeholder='Backup code'
                      maxLength={16}
                      disabled={isPending}
                      value={field.value ?? ''}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                      onChange={(event) =>
                        field.onChange(
                          event.target.value
                            .replace(/\s+/g, '')
                            .replace(/-/g, '')
                            .toUpperCase()
                        )
                      }
                    />
                  ) : (
                    <InputOTP
                      autoFocus
                      maxLength={6}
                      value={field.value ?? ''}
                      onChange={(value) => {
                        const code = value.replace(/\D/g, '').slice(0, 6)
                        field.onChange(code)
                        submitOtpCode(code)
                      }}
                      disabled={isPending}
                      autoComplete='one-time-code'
                      containerClassName='justify-center'
                    >
                      <InputOTPGroup>
                        {Array.from({ length: 6 }).map((_, index) => (
                          <InputOTPSlot key={index} index={index} />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  )}
                </FormControl>
              </div>
              <p className='text-muted-foreground text-xs'>
                {useBackupCode
                  ? 'Enter one of your saved backup codes.'
                  : 'Use the 6-digit code from your authenticator app.'}
              </p>
              <FormMessage className='text-xs' />
            </FormItem>
          )}
        />

        <Button
          type='button'
          variant='link'
          className='h-auto justify-self-center p-0 text-xs'
          disabled={isPending}
          onClick={() => {
            form.setValue('code', '', {
              shouldDirty: true,
              shouldTouch: false,
              shouldValidate: false,
            })
            setUseBackupCode((value) => !value)
          }}
        >
          {useBackupCode
            ? 'Use authenticator app code'
            : 'Use a backup code instead'}
        </Button>

        <Button disabled={isPending}>
          {isPending ? <Loader2 className='animate-spin' /> : <ShieldCheck />}
          {t('auth.twoFactor.buttonVerify')}
        </Button>

        <Button
          type='button'
          variant='ghost'
          disabled={isPending}
          onClick={onBack}
        >
          {t('auth.twoFactor.buttonBack')}
        </Button>
      </form>
    </Form>
  )
}
