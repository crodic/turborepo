import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Copy,
  KeyRound,
  Loader2,
  RefreshCcw,
  ShieldCheck,
  ShieldOff,
} from 'lucide-react'
import QRCode from 'qrcode'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { restApiErrorHandler } from '@/lib/rest-api-handler'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import DataLoader from '@/components/layout/data-loader'
import { PasswordInput } from '@/components/password-input'
import { ContentSection } from '../components/content-section'
import {
  apiDisableTwoFactor,
  apiEnableTwoFactor,
  apiGenerateTwoFactorBackupCodes,
  apiGetTwoFactorStatus,
  apiVerifyTwoFactorSetup,
  type EnableTwoFactorResponse,
} from '../queries'
import {
  twoFactorPasswordSchema,
  twoFactorVerifySchema,
  type TwoFactorPasswordSchema,
  type TwoFactorVerifySchema,
} from '../schema'
import { SessionManager } from './session-manager'

const TWO_FACTOR_STATUS_QUERY_KEY = ['two_factor_status'] as const

type SetupState = EnableTwoFactorResponse & {
  qrDataUrl: string
}

export function SettingsSecurity() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [setup, setSetup] = useState<SetupState | null>(null)
  const [backupCodes, setBackupCodes] = useState<string[]>([])

  const statusQuery = useQuery({
    queryKey: TWO_FACTOR_STATUS_QUERY_KEY,
    queryFn: apiGetTwoFactorStatus,
  })

  const enableForm = useForm<TwoFactorPasswordSchema>({
    resolver: zodResolver(twoFactorPasswordSchema),
    defaultValues: { password: '' },
  })
  const disableForm = useForm<TwoFactorPasswordSchema>({
    resolver: zodResolver(twoFactorPasswordSchema),
    defaultValues: { password: '' },
  })
  const backupForm = useForm<TwoFactorPasswordSchema>({
    resolver: zodResolver(twoFactorPasswordSchema),
    defaultValues: { password: '' },
  })
  const verifyForm = useForm<TwoFactorVerifySchema>({
    resolver: zodResolver(twoFactorVerifySchema),
    defaultValues: { code: '' },
  })

  const enableMutation = useMutation({
    mutationFn: apiEnableTwoFactor,
    onSuccess: async (payload) => {
      const qrDataUrl = await QRCode.toDataURL(payload.totpUri, {
        margin: 1,
        width: 220,
      })

      setSetup({ ...payload, qrDataUrl })
      setBackupCodes(payload.backupCodes)
      enableForm.reset()
      verifyForm.reset()
      toast.success(t('settings.security.messageSetupStarted'))
    },
    onError: restApiErrorHandler,
  })

  const verifyMutation = useMutation({
    mutationFn: apiVerifyTwoFactorSetup,
    onSuccess: async () => {
      setSetup(null)
      verifyForm.reset()
      await queryClient.invalidateQueries({
        queryKey: TWO_FACTOR_STATUS_QUERY_KEY,
      })
      await queryClient.invalidateQueries({ queryKey: ['authenticated_user'] })
      toast.success(t('settings.security.messageEnabled'))
    },
    onError: restApiErrorHandler,
  })

  const disableMutation = useMutation({
    mutationFn: apiDisableTwoFactor,
    onSuccess: async () => {
      setSetup(null)
      setBackupCodes([])
      disableForm.reset()
      await queryClient.invalidateQueries({
        queryKey: TWO_FACTOR_STATUS_QUERY_KEY,
      })
      await queryClient.invalidateQueries({ queryKey: ['authenticated_user'] })
      toast.success(t('settings.security.messageDisabled'))
    },
    onError: restApiErrorHandler,
  })

  const backupMutation = useMutation({
    mutationFn: apiGenerateTwoFactorBackupCodes,
    onSuccess: (payload) => {
      setBackupCodes(payload.backupCodes)
      backupForm.reset()
      toast.success(t('settings.security.messageBackupCodesGenerated'))
    },
    onError: restApiErrorHandler,
  })

  const enabled = statusQuery.data?.enabled ?? false

  if (statusQuery.isFetching)
    return (
      <ContentSection
        title={t('settings.security.title')}
        desc={t('settings.security.description')}
      >
        <div className='flex min-h-40 items-center justify-center'>
          <Loader2 className='animate-spin' />
        </div>
      </ContentSection>
    )

  return (
    <ContentSection
      title={t('settings.security.title')}
      desc={t('settings.security.description')}
    >
      <div className='space-y-6'>
        <Card>
          <CardHeader className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div>
              <CardTitle className='flex items-center gap-2'>
                <ShieldCheck className='text-primary size-5' />
                {t('settings.security.statusTitle')}
              </CardTitle>
              <CardDescription>
                {t('settings.security.statusDescription')}
              </CardDescription>
            </div>
            <Badge variant={enabled ? 'default' : 'secondary'}>
              {enabled
                ? t('settings.security.enabled')
                : t('settings.security.disabled')}
            </Badge>
          </CardHeader>
        </Card>

        <SessionManager />

        {!enabled && (
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.security.enableTitle')}</CardTitle>
              <CardDescription>
                {t('settings.security.enableDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-6'>
              {!setup && (
                <Form {...enableForm}>
                  <form
                    className='space-y-4'
                    onSubmit={enableForm.handleSubmit((data) =>
                      enableMutation.mutate(data)
                    )}
                  >
                    <FormField
                      control={enableForm.control}
                      name='password'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {t('settings.security.currentPassword')}
                          </FormLabel>
                          <FormControl>
                            <PasswordInput
                              placeholder='********'
                              autoComplete='current-password'
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button disabled={enableMutation.isPending}>
                      {enableMutation.isPending ? (
                        <Loader2 className='animate-spin' />
                      ) : (
                        <KeyRound />
                      )}
                      {t('settings.security.buttonStartSetup')}
                    </Button>
                  </form>
                </Form>
              )}

              {setup && (
                <div className='grid gap-6 lg:grid-cols-[260px_1fr]'>
                  <div className='bg-muted/30 flex flex-col items-center justify-center rounded-lg border p-4'>
                    <img
                      src={setup.qrDataUrl}
                      alt={t('settings.security.qrAlt')}
                      className='size-56 rounded-md bg-white p-2'
                    />
                    <p className='text-muted-foreground mt-3 text-center text-xs'>
                      {t('settings.security.scanQrHelp')}
                    </p>
                  </div>

                  <div className='space-y-5'>
                    <div>
                      <h4 className='font-medium'>
                        {t('settings.security.backupCodesTitle')}
                      </h4>
                      <p className='text-muted-foreground mt-1 text-sm'>
                        {t('settings.security.backupCodesDescription')}
                      </p>
                      <BackupCodeList codes={backupCodes} />
                    </div>

                    <Separator />

                    <Form {...verifyForm}>
                      <form
                        className='space-y-4'
                        onSubmit={verifyForm.handleSubmit((data) =>
                          verifyMutation.mutate(data)
                        )}
                      >
                        <FormField
                          control={verifyForm.control}
                          name='code'
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                {t('settings.security.authenticationCode')}
                              </FormLabel>
                              <FormControl>
                                <Input
                                  inputMode='numeric'
                                  autoComplete='one-time-code'
                                  placeholder='123456'
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className='flex flex-wrap gap-2'>
                          <Button disabled={verifyMutation.isPending}>
                            {verifyMutation.isPending ? (
                              <Loader2 className='animate-spin' />
                            ) : (
                              <ShieldCheck />
                            )}
                            {t('settings.security.buttonVerifyEnable')}
                          </Button>
                          <Button
                            type='button'
                            variant='outline'
                            disabled={verifyMutation.isPending}
                            onClick={() => {
                              setSetup(null)
                              setBackupCodes([])
                              verifyForm.reset()
                            }}
                          >
                            {t('buttons.cancel')}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {enabled && (
          <div className='grid gap-6 xl:grid-cols-2'>
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.security.backupCodesTitle')}</CardTitle>
                <CardDescription>
                  {t('settings.security.regenerateDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                {backupCodes.length > 0 && (
                  <BackupCodeList codes={backupCodes} />
                )}
                <Form {...backupForm}>
                  <form
                    className='space-y-4'
                    onSubmit={backupForm.handleSubmit((data) =>
                      backupMutation.mutate(data)
                    )}
                  >
                    <FormField
                      control={backupForm.control}
                      name='password'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {t('settings.security.currentPassword')}
                          </FormLabel>
                          <FormControl>
                            <PasswordInput
                              placeholder='********'
                              autoComplete='current-password'
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      variant='outline'
                      disabled={backupMutation.isPending}
                    >
                      {backupMutation.isPending ? (
                        <Loader2 className='animate-spin' />
                      ) : (
                        <RefreshCcw />
                      )}
                      {t('settings.security.buttonRegenerateBackupCodes')}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('settings.security.disableTitle')}</CardTitle>
                <CardDescription>
                  {t('settings.security.disableDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...disableForm}>
                  <form
                    className='space-y-4'
                    onSubmit={disableForm.handleSubmit((data) =>
                      disableMutation.mutate(data)
                    )}
                  >
                    <FormField
                      control={disableForm.control}
                      name='password'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {t('settings.security.currentPassword')}
                          </FormLabel>
                          <FormControl>
                            <PasswordInput
                              placeholder='********'
                              autoComplete='current-password'
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      variant='destructive'
                      disabled={disableMutation.isPending}
                    >
                      {disableMutation.isPending ? (
                        <Loader2 className='animate-spin' />
                      ) : (
                        <ShieldOff />
                      )}
                      {t('settings.security.buttonDisable')}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </ContentSection>
  )
}

function BackupCodeList({ codes }: { codes: string[] }) {
  const { t } = useTranslation()

  return (
    <div className='mt-3 space-y-3'>
      <div className='grid grid-cols-2 gap-2 sm:grid-cols-3'>
        {codes.map((code) => (
          <code
            key={code}
            className='bg-muted rounded-md border px-3 py-2 text-center text-sm font-semibold tracking-wider'
          >
            {code}
          </code>
        ))}
      </div>
      <Button
        type='button'
        variant='secondary'
        size='sm'
        onClick={() => {
          void navigator.clipboard.writeText(codes.join('\n'))
          toast.success(t('settings.security.messageBackupCodesCopied'))
        }}
      >
        <Copy />
        {t('settings.security.buttonCopyBackupCodes')}
      </Button>
    </div>
  )
}
