import { useEffect, useState, type HTMLAttributes } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
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
import { SignInForm } from './components/sign-in-form'
import { SuspiciousLoginForm } from './components/suspicious-login-form'
import { TwoFactorForm } from './components/two-factor-form'

interface UserAuthFormProps extends Omit<
  HTMLAttributes<HTMLFormElement>,
  'onSubmit'
> {
  redirectTo?: string
}

export function UserAuthForm({
  className,
  redirectTo,
  ...props
}: UserAuthFormProps) {
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

    navigate(redirectTo || '/', { replace: true })
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

  function resetTwoFactorStep() {
    setTwoFactorToken(null)
    setPendingUserId(null)
    twoFactorForm.reset()
  }

  function resetSuspiciousLoginStep() {
    setSuspiciousLoginToken(null)
    setSuspiciousLoginMethods([])
    setSuspiciousReasons([])
    setPendingUserId(null)
    suspiciousLoginForm.reset()
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
        onBack={resetTwoFactorStep}
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
        onBack={resetSuspiciousLoginStep}
      />
    )
  }

  return (
    <SignInForm
      className={className}
      form={form}
      isPending={loginMutation.isPending}
      onSubmit={onSubmit}
      {...props}
    />
  )
}
