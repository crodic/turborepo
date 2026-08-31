import { useEffect, useState } from 'react'
import axios from 'axios'
import { formatDistanceToNow } from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import {
  ActivityIcon,
  AlertTriangleIcon,
  BarChart3Icon,
  BugIcon,
  CheckCircle2Icon,
  DatabaseIcon,
  ExternalLinkIcon,
  RefreshCwIcon,
  ServerIcon,
  ShieldCheckIcon,
  UsersIcon,
  XCircleIcon,
} from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import http from '@/lib/http'
import { useSocket } from '@/context/socket-context'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'

type OnlinePresence = {
  id: string
  type: 'admin' | 'user'
  sessionId?: string
  email: string
  fullName?: string
  avatar?: string
  socketCount: number
  connectedAt: string
  lastSeenAt: string
}

type PresenceSnapshot = {
  admins: OnlinePresence[]
  users: OnlinePresence[]
  counts: {
    admins: number
    users: number
    total: number
  }
}

type HealthIndicator = {
  status?: string
  [key: string]: unknown
}

type HealthCheckResponse = {
  status: 'ok' | 'error' | 'shutting_down' | string
  info?: Record<string, HealthIndicator>
  error?: Record<string, HealthIndicator>
  details?: Record<string, HealthIndicator>
}

type SentryIssue = {
  id: string
  shortId?: string
  title?: string
  culprit?: string
  level?: string
  status?: string
  count: number
  userCount: number
  firstSeen?: string
  lastSeen?: string
  permalink?: string
}

type SentrySummary = {
  configured: boolean
  unavailable?: boolean
  reason?: string
  organizationSlug?: string
  projectSlug?: string
  environments?: string[]
  generatedAt?: string
  metrics?: {
    totalErrorsToday: number
    affectedUsersToday: number
    unresolvedIssues: number
  }
  errorsByEnvironment?: Array<{
    environment: string
    unresolvedIssues: number
    eventsApprox: number
    affectedUsersApprox: number
  }>
  topIssues?: SentryIssue[]
  latestIssues?: SentryIssue[]
  trend?: Array<{
    date: string
    errors: number
  }>
  releaseHealth?: {
    sessions: number
    users: number
    crashFreeSessions: number | null
    crashFreeUsers: number | null
  }
  weeklyReport?: {
    currentErrors: number
    previousErrors: number
    changePercent: number
    periodStart: string
    periodEnd: string
  }
}

const emptySnapshot: PresenceSnapshot = {
  admins: [],
  users: [],
  counts: {
    admins: 0,
    users: 0,
    total: 0,
  },
}

const HEALTH_QUERY_KEY = ['system_health'] as const
const SENTRY_SUMMARY_QUERY_KEY = ['sentry_summary'] as const

async function apiGetSystemHealth(): Promise<HealthCheckResponse> {
  const apiUrl = new URL(import.meta.env.VITE_API_URL, window.location.origin)
  const healthUrl = `${apiUrl.origin}/health`
  const response = await axios.get<HealthCheckResponse>(healthUrl, {
    timeout: 10000,
    withCredentials: true,
  })

  return response.data
}

async function apiGetSentrySummary(): Promise<SentrySummary> {
  const response = await http.get<SentrySummary>('/sentry/summary')

  return response.data
}

