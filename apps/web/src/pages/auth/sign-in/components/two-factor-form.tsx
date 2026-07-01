import { useEffect, useRef, useState, type HTMLAttributes } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { Loader2, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
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
import type { TwoFactorLoginSchema } from '../../schema'

interface TwoFactorFormProps {
  className?: string
  formProps: HTMLAttributes<HTMLFormElement>
  form: UseFormReturn<TwoFactorLoginSchema>
  isPending: boolean
  pendingUserId: string | null
  focusNonce: number
  onSubmit: (data: TwoFactorLoginSchema) => void
  onBack: () => void
}

export function TwoFactorForm({
  className,
  formProps,
  form,
  isPending,
  pendingUserId,
  focusNonce,
  onSubmit,
  onBack,
}: TwoFactorFormProps) {
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
