import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChromeIcon,
  Globe2Icon,
  KeyRoundIcon,
  LaptopIcon,
  Loader2Icon,
  MonitorIcon,
  SmartphoneIcon,
  TabletIcon,
  Trash2Icon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfirmDialog } from '@/components/confirm-dialog'
import {
  apiGetSessions,
  apiRevokeAllSessions,
  apiRevokeSession,
  type SessionSchema,
} from '@/pages/auth/queries'

const AUTH_SESSIONS_QUERY_KEY = ['auth_sessions'] as const

type DeviceInfo = {
  browser: string
  os: string
  device: string
  kind: 'desktop' | 'mobile' | 'tablet' | 'unknown'
}

export function SessionManager() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const logout = useAuthStore((state) => state.logout)
  const [sessionToRevoke, setSessionToRevoke] = useState<SessionSchema | null>(
    null
  )
  const [isRevokeAllDialogOpen, setIsRevokeAllDialogOpen] = useState(false)
  const { data: sessions = [], isFetching } = useQuery({
    queryKey: AUTH_SESSIONS_QUERY_KEY,
    queryFn: apiGetSessions,
  })

  const revokeSessionMutation = useMutation({
    mutationFn: apiRevokeSession,
    onSuccess: () => {
      toast.success(t('settings.security.sessionsMessageRevoked'))
      setSessionToRevoke(null)
      queryClient.invalidateQueries({ queryKey: AUTH_SESSIONS_QUERY_KEY })
    },
    onError: () =>
      toast.error(t('settings.security.sessionsMessageRevokeFailed')),
  })

  const revokeAllMutation = useMutation({
    mutationFn: apiRevokeAllSessions,
    onSuccess: () => {
      toast.success(t('settings.security.sessionsMessageAllRevoked'))
      setIsRevokeAllDialogOpen(false)
      logout()
      window.location.href = '/sign-in'
    },
    onError: () =>
      toast.error(t('settings.security.sessionsMessageRevokeAllFailed')),
  })

  return (
    <>
      <Card>
        <CardHeader className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <div className='space-y-1.5'>
            <CardTitle className='flex items-center gap-2'>
              <KeyRoundIcon className='text-primary size-5' />
              {t('settings.security.sessionsTitle')}
            </CardTitle>
            <CardDescription>
              {t('settings.security.sessionsDescription')}
            </CardDescription>
          </div>
          <Button
            variant='destructive'
            onClick={() => setIsRevokeAllDialogOpen(true)}
            disabled={sessions.length === 0 || revokeAllMutation.isPending}
          >
            {revokeAllMutation.isPending && (
              <Loader2Icon className='size-4 animate-spin' />
            )}
            {t('settings.security.sessionsRevokeAll')}
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('settings.security.sessionsDevice')}</TableHead>
                <TableHead>
                  {t('settings.security.sessionsIpAddress')}
                </TableHead>
                <TableHead>{t('settings.security.sessionsCreated')}</TableHead>
                <TableHead className='text-right'>
                  {t('settings.security.sessionsAction')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isFetching ? (
                <TableRow>
                  <TableCell colSpan={4} className='text-muted-foreground py-8'>
                    {t('settings.security.sessionsLoading')}
                  </TableCell>
                </TableRow>
              ) : sessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className='text-muted-foreground py-8'>
                    {t('settings.security.sessionsEmpty')}
                  </TableCell>
                </TableRow>
              ) : (
                sessions.map((session) => (
                  <SessionRow
                    key={session.id}
                    session={session}
                    isRevoking={revokeSessionMutation.isPending}
                    onRevoke={() => setSessionToRevoke(session)}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={Boolean(sessionToRevoke)}
        onOpenChange={(open) => {
          if (!open) setSessionToRevoke(null)
        }}
        title='settings.security.sessionsRevokeDialogTitle'
        desc='settings.security.sessionsRevokeDialogDescription'
        confirmText='settings.security.sessionsRevoke'
        cancelBtnText='buttons.cancel'
        destructive
        isLoading={revokeSessionMutation.isPending}
        handleConfirm={() => {
          if (sessionToRevoke) revokeSessionMutation.mutate(sessionToRevoke.id)
        }}
      />

      <ConfirmDialog
        open={isRevokeAllDialogOpen}
        onOpenChange={setIsRevokeAllDialogOpen}
        title='settings.security.sessionsRevokeAllDialogTitle'
        desc='settings.security.sessionsRevokeAllDialogDescription'
        confirmText='settings.security.sessionsRevokeAll'
        cancelBtnText='buttons.cancel'
        destructive
        isLoading={revokeAllMutation.isPending}
        handleConfirm={() => revokeAllMutation.mutate()}
      />
    </>
  )
}

function SessionRow({
  session,
  isRevoking,
  onRevoke,
}: {
  session: SessionSchema
  isRevoking: boolean
  onRevoke: () => void
}) {
  const { t } = useTranslation()
  const device = parseDeviceInfo(session.userAgent)
  const deviceName =
    device.browser === 'Unknown browser' && device.device === 'Unknown device'
      ? t('settings.security.sessionsUnknownDevice')
      : t('settings.security.sessionsDeviceName', {
          browser: device.browser,
          device: device.device,
        })

  return (
    <TableRow>
      <TableCell className='max-w-[440px]'>
        <div className='flex items-start gap-3'>
          <div className='bg-muted flex size-10 shrink-0 items-center justify-center rounded-md'>
            <DeviceIcon device={device} />
          </div>
          <div className='min-w-0'>
            <p className='font-medium'>{deviceName}</p>
            <p className='text-muted-foreground text-xs'>
              {t('settings.security.sessionsSessionNumber', {
                id: session.id,
              })}
            </p>
            <p className='text-muted-foreground mt-1 truncate text-xs'>
              {session.userAgent || t('settings.security.sessionsUnknownAgent')}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell>{session.ipAddress || '-'}</TableCell>
      <TableCell>
        {formatDistanceToNow(new Date(session.createdAt), {
          addSuffix: true,
        })}
      </TableCell>
      <TableCell className='text-right'>
        <Button
          variant='ghost'
          size='sm'
          onClick={onRevoke}
          disabled={isRevoking}
        >
          <Trash2Icon className='size-4' />
          {t('settings.security.sessionsRevoke')}
        </Button>
      </TableCell>
    </TableRow>
  )
}

function parseDeviceInfo(userAgent?: string | null): DeviceInfo {
  const ua = userAgent ?? ''

  if (!ua) {
    return {
      browser: 'Unknown browser',
      os: 'Unknown OS',
      device: 'Unknown device',
      kind: 'unknown',
    }
  }

  const browser = detectBrowser(ua)
  const os = detectOs(ua)
  const kind = detectDeviceKind(ua)

  return {
    browser,
    os,
    device: kind === 'desktop' ? os : detectDeviceName(ua, os),
    kind,
  }
}

function detectBrowser(ua: string) {
  if (/Edg\//.test(ua)) return 'Microsoft Edge'
  if (/OPR\//.test(ua)) return 'Opera'
  if (/Chrome\//.test(ua) && !/Chromium\//.test(ua)) return 'Chrome'
  if (/Firefox\//.test(ua)) return 'Firefox'
  if (/Safari\//.test(ua) && /Version\//.test(ua)) return 'Safari'

  return 'Unknown browser'
}

function detectOs(ua: string) {
  if (/Windows NT/.test(ua)) return 'Windows'
  if (/Android/.test(ua)) return 'Android'
  if (/(iPhone|iPad|iPod)/.test(ua)) return 'iOS'
  if (/Mac OS X/.test(ua)) return 'macOS'
  if (/Linux/.test(ua)) return 'Linux'

  return 'Unknown OS'
}

function detectDeviceKind(ua: string): DeviceInfo['kind'] {
  if (/iPad|Tablet/.test(ua)) return 'tablet'
  if (/Mobile|iPhone|Android/.test(ua)) return 'mobile'
  if (/Windows NT|Mac OS X|Linux|X11/.test(ua)) return 'desktop'

  return 'unknown'
}

function detectDeviceName(ua: string, os: string) {
  if (/iPhone/.test(ua)) return 'iPhone'
  if (/iPad/.test(ua)) return 'iPad'
  if (/Android/.test(ua)) return 'Android device'

  return os
}

function DeviceIcon({ device }: { device: DeviceInfo }) {
  if (device.kind === 'mobile') return <SmartphoneIcon className='size-4' />
  if (device.kind === 'tablet') return <TabletIcon className='size-4' />
  if (device.kind === 'desktop') return <LaptopIcon className='size-4' />
  if (device.browser === 'Chrome') return <ChromeIcon className='size-4' />

  return device.os === 'Unknown OS' ? (
    <Globe2Icon className='size-4' />
  ) : (
    <MonitorIcon className='size-4' />
  )
}
