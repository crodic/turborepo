import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import {
  CheckCircle2,
  KeyRound,
  Loader2,
  LogIn,
  Mail,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
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
import {
  apiLogin,
  apiVerifySuspiciousLogin,
  apiVerifyTwoFactorLogin,
} from '../queries'
import {
  loginSchema,
  suspiciousLoginSchema,
  twoFactorLoginSchema,
  type LoginSchema,
  type SuspiciousLoginSchema,
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
  const [suspiciousLoginToken, setSuspiciousLoginToken] = useState<
    string | null
  >(null)
  const [suspiciousLoginMethods, setSuspiciousLoginMethods] = useState<
    string[]
  >([])
  const [suspiciousReasons, setSuspiciousReasons] = useState<string[]>([])
  const [suspiciousFocusNonce, setSuspiciousFocusNonce] = useState(0)

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
      if (payload.suspiciousLoginRequired && payload.suspiciousLoginToken) {
        setSuspiciousLoginToken(payload.suspiciousLoginToken)
        setSuspiciousLoginMethods(payload.suspiciousLoginMethods ?? ['email'])
        setSuspiciousReasons(payload.suspiciousReasons ?? [])
        setPendingUserId(payload.userId)
        suspiciousLoginForm.reset({
          method: 'email',
          code: '',
        })
        toast.info('Verify this unusual sign-in to continue.')
        return
      }

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

  const verifySuspiciousLoginMutation = useMutation({
    mutationFn: apiVerifySuspiciousLogin,
    onSuccess: (payload) => {
      completeLogin(payload)
    },
    onError: () => {
      suspiciousLoginForm.setValue('code', '', {
        shouldDirty: true,
        shouldValidate: false,
      })
      suspiciousLoginForm.setError('code', {
        type: 'server',
        message: 'Invalid verification code. Please try again.',
      })
      setSuspiciousFocusNonce((value) => value + 1)
      toast.error('Invalid verification code. Please try again.')
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

  const suspiciousLoginForm = useForm<SuspiciousLoginSchema>({
    resolver: zodResolver(suspiciousLoginSchema),
    defaultValues: {
      method: 'email',
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

  function onSuspiciousLoginSubmit(data: SuspiciousLoginSchema) {
    if (!suspiciousLoginToken) return

    verifySuspiciousLoginMutation.mutate({
      ...data,
      suspiciousLoginToken,
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

  if (suspiciousLoginToken) {
    return (
      <SuspiciousLoginForm
        className={className}
        formProps={props}
        form={suspiciousLoginForm}
        methods={suspiciousLoginMethods}
        reasons={suspiciousReasons}
        isPending={verifySuspiciousLoginMutation.isPending}
        pendingUserId={pendingUserId}
        focusNonce={suspiciousFocusNonce}
        onSubmit={onSuspiciousLoginSubmit}
        onBack={() => {
          setSuspiciousLoginToken(null)
          setSuspiciousLoginMethods([])
          setSuspiciousReasons([])
          setPendingUserId(null)
          suspiciousLoginForm.reset()
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

function SuspiciousLoginForm({
  className,
  formProps,
  form,
  methods,
  reasons,
  isPending,
  pendingUserId,
  focusNonce,
  onSubmit,
  onBack,
}: {
  className?: string
  formProps: React.HTMLAttributes<HTMLFormElement>
  form: ReturnType<typeof useForm<SuspiciousLoginSchema>>
  methods: string[]
  reasons: string[]
  isPending: boolean
  pendingUserId: string | null
  focusNonce: number
  onSubmit: (data: SuspiciousLoginSchema) => void
  onBack: () => void
}) {
  const { t } = useTranslation()
  const [validationFocusNonce, setValidationFocusNonce] = useState(0)
  const codeInputContainerRef = useRef<HTMLDivElement>(null)
  const selectedMethod = form.watch('method')
  const useTextInput = selectedMethod === 'backup_code'
  const methodOptions = [
    {
      value: 'email',
      icon: Mail,
      label: t('auth.suspiciousLogin.methodEmail'),
      description: t('auth.suspiciousLogin.methodEmailDescription'),
      available: methods.includes('email'),
    },
    {
      value: 'totp',
      icon: ShieldCheck,
      label: t('auth.suspiciousLogin.methodTotp'),
      description: t('auth.suspiciousLogin.methodTotpDescription'),
      available: methods.includes('totp'),
    },
    {
      value: 'backup_code',
      icon: KeyRound,
      label: t('auth.suspiciousLogin.methodBackupCode'),
      description: t('auth.suspiciousLogin.methodBackupCodeDescription'),
      available: methods.includes('backup_code'),
    },
  ].filter((option) => option.available) as Array<{
    value: SuspiciousLoginSchema['method']
    icon: typeof Mail
    label: string
    description: string
    available: boolean
  }>

  function focusCodeInput() {
    queueMicrotask(() => {
      codeInputContainerRef.current?.querySelector('input')?.focus()
    })
  }

  useEffect(() => {
    focusCodeInput()
  }, [focusNonce, selectedMethod, validationFocusNonce])

  function submitOtpCode(code: string) {
    if (isPending || useTextInput || code.length !== 6) {
      return
    }

    queueMicrotask(() => {
      void form.handleSubmit(onSubmit, () => {
        setValidationFocusNonce((value) => value + 1)
      })()
    })
  }

  function setMethod(method: SuspiciousLoginSchema['method']) {
    form.setValue('method', method, {
      shouldDirty: true,
      shouldValidate: true,
    })
    form.setValue('code', '', {
      shouldDirty: true,
      shouldTouch: false,
      shouldValidate: false,
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
        <div className='overflow-hidden rounded-lg border'>
          <div className='bg-destructive/10 border-destructive/20 border-b px-4 py-3'>
            <div className='flex items-start gap-3'>
              <div className='bg-background text-destructive ring-destructive/15 flex size-10 shrink-0 items-center justify-center rounded-md ring-1'>
                <ShieldAlert className='size-5' />
              </div>
              <div className='min-w-0 space-y-1'>
                <div className='flex flex-wrap items-center gap-2'>
                  <Badge variant='destructive' className='rounded-md'>
                    {t('auth.suspiciousLogin.badge')}
                  </Badge>
                  {pendingUserId ? (
                    <span className='text-muted-foreground text-xs'>
                      {t('auth.twoFactor.pendingUser', { id: pendingUserId })}
                    </span>
                  ) : null}
                </div>
                <p className='text-sm font-semibold'>
                  {t('auth.suspiciousLogin.title')}
                </p>
                <p className='text-muted-foreground text-sm leading-5'>
                  {t('auth.suspiciousLogin.description')}
                </p>
              </div>
            </div>
          </div>
          <div className='space-y-3 px-4 py-3'>
            <div className='space-y-2'>
              <p className='text-xs font-medium'>
                {t('auth.suspiciousLogin.reasonLabel')}
              </p>
              <div className='flex flex-wrap gap-1.5'>
                {reasons.length > 0 ? (
                  reasons.map((reason) => (
                    <Badge
                      key={reason}
                      variant='outline'
                      className='h-6 rounded-md px-2'
                    >
                      {t(getSuspiciousReasonKey(reason))}
                    </Badge>
                  ))
                ) : (
                  <Badge variant='outline' className='h-6 rounded-md px-2'>
                    {t('settings.security.sessionsSuspicious')}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className='space-y-2'>
          <p className='text-sm font-medium'>
            {t('auth.suspiciousLogin.chooseMethod')}
          </p>
          <div className='grid gap-2'>
            {methodOptions.map((option) => {
              const Icon = option.icon
              const isSelected = selectedMethod === option.value

              return (
                <button
                  key={option.value}
                  type='button'
                  disabled={isPending}
                  aria-pressed={isSelected}
                  onClick={() => setMethod(option.value)}
                  className={cn(
                    'group focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-16 w-full items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50',
                    isSelected
                      ? 'border-primary bg-primary/10'
                      : 'bg-background hover:bg-muted/60'
                  )}
                >
                  <span
                    className={cn(
                      'flex size-9 shrink-0 items-center justify-center rounded-md border',
                      isSelected
                        ? 'border-primary/20 bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground group-hover:text-foreground'
                    )}
                  >
                    <Icon className='size-4' />
                  </span>
                  <span className='min-w-0 flex-1'>
                    <span className='block text-sm font-medium'>
                      {option.label}
                    </span>
                    <span className='text-muted-foreground block text-xs leading-5'>
                      {option.description}
                    </span>
                  </span>
                  {isSelected && (
                    <CheckCircle2 className='text-primary size-4 shrink-0' />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <FormField
          control={form.control}
          name='code'
          render={({ field }) => (
            <FormItem>
              <div className='bg-muted/20 rounded-lg border px-4 py-3'>
                <div className='mb-3 flex items-center justify-between gap-3'>
                  <FormLabel>{t('auth.suspiciousLogin.code')}</FormLabel>
                  <span className='text-muted-foreground text-xs'>
                    {selectedMethod === 'email'
                      ? t('auth.suspiciousLogin.codeSourceEmail')
                      : selectedMethod === 'totp'
                        ? t('auth.suspiciousLogin.codeSourceTotp')
                        : t('auth.suspiciousLogin.codeSourceBackup')}
                  </span>
                </div>
                <div ref={codeInputContainerRef}>
                  <FormControl>
                    {useTextInput ? (
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
                        className='h-11 text-center font-mono text-base tracking-widest'
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
                            <InputOTPSlot
                              key={index}
                              index={index}
                              className='size-10 text-base'
                            />
                          ))}
                        </InputOTPGroup>
                      </InputOTP>
                    )}
                  </FormControl>
                </div>
                <p className='text-muted-foreground mt-3 text-center text-xs leading-5'>
                  {selectedMethod === 'email'
                    ? t('auth.suspiciousLogin.emailHint')
                    : selectedMethod === 'totp'
                      ? t('auth.suspiciousLogin.totpHint')
                      : t('auth.suspiciousLogin.backupCodeHint')}
                </p>
                <FormMessage className='mt-2 text-center text-xs' />
              </div>
            </FormItem>
          )}
        />

        <div className='grid gap-2'>
          <Button disabled={isPending} className='h-10'>
            {isPending ? <Loader2 className='animate-spin' /> : <ShieldCheck />}
            {t('auth.suspiciousLogin.buttonVerify')}
          </Button>

          <Button
            type='button'
            variant='ghost'
            disabled={isPending}
            onClick={onBack}
          >
            {t('auth.twoFactor.buttonBack')}
          </Button>
        </div>
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

function getSuspiciousReasonKey(reason: string) {
  if (reason === 'new_ip_address') {
    return 'settings.security.sessionsSuspiciousNewIp'
  }

  if (reason === 'new_device') {
    return 'settings.security.sessionsSuspiciousNewDevice'
  }

  if (reason === 'failed_login_attempts') {
    return 'settings.security.sessionsSuspiciousFailedAttempts'
  }

  return 'settings.security.sessionsSuspicious'
}
