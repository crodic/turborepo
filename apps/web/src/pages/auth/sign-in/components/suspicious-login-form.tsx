import { useEffect, useRef, useState, type HTMLAttributes } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import {
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
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
import type { SuspiciousLoginSchema } from '../../schema'
import { getSuspiciousReasonKey } from './suspicious-login-reasons'

interface SuspiciousLoginFormProps {
  className?: string
  formProps: HTMLAttributes<HTMLFormElement>
  form: UseFormReturn<SuspiciousLoginSchema>
  methods: string[]
  reasons: string[]
  isPending: boolean
  pendingUserId: string | null
  focusNonce: number
  onSubmit: (data: SuspiciousLoginSchema) => void
  onBack: () => void
}

export function SuspiciousLoginForm({
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
}: SuspiciousLoginFormProps) {
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
