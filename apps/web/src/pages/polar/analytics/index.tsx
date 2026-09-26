import { useState, useMemo } from 'react'
import {
  TrendingUp,
  CreditCard,
  Users,
  Repeat,
  DollarSign,
  Calendar,
  Building2,
  RefreshCw,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { useDataPolarMetrics, useDataPolarOrganizations } from '../queries'

export function PagePolarAnalytics() {
  const { t } = useTranslation()
  const [rangeDays, setRangeDays] = useState('30')
  const [interval, setInterval] = useState<'day' | 'week' | 'month'>('day')

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

  return (
    <>
      <Header fixed>
        <Search />
        <div className='ml-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>
              {t('navigation.polar.analytics', 'Polar Analytics & Metrics')}
            </h1>
            <p className='text-muted-foreground text-sm'>
              Real-time subscription metrics, revenue, and order velocity synced
              with Polar.
            </p>
          </div>

          <div className='flex items-center gap-2'>
            <Select value={rangeDays} onValueChange={setRangeDays}>
              <SelectTrigger className='w-[140px]'>
                <Calendar className='mr-2 h-4 w-4' />
                <SelectValue placeholder='Select Range' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='7'>Last 7 days</SelectItem>
                <SelectItem value='30'>Last 30 days</SelectItem>
                <SelectItem value='90'>Last 90 days</SelectItem>
                <SelectItem value='365'>Last 1 year</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={interval}
              onValueChange={(val: 'day' | 'week' | 'month') =>
                setInterval(val)
              }
            >
              <SelectTrigger className='w-[120px]'>
                <SelectValue placeholder='Interval' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='day'>Daily</SelectItem>
                <SelectItem value='week'>Weekly</SelectItem>
                <SelectItem value='month'>Monthly</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant='outline'
              size='icon'
              onClick={() => refetchMetrics()}
              title='Refresh Metrics'
            >
              <RefreshCw className='h-4 w-4' />
            </Button>
          </div>
        </div>

        {/* Organization Banner */}
        {activeOrg && (
          <div className='border-primary/20 bg-primary/5 mb-6 flex items-center justify-between rounded-lg border p-4'>
            <div className='flex items-center space-x-3'>
              <Building2 className='text-primary h-6 w-6' />
              <div>
                <p className='text-sm font-semibold'>
                  Connected Organization: {activeOrg.name || activeOrg.slug}
                </p>
                <p className='text-muted-foreground text-xs'>
                  Slug: {activeOrg.slug} | Currency:{' '}
                  {activeOrg.currency?.toUpperCase() || 'USD'}
                </p>
              </div>
            </div>
            <span className='inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400'>
              ● Polar Active
            </span>
          </div>
        )}

        {/* KPI Grid */}
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'>
          <Card className='relative overflow-hidden'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-muted-foreground text-xs font-medium'>
                Total Revenue
              </CardTitle>
              <DollarSign className='h-4 w-4 text-emerald-500' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                $
                {(revenueCents / 100).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </div>
              <p className='text-muted-foreground mt-1 text-xs'>
                In selected {rangeDays} days
              </p>
            </CardContent>
          </Card>

          <Card className='relative overflow-hidden'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-muted-foreground text-xs font-medium'>
                Monthly Recurring (MRR)
              </CardTitle>
              <TrendingUp className='h-4 w-4 text-blue-500' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                $
                {(mrrCents / 100).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </div>
              <p className='text-muted-foreground mt-1 text-xs'>
                Normalized recurring run-rate
              </p>
            </CardContent>
          </Card>

          <Card className='relative overflow-hidden'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-muted-foreground text-xs font-medium'>
                Active Subscriptions
              </CardTitle>
              <Repeat className='h-4 w-4 text-indigo-500' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{activeSubs}</div>
              <p className='text-muted-foreground mt-1 text-xs'>
                Paying recurring members
              </p>
            </CardContent>
          </Card>

          <Card className='relative overflow-hidden'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-muted-foreground text-xs font-medium'>
                Total Orders
              </CardTitle>
              <CreditCard className='h-4 w-4 text-violet-500' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{ordersCount}</div>
              <p className='text-muted-foreground mt-1 text-xs'>
                Completed transactions
              </p>
            </CardContent>
          </Card>

          <Card className='relative overflow-hidden'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-muted-foreground text-xs font-medium'>
                Avg Order Value
              </CardTitle>
              <DollarSign className='h-4 w-4 text-amber-500' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                $
                {(avgOrderValueCents / 100).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </div>
              <p className='text-muted-foreground mt-1 text-xs'>
                Revenue per order
              </p>
            </CardContent>
          </Card>

          <Card className='relative overflow-hidden'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-muted-foreground text-xs font-medium'>
                Total Customers
              </CardTitle>
              <Users className='h-4 w-4 text-rose-500' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{cumulativeCustomers}</div>
              <p className='text-muted-foreground mt-1 text-xs'>
                Cumulative profiles
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Breakdown by Periods */}
        <div className='bg-card mt-8 rounded-lg border p-6 shadow-sm'>
          <h2 className='mb-4 text-base font-semibold'>
            Period Activity Breakdown
          </h2>
          {isMetricsLoading ? (
            <div className='text-muted-foreground flex h-40 items-center justify-center text-sm'>
              Loading metrics from Polar...
            </div>
          ) : metricsData?.periods && metricsData.periods.length > 0 ? (
            <div className='overflow-x-auto'>
              <table className='w-full text-left text-sm'>
                <thead className='bg-muted/50 text-muted-foreground border-b text-xs font-medium uppercase'>
                  <tr>
                    <th className='px-4 py-3'>Timestamp</th>
                    <th className='px-4 py-3'>Revenue</th>
                    <th className='px-4 py-3'>Orders</th>
                    <th className='px-4 py-3'>Active Subs</th>
                    <th className='px-4 py-3'>New Subs</th>
                    <th className='px-4 py-3'>MRR</th>
                  </tr>
                </thead>
                <tbody className='divide-y'>
                  {metricsData.periods.map((p: any, idx: number) => (
                    <tr key={idx} className='hover:bg-muted/30'>
                      <td className='px-4 py-3 font-mono text-xs'>
                        {p.timestamp
                          ? new Date(p.timestamp).toLocaleDateString()
                          : `Period ${idx + 1}`}
                      </td>
                      <td className='px-4 py-3 font-medium'>
                        ${((p.revenue || 0) / 100).toFixed(2)}
                      </td>
                      <td className='px-4 py-3'>{p.orders ?? 0}</td>
                      <td className='px-4 py-3'>
                        {p.active_subscriptions ?? 0}
                      </td>
                      <td className='px-4 py-3'>+{p.new_subscriptions ?? 0}</td>
                      <td className='px-4 py-3 font-medium text-emerald-600 dark:text-emerald-400'>
                        ${((p.monthly_recurring_revenue || 0) / 100).toFixed(2)}
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