export function Dashboard() {
  const { t } = useTranslation()
  const socket = useSocket()
  const navigate = useNavigate()
  const [snapshot, setSnapshot] = useState<PresenceSnapshot>(emptySnapshot)
  const healthQuery = useQuery({
    queryKey: HEALTH_QUERY_KEY,
    queryFn: apiGetSystemHealth,
    refetchInterval: 30_000,
  })
  const sentryQuery = useQuery({
    queryKey: SENTRY_SUMMARY_QUERY_KEY,
    queryFn: apiGetSentrySummary,
    refetchInterval: 60_000,
  })

  useEffect(() => {
    if (!socket) {
      return
    }

    const handleSnapshot = (nextSnapshot: PresenceSnapshot) => {
      setSnapshot(nextSnapshot)
    }

    const handleCounts = (counts: PresenceSnapshot['counts']) => {
      setSnapshot((current) => ({
        ...current,
        counts,
      }))
    }

    socket.emit('presence:subscribe')
    socket.on('presence:snapshot', handleSnapshot)
    socket.on('presence:counts', handleCounts)

    return () => {
      socket.emit('presence:unsubscribe')
      socket.off('presence:snapshot', handleSnapshot)
      socket.off('presence:counts', handleCounts)
    }
  }, [socket])

  return (
    <>
      <Helmet>
        <title>{t('dashboard.title')}</title>
        <meta name='description' content={t('dashboard.title')} />
      </Helmet>

      {/* ===== Top Heading ===== */}
      <Header fixed>
        <div className='ms-auto flex items-center space-x-4'>
          <Search />
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      {/* ===== Main ===== */}
      <Main className='flex flex-1 flex-col gap-6'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight md:text-3xl'>
            {t('dashboard.title')}
          </h1>
          <p className='text-muted-foreground'>
            {t('dashboard.realtime.onlineAdminsDesc')}
          </p>
        </div>

        <div className='grid gap-4 md:grid-cols-3'>
          <PresenceMetricCard
            title={t('dashboard.realtime.onlineAdmins')}
            value={snapshot.counts.admins}
            description={t('dashboard.realtime.onlineAdminsDesc')}
            icon={<ShieldCheckIcon className='size-5' />}
          />
          <PresenceMetricCard
            title={t('dashboard.realtime.onlineUsers')}
            value={snapshot.counts.users}
            description={t('dashboard.realtime.onlineUsersDesc')}
            icon={<UsersIcon className='size-5' />}
          />
          <PresenceMetricCard
            title={t('dashboard.realtime.totalOnline')}
            value={snapshot.counts.total}
            description={t('dashboard.realtime.totalOnlineDesc')}
            icon={<ActivityIcon className='size-5' />}
          />
        </div>

        <SystemHealthSection
          health={healthQuery.data}
          isLoading={healthQuery.isFetching}
          isError={healthQuery.isError}
          updatedAt={healthQuery.dataUpdatedAt}
          onRefresh={() => healthQuery.refetch()}
        />

        <SentryHealthSection
          summary={sentryQuery.data}
          isLoading={sentryQuery.isFetching}
          isError={sentryQuery.isError}
          updatedAt={sentryQuery.dataUpdatedAt}
          onRefresh={() => sentryQuery.refetch()}
        />

        <div className='grid gap-4 xl:grid-cols-2'>
          <OnlinePresenceList
            title={t('dashboard.realtime.adminsOnlineTitle')}
            description={t('dashboard.realtime.adminsOnlineDesc')}
            emptyText={t('dashboard.realtime.noAdminsOnline')}
            items={snapshot.admins}
            onSelect={(item) => navigate(`/admins/${item.id}/show`)}
          />
          <OnlinePresenceList
            title={t('dashboard.realtime.usersOnlineTitle')}
            description={t('dashboard.realtime.usersOnlineDesc')}
            emptyText={t('dashboard.realtime.noUsersOnline')}
            items={snapshot.users}
            onSelect={(item) => navigate(`/users/${item.id}/show`)}
          />
        </div>
      </Main>
    </>
  )
}

