import { useEffect, useState, type HTMLAttributes } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import {
  apiLogin,
  apiVerifyTwoFactorLogin,
  apiRestoreAccount,
} from '../queries'
import {
  loginSchema,
  twoFactorLoginSchema,
  type LoginSchema,
  type TwoFactorLoginSchema,
} from '../schema'
import { RestoreAccountAlert } from './components/restore-account-alert'
import { SignInForm } from './components/sign-in-form'
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
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null)
  const [restoreToken, setRestoreToken] = useState<string | null>(null)

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
      if (payload.restoreAccountRequired && payload.restoreToken) {
        setRestoreToken(payload.restoreToken)
        toast.error('Your account is scheduled for deletion.')
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
    onError: (error: any) => {
      if (error?.response?.data?.code === 'UNVERIFIED_EMAIL') {
        const attemptedEmail = form.getValues('email')
        setUnverifiedEmail(attemptedEmail)
        return
      }
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

  const restoreAccountMutation = useMutation({
    mutationFn: apiRestoreAccount,
    onSuccess: (payload) => {
      setRestoreToken(null)
      completeLogin(payload)
    },
    onError: () => {
      toast.error('Failed to restore account. Token may be invalid or expired.')
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

  function resetTwoFactorStep() {
    setTwoFactorToken(null)
    setPendingUserId(null)
    twoFactorForm.reset()
  }

  function handleRestoreAccount() {
    if (restoreToken) {
      restoreAccountMutation.mutate({ token: restoreToken })
    }
  }

  function handleCancelRestore() {
    setRestoreToken(null)
    form.reset()
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

  if (restoreToken) {
    return (
      <RestoreAccountAlert
        isPending={restoreAccountMutation.isPending}
        onRestore={handleRestoreAccount}
        onCancel={handleCancelRestore}
      />
    )
  }

  return (
    <SignInForm
      className={className}
      form={form}
      isPending={loginMutation.isPending}
      unverifiedEmail={unverifiedEmail}
      onSubmit={onSubmit}
      {...props}
    />
  )
}
