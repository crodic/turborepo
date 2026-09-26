import { useState, useMemo } from 'react'
import {
  TrendingUp,
  TrendingDown,
  CreditCard,
  Users,
  Repeat,
  DollarSign,
  Building2,
  RefreshCw,
  BarChart3,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { useDataPolarMetrics, useDataPolarOrganizations } from '../queries'

export function PagePolarAnalytics() {
  const { t } = useTranslation()
  const [rangeDays, setRangeDays] = useState<'7' | '30' | '90' | '365'>('30')
  const [interval, setInterval] = useState<'day' | 'week' | 'month'>('day')
  const [activeChartMetric, setActiveChartMetric] = useState<
    'revenue' | 'mrr' | 'orders'
  >('revenue')

  const { startDate, endDate } = useMemo(() => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - parseInt(rangeDays, 10))
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    }
  }, [rangeDays])

  const {
    data: metricsData,
    isLoading: isMetricsLoading,
    refetch: refetchMetrics,
  } = useDataPolarMetrics({
    startDate,
    endDate,
    interval,
  })

  const { data: orgs } = useDataPolarOrganizations()
  const activeOrg = orgs?.[0]

  const metrics =
    metricsData?.metrics ||
    metricsData?.periods?.[metricsData?.periods?.length - 1] ||
    {}
  const revenueCents = metrics.revenue || metrics.gross_revenue || 0
  const mrrCents = metrics.monthly_recurring_revenue || metrics.mrr || 0
  const ordersCount = metrics.orders || 0
  const activeSubs = metrics.active_subscriptions || 0
  const cumulativeCustomers = metrics.cumulative_customers || 0
  const avgOrderValueCents =
    ordersCount > 0 ? Math.round(revenueCents / ordersCount) : 0

  interface MetricPeriodItem {
    date: string
    rawTimestamp: any
    revenue: number
    mrr: number
    orders: number
    subscriptions: number
    newSubscriptions: number
  }

  const periods = metricsData?.periods
  const chartData = useMemo<MetricPeriodItem[]>(() => {
    if (!periods) return []
    return periods.map((p: any) => {
      const date = p.timestamp ? new Date(p.timestamp) : new Date()
      const formattedDate = date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })
      return {
        date: formattedDate,
        rawTimestamp: p.timestamp,
        revenue: (p.revenue || p.gross_revenue || 0) / 100,
        mrr: (p.monthly_recurring_revenue || p.mrr || 0) / 100,
        orders: p.orders || 0,
        subscriptions: p.active_subscriptions || 0,
        newSubscriptions: p.new_subscriptions || 0,
      }
    })
  }, [periods])

  const revenueTrend = useMemo(() => {
    if (chartData.length < 2) return null
    const first = chartData[0]?.revenue || 0
    const last = chartData[chartData.length - 1]?.revenue || 0
    if (first === 0) return last > 0 ? 100 : 0
    return Math.round(((last - first) / first) * 100)
  }, [chartData])

  const mrrTrend = useMemo(() => {
    if (chartData.length < 2) return null
    const first = chartData[0]?.mrr || 0
    const last = chartData[chartData.length - 1]?.mrr || 0
    if (first === 0) return last > 0 ? 100 : 0
    return Math.round(((last - first) / first) * 100)
  }, [chartData])

  return (
    <>
      <Header fixed>
        <Search />
        <div className='ml-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='space-y-6'>
        {/* Header Title & Date Range Presets */}
        <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <div className='flex items-center gap-2'>
              <h1 className='text-foreground text-2xl font-bold tracking-tight'>
                {t('navigation.polar.analytics', 'Polar Analytics & Metrics')}
              </h1>
              <Badge variant='outline' className='font-mono text-xs'>
                Live Synced
              </Badge>
            </div>
            <p className='text-muted-foreground mt-0.5 text-sm'>
              {t(
                'paymentProducts.analyticsDesc',
                'Real-time SaaS recurring revenue, subscriber velocity, and order performance.'
              )}
            </p>
          </div>

          <div className='flex flex-wrap items-center gap-2'>
            {/* Quick Range Presets */}
            <div className='border-border bg-muted/40 flex items-center rounded-lg border p-1'>
              {(['7', '30', '90', '365'] as const).map((days) => (
                <Button
                  key={days}
                  variant={rangeDays === days ? 'secondary' : 'ghost'}
                  size='sm'
                  className='h-7 px-2.5 text-xs font-medium'
                  onClick={() => setRangeDays(days)}
                >
                  {days === '7'
                    ? '7D'
                    : days === '30'
                      ? '30D'
                      : days === '90'
                        ? '3M'
                        : '1Y'}
                </Button>
              ))}
            </div>

            {/* Interval Selector */}
            <div className='border-border bg-muted/40 flex items-center rounded-lg border p-1'>
              {(['day', 'week', 'month'] as const).map((int) => (
                <Button
                  key={int}
                  variant={interval === int ? 'secondary' : 'ghost'}
                  size='sm'
                  className='h-7 px-2.5 text-xs font-medium capitalize'
                  onClick={() => setInterval(int)}
                >
                  {int}
                </Button>
              ))}
            </div>

            <Button
              variant='outline'
              size='icon'
              className='h-9 w-9'
              onClick={() => refetchMetrics()}
              title='Refresh Metrics'
            >
              <RefreshCw
                className={`h-4 w-4 ${isMetricsLoading ? 'animate-spin' : ''}`}
              />
            </Button>
          </div>
        </div>

        {/* Organization Banner */}
        {activeOrg && (
          <div className='border-border bg-card flex items-center justify-between rounded-xl border p-4 shadow-sm'>
            <div className='flex items-center space-x-3.5'>
              <div className='bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg'>
                <Building2 className='h-5 w-5' />
              </div>
              <div>
                <p className='text-foreground text-sm font-semibold'>
                  {activeOrg.name || activeOrg.slug}
                </p>
                <p className='text-muted-foreground font-mono text-xs'>
                  Organization ID: {activeOrg.id || activeOrg.slug} | Currency:{' '}
                  {activeOrg.currency?.toUpperCase() || 'USD'}
                </p>
              </div>
            </div>
            <div className='flex items-center gap-2'>
              <span className='inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400'>
                <span className='h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500' />
                Polar Active
              </span>
            </div>
          </div>
        )}

        {/* KPI Cards Grid */}
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'>
          {/* Revenue */}
          <Card className='border-border/70 bg-card hover:border-border shadow-sm transition-colors'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-muted-foreground text-xs font-medium'>
                Total Revenue
              </CardTitle>
              <div className='rounded-md bg-emerald-500/10 p-1 text-emerald-600 dark:text-emerald-400'>
                <DollarSign className='h-4 w-4' />
              </div>
            </CardHeader>
            <CardContent className='space-y-1.5'>
              <div className='text-foreground text-2xl font-bold tracking-tight'>
                $
                {(revenueCents / 100).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </div>
              <div className='text-muted-foreground flex items-center gap-1.5 text-xs'>
                {revenueTrend !== null && (
                  <span
                    className={`inline-flex items-center font-medium ${
                      revenueTrend >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-500'
                    }`}
                  >
                    {revenueTrend >= 0 ? (
                      <TrendingUp className='mr-0.5 h-3 w-3' />
                    ) : (
                      <TrendingDown className='mr-0.5 h-3 w-3' />
                    )}
                    {revenueTrend > 0
                      ? `+${revenueTrend}%`
                      : `${revenueTrend}%`}
                  </span>
                )}
                <span>in {rangeDays}d</span>
              </div>
            </CardContent>
          </Card>

          {/* MRR */}
          <Card className='border-border/70 bg-card hover:border-border shadow-sm transition-colors'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-muted-foreground text-xs font-medium'>
                Monthly Recurring (MRR)
              </CardTitle>
              <div className='rounded-md bg-blue-500/10 p-1 text-blue-600 dark:text-blue-400'>
                <TrendingUp className='h-4 w-4' />
              </div>
            </CardHeader>
            <CardContent className='space-y-1.5'>
              <div className='text-foreground text-2xl font-bold tracking-tight'>
                $
                {(mrrCents / 100).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </div>
              <div className='text-muted-foreground flex items-center gap-1.5 text-xs'>
                {mrrTrend !== null && (
                  <span
                    className={`inline-flex items-center font-medium ${
                      mrrTrend >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-500'
                    }`}
                  >
                    {mrrTrend > 0 ? `+${mrrTrend}%` : `${mrrTrend}%`}
                  </span>
                )}
                <span>annualized run-rate</span>
              </div>
            </CardContent>
          </Card>

          {/* Active Subscriptions */}
          <Card className='border-border/70 bg-card hover:border-border shadow-sm transition-colors'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-muted-foreground text-xs font-medium'>
                Active Subscriptions
              </CardTitle>
              <div className='rounded-md bg-indigo-500/10 p-1 text-indigo-600 dark:text-indigo-400'>
                <Repeat className='h-4 w-4' />
              </div>
            </CardHeader>
            <CardContent className='space-y-1.5'>
              <div className='text-foreground text-2xl font-bold tracking-tight'>
                {activeSubs}
              </div>
              <p className='text-muted-foreground text-xs'>
                Recurring customers
              </p>
            </CardContent>
          </Card>

          {/* Total Orders */}
          <Card className='border-border/70 bg-card hover:border-border shadow-sm transition-colors'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-muted-foreground text-xs font-medium'>
                Total Orders
              </CardTitle>
              <div className='rounded-md bg-violet-500/10 p-1 text-violet-600 dark:text-violet-400'>
                <CreditCard className='h-4 w-4' />
              </div>
            </CardHeader>
            <CardContent className='space-y-1.5'>
              <div className='text-foreground text-2xl font-bold tracking-tight'>
                {ordersCount}
              </div>
              <p className='text-muted-foreground text-xs'>
                Completed checkouts
              </p>
            </CardContent>
          </Card>

          {/* Average Order Value */}
          <Card className='border-border/70 bg-card hover:border-border shadow-sm transition-colors'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-muted-foreground text-xs font-medium'>
                Avg Order Value
              </CardTitle>
              <div className='rounded-md bg-amber-500/10 p-1 text-amber-600 dark:text-amber-400'>
                <ArrowUpRight className='h-4 w-4' />
              </div>
            </CardHeader>
            <CardContent className='space-y-1.5'>
              <div className='text-foreground text-2xl font-bold tracking-tight'>
                $
                {(avgOrderValueCents / 100).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </div>
              <p className='text-muted-foreground text-xs'>
                Revenue per transaction
              </p>
            </CardContent>
          </Card>

          {/* Total Customers */}
          <Card className='border-border/70 bg-card hover:border-border shadow-sm transition-colors'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-muted-foreground text-xs font-medium'>
                Total Customers
              </CardTitle>
              <div className='rounded-md bg-rose-500/10 p-1 text-rose-600 dark:text-rose-400'>
                <Users className='h-4 w-4' />
              </div>
            </CardHeader>
            <CardContent className='space-y-1.5'>
              <div className='text-foreground text-2xl font-bold tracking-tight'>
                {cumulativeCustomers}
              </div>
              <p className='text-muted-foreground text-xs'>Registered buyers</p>
            </CardContent>
          </Card>
        </div>

        {/* Interactive Chart Section */}
        <Card className='border-border/70 bg-card shadow-sm'>
          <CardHeader className='flex flex-col gap-4 pb-4 sm:flex-row sm:items-center sm:justify-between'>
            <div>
              <CardTitle className='text-foreground flex items-center gap-2 text-base font-semibold'>
                <BarChart3 className='text-primary h-4 w-4' />
                Performance Velocity & Trends
              </CardTitle>
              <CardDescription className='text-muted-foreground mt-1 text-xs'>
                Visual timeline representation across the selected {rangeDays}
                -day interval.
              </CardDescription>
            </div>

            {/* Metric Mode Toggle */}
            <div className='border-border bg-muted/40 flex items-center rounded-lg border p-1'>
              <Button
                variant={
                  activeChartMetric === 'revenue' ? 'secondary' : 'ghost'
                }
                size='sm'
                className='h-7 px-3 text-xs'
                onClick={() => setActiveChartMetric('revenue')}
              >
                Revenue ($)
              </Button>
              <Button
                variant={activeChartMetric === 'mrr' ? 'secondary' : 'ghost'}
                size='sm'
                className='h-7 px-3 text-xs'
                onClick={() => setActiveChartMetric('mrr')}
              >
                MRR ($)
              </Button>
              <Button
                variant={activeChartMetric === 'orders' ? 'secondary' : 'ghost'}
                size='sm'
                className='h-7 px-3 text-xs'
                onClick={() => setActiveChartMetric('orders')}
              >
                Orders (qty)
              </Button>
            </div>
          </CardHeader>

          <CardContent className='pt-2 pb-6'>
            {chartData.length > 0 ? (
              <div className='h-80 w-full'>
                <ResponsiveContainer width='100%' height='100%'>
                  <AreaChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id='colorRevenue'
                        x1='0'
                        y1='0'
                        x2='0'
                        y2='1'
                      >
                        <stop
                          offset='5%'
                          stopColor='#10b981'
                          stopOpacity={0.35}
                        />
                        <stop
                          offset='95%'
                          stopColor='#10b981'
                          stopOpacity={0.0}
                        />
                      </linearGradient>
                      <linearGradient id='colorMrr' x1='0' y1='0' x2='0' y2='1'>
                        <stop
                          offset='5%'
                          stopColor='#3b82f6'
                          stopOpacity={0.35}
                        />
                        <stop
                          offset='95%'
                          stopColor='#3b82f6'
                          stopOpacity={0.0}
                        />
                      </linearGradient>
                      <linearGradient
                        id='colorOrders'
                        x1='0'
                        y1='0'
                        x2='0'
                        y2='1'
                      >
                        <stop
                          offset='5%'
                          stopColor='#8b5cf6'
                          stopOpacity={0.35}
                        />
                        <stop
                          offset='95%'
                          stopColor='#8b5cf6'
                          stopOpacity={0.0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray='3 3'
                      className='stroke-border/40'
                      vertical={false}
                    />
                    <XAxis
                      dataKey='date'
                      stroke='currentColor'
                      className='text-muted-foreground text-[11px]'
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke='currentColor'
                      className='text-muted-foreground text-[11px]'
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) =>
                        activeChartMetric === 'orders' ? String(val) : `$${val}`
                      }
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null
                        const item = payload[0]?.payload
                        return (
                          <div className='border-border bg-popover text-popover-foreground space-y-1 rounded-lg border p-3 text-xs shadow-md'>
                            <p className='text-foreground border-border/50 border-b pb-1 font-semibold'>
                              {item.date}
                            </p>
                            <p className='flex items-center justify-between gap-4'>
                              <span className='text-muted-foreground'>
                                Revenue:
                              </span>
                              <span className='font-bold text-emerald-600 dark:text-emerald-400'>
                                ${item.revenue.toFixed(2)}
                              </span>
                            </p>
                            <p className='flex items-center justify-between gap-4'>
                              <span className='text-muted-foreground'>
                                MRR:
                              </span>
                              <span className='font-medium text-blue-500'>
                                ${item.mrr.toFixed(2)}
                              </span>
                            </p>
                            <p className='flex items-center justify-between gap-4'>
                              <span className='text-muted-foreground'>
                                Orders:
                              </span>
                              <span className='font-medium'>{item.orders}</span>
                            </p>
                          </div>
                        )
                      }}
                    />
                    {activeChartMetric === 'revenue' && (
                      <Area
                        type='monotone'
                        dataKey='revenue'
                        stroke='#10b981'
                        strokeWidth={2}
                        fillOpacity={1}
                        fill='url(#colorRevenue)'
                      />
                    )}
                    {activeChartMetric === 'mrr' && (
                      <Area
                        type='monotone'
                        dataKey='mrr'
                        stroke='#3b82f6'
                        strokeWidth={2}
                        fillOpacity={1}
                        fill='url(#colorMrr)'
                      />
                    )}
                    {activeChartMetric === 'orders' && (
                      <Area
                        type='monotone'
                        dataKey='orders'
                        stroke='#8b5cf6'
                        strokeWidth={2}
                        fillOpacity={1}
                        fill='url(#colorOrders)'
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className='text-muted-foreground flex h-60 flex-col items-center justify-center text-sm'>
                <Sparkles className='mb-2 h-8 w-8 opacity-40' />
                <p>No historical interval data recorded for this selection.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Breakdown by Periods Table */}
        <div className='bg-card border-border/70 rounded-xl border p-6 shadow-sm'>
          <div className='mb-4 flex items-center justify-between'>
            <div>
              <h2 className='text-foreground text-base font-semibold'>
                Period Breakdown Activity
              </h2>
              <p className='text-muted-foreground text-xs'>
                Detailed line-by-line financial metrics for audit and
                reconciliation.
              </p>
            </div>
            {chartData.length > 0 && (
              <Badge variant='outline' className='font-mono text-xs'>
                {chartData.length} records
              </Badge>
            )}
          </div>

          {isMetricsLoading ? (
            <div className='text-muted-foreground flex h-40 items-center justify-center text-sm'>
              <RefreshCw className='mr-2 h-5 w-5 animate-spin' />
              Loading metrics from Polar...
            </div>
          ) : chartData.length > 0 ? (
            <div className='border-border/60 overflow-x-auto rounded-lg border'>
              <table className='w-full text-left text-sm'>
                <thead className='bg-muted/50 text-muted-foreground border-b text-xs font-medium uppercase'>
                  <tr>
                    <th className='px-4 py-3'>Timestamp</th>
                    <th className='px-4 py-3'>Revenue</th>
                    <th className='px-4 py-3'>Orders</th>
                    <th className='px-4 py-3'>Active Subs</th>
                    <th className='px-4 py-3'>New Subs</th>
                    <th className='px-4 py-3'>MRR Run-rate</th>
                  </tr>
                </thead>
                <tbody className='divide-border/50 divide-y'>
                  {chartData.map((p: MetricPeriodItem, idx: number) => (
                    <tr
                      key={idx}
                      className='hover:bg-muted/30 transition-colors'
                    >
                      <td className='text-muted-foreground px-4 py-3 font-mono text-xs'>
                        {p.date}
                      </td>
                      <td className='text-foreground px-4 py-3 font-semibold'>
                        ${p.revenue.toFixed(2)}
                      </td>
                      <td className='px-4 py-3'>{p.orders}</td>
                      <td className='px-4 py-3'>{p.subscriptions}</td>
                      <td className='px-4 py-3 text-xs'>
                        {p.newSubscriptions > 0 ? (
                          <span className='font-medium text-emerald-600 dark:text-emerald-400'>
                            +{p.newSubscriptions}
                          </span>
                        ) : (
                          '0'
                        )}
                      </td>
                      <td className='px-4 py-3 font-medium text-blue-600 dark:text-blue-400'>
                        ${p.mrr.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className='text-muted-foreground flex h-40 items-center justify-center text-sm'>
              No transaction or subscription data recorded for this time
              interval.
            </div>
          )}
        </div>
      </Main>
    </>
  )
}

export default PagePolarAnalytics