function SentryHealthSection({
  summary,
  isLoading,
  isError,
  updatedAt,
  onRefresh,
}: {
  summary?: SentrySummary
  isLoading: boolean
  isError: boolean
  updatedAt: number
  onRefresh: () => void
}) {
  const { t } = useTranslation()
  const unavailable = isError || summary?.unavailable
  const configured = summary?.configured ?? true
  const weeklyChange = summary?.weeklyReport?.changePercent ?? 0

  return (
    <Card>
      <CardHeader className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div className='space-y-1.5'>
          <CardTitle className='flex items-center gap-2'>
            <BugIcon className='text-primary size-5' />
            {t('dashboard.sentry.title')}
          </CardTitle>
          <CardDescription>{t('dashboard.sentry.description')}</CardDescription>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <Badge
            variant={!configured || unavailable ? 'destructive' : 'secondary'}
            className={
              configured && !unavailable
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                : ''
            }
          >
            {!configured
              ? 'Not configured'
              : unavailable
                ? 'Unavailable'
                : 'Connected'}
          </Badge>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCwIcon
              className={isLoading ? 'size-4 animate-spin' : 'size-4'}
            />
            {t('dashboard.systemHealth.refresh')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className='space-y-4'>
        {!configured || unavailable ? (
          <div className='text-muted-foreground rounded-md border border-dashed p-4 text-sm'>
            {summary?.reason ||
              'Sentry summary is not available. Check Sentry dashboard environment variables and API token scopes.'}
          </div>
        ) : (
          <>
            <div className='grid gap-3 md:grid-cols-4'>
              <HealthSummaryItem
                label={t('dashboard.sentry.errorsToday')}
                value={formatNumber(summary?.metrics?.totalErrorsToday)}
                tone={
                  (summary?.metrics?.totalErrorsToday ?? 0) > 0
                    ? 'critical'
                    : 'healthy'
                }
              />
              <HealthSummaryItem
                label={t('dashboard.sentry.affectedUsers')}
                value={formatNumber(summary?.metrics?.affectedUsersToday)}
                tone='neutral'
              />
              <HealthSummaryItem
                label={t('dashboard.sentry.crashFreeSessions')}
                value={formatPercent(summary?.releaseHealth?.crashFreeSessions)}
                tone={getCrashFreeTone(
                  summary?.releaseHealth?.crashFreeSessions
                )}
              />
              <HealthSummaryItem
                label={t('dashboard.sentry.weeklyChange')}
                value={`${weeklyChange >= 0 ? '+' : ''}${weeklyChange.toFixed(
                  1
                )}%`}
                tone={weeklyChange > 0 ? 'critical' : 'healthy'}
              />
            </div>

            <div className='grid gap-4 xl:grid-cols-[1fr_1.2fr]'>
              <SentryTrendCard trend={summary?.trend ?? []} />
              <SentryEnvironmentCard
                environments={summary?.errorsByEnvironment ?? []}
              />
            </div>

            <div className='grid gap-4 xl:grid-cols-2'>
              <SentryIssueList
                title={t('dashboard.sentry.topErrorsTitle')}
                description={t('dashboard.sentry.topErrorsDesc')}
                issues={summary?.topIssues ?? []}
              />
              <SentryIssueList
                title={t('dashboard.sentry.latestErrorsTitle')}
                description={t('dashboard.sentry.latestErrorsDesc')}
                issues={summary?.latestIssues ?? []}
              />
            </div>

            <p className='text-muted-foreground text-xs'>
              {t('dashboard.sentry.lastSynced')}{' '}
              {updatedAt
                ? formatDistanceToNow(new Date(updatedAt), { addSuffix: true })
                : 'never'}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function SentryTrendCard({
  trend,
}: {
  trend: Array<{ date: string; errors: number }>
}) {
  const { t } = useTranslation()
  const max = Math.max(...trend.map((item) => item.errors), 1)

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2 text-base'>
          <BarChart3Icon className='size-4' />
          {t('dashboard.sentry.errorTrend')}
        </CardTitle>
        <CardDescription>
          {t('dashboard.sentry.errorTrendDesc')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {trend.length === 0 ? (
          <div className='text-muted-foreground rounded-md border border-dashed p-4 text-sm'>
            {t('dashboard.sentry.noTrendData')}
          </div>
        ) : (
          <div className='flex h-32 items-end gap-1'>
            {trend.map((item) => (
              <div
                key={item.date}
                className='group bg-primary/15 hover:bg-primary/30 flex flex-1 items-end rounded-sm transition-colors'
                title={`${new Date(item.date).toLocaleDateString()}: ${
                  item.errors
                } errors`}
              >
                <div
                  className='bg-primary w-full rounded-sm'
                  style={{
                    height: `${Math.max((item.errors / max) * 100, 4)}%`,
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SentryEnvironmentCard({
  environments,
}: {
  environments: NonNullable<SentrySummary['errorsByEnvironment']>
}) {
  const { t } = useTranslation()
  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-base'>
          {t('dashboard.sentry.errorsByEnvironment')}
        </CardTitle>
        <CardDescription>
          {t('dashboard.sentry.errorsByEnvDesc')}
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-2'>
        {environments.length === 0 ? (
          <div className='text-muted-foreground rounded-md border border-dashed p-4 text-sm'>
            {t('dashboard.sentry.noEnvData')}
          </div>
        ) : (
          environments.map((item) => (
            <div
              key={item.environment}
              className='flex items-center justify-between gap-4 rounded-md border p-3'
            >
              <div>
                <p className='font-medium'>{item.environment}</p>
                <p className='text-muted-foreground text-xs'>
                  {formatNumber(item.unresolvedIssues)}{' '}
                  {t('dashboard.sentry.unresolvedIssues')} ·{' '}
                  {formatNumber(item.affectedUsersApprox)}{' '}
                  {t('dashboard.sentry.affectedUsers')}
                </p>
              </div>
              <Badge
                variant={item.eventsApprox > 0 ? 'destructive' : 'secondary'}
              >
                {formatNumber(item.eventsApprox)}
              </Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

function SentryIssueList({
  title,
  description,
  issues,
}: {
  title: string
  description: string
  issues: SentryIssue[]
}) {
  const { t } = useTranslation()
  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-base'>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className='space-y-2'>
        {issues.length === 0 ? (
          <div className='text-muted-foreground rounded-md border border-dashed p-4 text-sm'>
            {t('dashboard.sentry.noIssuesFound')}
          </div>
        ) : (
          issues.map((issue) => (
            <a
              key={issue.id}
              href={issue.permalink}
              target='_blank'
              rel='noreferrer'
              className='hover:bg-muted/60 flex items-start justify-between gap-3 rounded-md border p-3 transition-colors'
            >
              <div className='min-w-0'>
                <div className='flex flex-wrap items-center gap-2'>
                  <p className='truncate font-medium'>{issue.title}</p>
                  {issue.level && (
                    <Badge variant='outline'>{issue.level}</Badge>
                  )}
                </div>
                <p className='text-muted-foreground mt-1 truncate text-xs'>
                  {issue.culprit || issue.shortId || issue.id}
                </p>
                <p className='text-muted-foreground mt-1 text-xs'>
                  {formatNumber(issue.count)} {t('dashboard.sentry.events')} ·{' '}
                  {formatNumber(issue.userCount)} {t('dashboard.sentry.users')}
                </p>
              </div>
              <ExternalLinkIcon className='text-muted-foreground mt-1 size-4 shrink-0' />
            </a>
          ))
        )}
      </CardContent>
    </Card>
  )
}

function SystemHealthSection({
  health,
  isLoading,
  isError,
  updatedAt,
  onRefresh,
}: {
  health?: HealthCheckResponse
  isLoading: boolean
  isError: boolean
  updatedAt: number
  onRefresh: () => void
}) {
  const { t } = useTranslation()
  const overall = getHealthOverall(health, isError)
  const indicators = getHealthIndicators(health)

  return (
    <Card>
      <CardHeader className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div className='space-y-1.5'>
          <CardTitle className='flex items-center gap-2'>
            <ServerIcon className='text-primary size-5' />
            {t('dashboard.systemHealth.title')}
          </CardTitle>
          <CardDescription>
            {t('dashboard.systemHealth.description')}
          </CardDescription>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <Badge variant={overall.variant} className={overall.className}>
            <overall.icon className='size-3.5' />
            {overall.label}
          </Badge>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCwIcon
              className={isLoading ? 'size-4 animate-spin' : 'size-4'}
            />
            {t('dashboard.systemHealth.refresh')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='grid gap-3 md:grid-cols-3'>
          <HealthSummaryItem
            label={t('dashboard.systemHealth.overallStatus')}
            value={overall.label}
            tone={overall.tone}
          />
          <HealthSummaryItem
            label={t('dashboard.systemHealth.indicators')}
            value={String(indicators.length)}
            tone='neutral'
          />
          <HealthSummaryItem
            label={t('dashboard.systemHealth.lastChecked')}
            value={
              updatedAt
                ? formatDistanceToNow(new Date(updatedAt), { addSuffix: true })
                : 'Not checked yet'
            }
            tone='neutral'
          />
        </div>

        {isError ? (
          <div className='border-destructive/30 bg-destructive/5 text-destructive rounded-md border p-4 text-sm'>
            {t('dashboard.systemHealth.unreachable')}
          </div>
        ) : indicators.length === 0 ? (
          <div className='text-muted-foreground rounded-md border border-dashed p-4 text-sm'>
            {isLoading
              ? 'Checking system health...'
              : 'No health details found.'}
          </div>
        ) : (
          <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-3'>
            {indicators.map((indicator) => (
              <HealthIndicatorCard key={indicator.name} indicator={indicator} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function HealthSummaryItem({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'healthy' | 'warning' | 'critical' | 'neutral'
}) {
  return (
    <div className='rounded-md border p-3'>
      <p className='text-muted-foreground text-xs font-medium'>{label}</p>
      <p className={getHealthToneClass(tone)}>{value}</p>
    </div>
  )
}

function HealthIndicatorCard({
  indicator,
}: {
  indicator: { name: string; status: string; detail: HealthIndicator }
}) {
  const healthy = indicator.status === 'up'

  return (
    <div className='flex items-start gap-3 rounded-md border p-3'>
      <div
        className={
          healthy
            ? 'flex size-9 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600'
            : 'bg-destructive/10 text-destructive flex size-9 shrink-0 items-center justify-center rounded-md'
        }
      >
        {indicator.name === 'database' ? (
          <DatabaseIcon className='size-4' />
        ) : healthy ? (
          <CheckCircle2Icon className='size-4' />
        ) : (
          <XCircleIcon className='size-4' />
        )}
      </div>
      <div className='min-w-0 flex-1'>
        <div className='flex flex-wrap items-center gap-2'>
          <p className='font-medium capitalize'>
            {formatIndicatorName(indicator.name)}
          </p>
          <Badge variant={healthy ? 'secondary' : 'destructive'}>
            {indicator.status}
          </Badge>
        </div>
        <p className='text-muted-foreground mt-1 truncate text-xs'>
          {formatIndicatorDetail(indicator.detail)}
        </p>
      </div>
    </div>
  )
}

function getHealthOverall(
  health: HealthCheckResponse | undefined,
  isError: boolean
) {
  if (isError) {
    return {
      label: 'Unreachable',
      tone: 'critical' as const,
      variant: 'destructive' as const,
      className: '',
      icon: XCircleIcon,
    }
  }

  if (!health) {
    return {
      label: 'Checking',
      tone: 'neutral' as const,
      variant: 'outline' as const,
      className: '',
      icon: RefreshCwIcon,
    }
  }

  if (health.status === 'ok') {
    return {
      label: 'Operational',
      tone: 'healthy' as const,
      variant: 'secondary' as const,
      className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
      icon: CheckCircle2Icon,
    }
  }

  if (health.status === 'shutting_down') {
    return {
      label: 'Shutting down',
      tone: 'warning' as const,
      variant: 'outline' as const,
      className: 'border-amber-500/40 text-amber-700 dark:text-amber-400',
      icon: AlertTriangleIcon,
    }
  }

  return {
    label: 'Degraded',
    tone: 'critical' as const,
    variant: 'destructive' as const,
    className: '',
    icon: XCircleIcon,
  }
}

function getHealthIndicators(health?: HealthCheckResponse) {
  const details = health?.details ?? {}

  return Object.entries(details).map(([name, detail]) => ({
    name,
    status: detail.status ?? 'unknown',
    detail,
  }))
}

function getHealthToneClass(
  tone: 'healthy' | 'warning' | 'critical' | 'neutral'
) {
  const base = 'mt-1 text-lg font-semibold'

  if (tone === 'healthy') return `${base} text-emerald-600`
  if (tone === 'warning') return `${base} text-amber-600`
  if (tone === 'critical') return `${base} text-destructive`

  return base
}

function formatIndicatorName(name: string) {
  return name.replace(/-/g, ' ')
}

function formatIndicatorDetail(detail: HealthIndicator) {
  const entries = Object.entries(detail).filter(([key]) => key !== 'status')

  if (entries.length === 0) {
    return 'No additional details'
  }

  return entries.map(([key, value]) => `${key}: ${String(value)}`).join(' · ')
}

function formatNumber(value?: number | null) {
  return new Intl.NumberFormat().format(value ?? 0)
}

function formatPercent(value?: number | null) {
  if (value === null || value === undefined) {
    return 'N/A'
  }

  return `${value.toFixed(2)}%`
}

function getCrashFreeTone(value?: number | null) {
  if (value === null || value === undefined) {
    return 'neutral'
  }

  if (value >= 99.5) {
    return 'healthy'
  }

  if (value >= 98) {
    return 'warning'
  }

  return 'critical'
}

function PresenceMetricCard({
  title,
  value,
  description,
  icon,
}: {
  title: string
  value: number
  description: string
  icon: React.ReactNode
}) {
  return (
    <Card>
      <CardContent className='flex items-center justify-between gap-4'>
        <div className='space-y-1'>
          <p className='text-muted-foreground text-sm font-medium'>{title}</p>
          <p className='text-3xl font-bold'>{value}</p>
          <p className='text-muted-foreground text-xs'>{description}</p>
        </div>
        <div className='bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-md'>
          {icon}
        </div>
      </CardContent>
    </Card>
  )
}

function OnlinePresenceList({
  title,
  description,
  emptyText,
  items,
  onSelect,
}: {
  title: string
  description: string
  emptyText: string
  items: OnlinePresence[]
  onSelect: (item: OnlinePresence) => void
}) {
  const { t } = useTranslation()
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className='space-y-2'>
        {items.length === 0 ? (
          <div className='text-muted-foreground rounded-md border border-dashed p-6 text-center text-sm'>
            {emptyText}
          </div>
        ) : (
          items.map((item) => (
            <button
              key={`${item.type}:${item.id}`}
              type='button'
              onClick={() => onSelect(item)}
              className='hover:bg-muted/60 focus-visible:ring-ring flex w-full items-center gap-3 rounded-md border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none'
            >
              <Avatar className='size-10'>
                <AvatarImage src={item.avatar} alt={item.fullName} />
                <AvatarFallback>{getInitials(item)}</AvatarFallback>
              </Avatar>
              <div className='min-w-0 flex-1'>
                <div className='flex flex-wrap items-center gap-2'>
                  <p className='truncate font-medium'>
                    {item.fullName || item.email}
                  </p>
                  <Badge variant='secondary' className='gap-1'>
                    <span className='size-1.5 rounded-full bg-emerald-500' />
                    {t('common.online', { defaultValue: 'Online' })}
                  </Badge>
                </div>
                <p className='text-muted-foreground truncate text-sm'>
                  {item.email}
                </p>
              </div>
              <div className='text-muted-foreground hidden text-right text-xs sm:block'>
                <p>
                  {item.socketCount} {t('dashboard.realtime.socket')}
                  {item.socketCount > 1 ? 's' : ''}
                </p>
                <p>
                  {t('dashboard.realtime.seen')}{' '}
                  {formatDistanceToNow(new Date(item.lastSeenAt), {
                    addSuffix: true,
                  })}
                </p>
              </div>
            </button>
          ))
        )}
      </CardContent>
    </Card>
  )
}

function getInitials(item: OnlinePresence) {
  const source = item.fullName || item.email

  return source
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}
