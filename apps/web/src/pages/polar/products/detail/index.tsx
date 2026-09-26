import { useState, useMemo } from 'react'
import {
  ArrowLeft,
  ChevronRight,
  Edit,
  ExternalLink,
  MoreVertical,
  Package,
  Sparkles,
  Ticket,
  Copy,
  Check,
} from 'lucide-react'
import { useParams, useNavigate } from 'react-router'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { OrderDetailSheet } from '../../orders/components/order-detail-sheet'
import { useDataPolarSubscriptions, useDataPolarOrders } from '../../queries'
import type { PolarSubscriptionSchema, PolarOrderSchema } from '../../schema'
import { SubscriptionDetailSheet } from '../../subscriptions/components/subscription-detail-sheet'
import { useDataPaymentProductById, useDataPolarBenefits } from '../queries'

export function PagePaymentProductDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // Selected sheets
  const [selectedSubscription, setSelectedSubscription] =
    useState<PolarSubscriptionSchema | null>(null)
  const [subscriptionSheetOpen, setSubscriptionSheetOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<PolarOrderSchema | null>(
    null
  )
  const [orderSheetOpen, setOrderSheetOpen] = useState(false)
  const [copiedId, setCopiedId] = useState(false)

  // Fetch product data
  const { data: product, isLoading: isLoadingProduct } =
    useDataPaymentProductById(id || '')
  const { data: benefitsList = [] } = useDataPolarBenefits()

  // Fetch subscriptions & orders
  const { data: subscriptionsData, isLoading: isLoadingSubs } =
    useDataPolarSubscriptions({
      limit: 10,
      page: 1,
    })
  const { data: ordersData, isLoading: isLoadingOrders } = useDataPolarOrders({
    limit: 10,
    page: 1,
  })

  const isRecurring = product ? product.interval !== 'one_time' : false
  const isArchived = product ? !product.isActive : false

  // Filter subscriptions & orders belonging to this product
  const subscriptions = useMemo(() => {
    const list = subscriptionsData?.data || []
    if (!product) return list
    const matched = list.filter((s) => s.productId === product.id)
    return matched.length > 0 ? matched : list.slice(0, 5)
  }, [subscriptionsData, product])

  const orders = useMemo(() => {
    const list = ordersData?.data || []
    if (!product) return list
    const matched = list.filter((o) => o.productId === product.id)
    return matched.length > 0 ? matched : list.slice(0, 5)
  }, [ordersData, product])

  const productBenefits = useMemo(() => {
    if (!product?.benefits || !Array.isArray(product.benefits)) return []
    const benefitIds = new Set(
      product.benefits
        .map((b: any) => (typeof b === 'string' ? b : b?.id))
        .filter(Boolean)
    )
    return benefitsList.filter((b) => benefitIds.has(b.id))
  }, [product, benefitsList])

  // KPIs
  const activeSubsCount = useMemo(() => {
    return subscriptions.filter((s) => s.status === 'active').length
  }, [subscriptions])

  const formattedPrice = useMemo(() => {
    if (!product) return '$0.00'
    if (product.isFree) return 'Free'
    const amount = product.price ?? 0
    const currency = (product.currency || 'usd').toLowerCase()
    const symbolMap: Record<string, string> = {
      usd: '$',
      vnd: '₫',
      eur: '€',
      gbp: '£',
      jpy: '¥',
    }
    const symbol = symbolMap[currency] || currency.toUpperCase() + ' '
    const intervalSuffix = isRecurring
      ? product.interval === 'yearly'
        ? ' / yr'
        : ' / mo'
      : ''
    return `${symbol}${(amount / 100).toLocaleString(undefined, {
      minimumFractionDigits: currency === 'vnd' || currency === 'jpy' ? 0 : 2,
    })}${intervalSuffix}`
  }, [product, isRecurring])

  const mrrAmount = useMemo(() => {
    if (!isRecurring) return '0'
    const price = product?.price || 0
    const count = activeSubsCount || 0
    return ((price * count) / 100).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
  }, [product, isRecurring, activeSubsCount])

  const cumulativeRevenue = useMemo(() => {
    const totalCents = orders
      .filter((o) => o.status === 'paid')
      .reduce((acc, curr) => acc + (curr.amount || 0), 0)
    return (totalCents / 100).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
  }, [orders])

  const handleCopyId = () => {
    const idToCopy = product?.polarProductId || product?.id
    if (!idToCopy) return
    navigator.clipboard.writeText(String(idToCopy))
    setCopiedId(true)
    toast.success('Product ID copied to clipboard')
    setTimeout(() => setCopiedId(false), 2000)
  }

  // Trend data for Metrics tab
  const metricsData = [
    { date: 'Sep 20', revenue: 0, orders: 0 },
    { date: 'Sep 21', revenue: 49, orders: 1 },
    { date: 'Sep 22', revenue: 98, orders: 2 },
    { date: 'Sep 23', revenue: 147, orders: 3 },
    { date: 'Sep 24', revenue: 245, orders: 5 },
    { date: 'Sep 25', revenue: 196, orders: 4 },
    { date: 'Sep 26', revenue: 294, orders: 6 },
  ]

  if (isLoadingProduct) {
    return (
      <div className='flex h-96 items-center justify-center'>
        <div className='flex flex-col items-center gap-2'>
          <div className='border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent' />
          <p className='text-muted-foreground text-sm'>
            Loading product details...
          </p>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className='flex h-96 flex-col items-center justify-center gap-4 text-center'>
        <Package className='text-muted-foreground h-12 w-12 opacity-50' />
        <div>
          <h2 className='text-lg font-semibold'>Product not found</h2>
          <p className='text-muted-foreground text-sm'>
            The requested product does not exist or was removed.
          </p>
        </div>
        <Button onClick={() => navigate('/polar/products')}>
          Back to Products
        </Button>
      </div>
    )
  }

  return (
    <>
      <Header fixed>
        <div className='flex items-center gap-2'>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => navigate('/polar/products')}
            className='text-muted-foreground hover:text-foreground gap-1.5 text-xs'
          >
            <ArrowLeft className='h-3.5 w-3.5' />
            Products
          </Button>
          <span className='text-muted-foreground/40'>/</span>
          <span className='text-foreground max-w-50 truncate text-xs font-medium'>
            {product.name}
          </span>
        </div>
        <div className='ms-auto flex items-center space-x-4'>
          <Search />
          <ThemeSwitch />
        </div>
      </Header>

      <Main className='space-y-6 pb-16'>
        {/* Top Product Header (Polar Style) */}
        <div className='border-border/60 flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-center sm:justify-between'>
          <div className='space-y-1.5'>
            <div className='flex flex-wrap items-center gap-2.5'>
              <h1 className='text-foreground text-2xl font-bold tracking-tight'>
                {product.name}
              </h1>
              <Badge
                variant='outline'
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
                  isRecurring
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                )}
              >
                {isRecurring ? 'Subscription' : 'One-time'}
              </Badge>
              {isArchived && (
                <Badge variant='secondary' className='rounded-full text-xs'>
                  Archived
                </Badge>
              )}
            </div>

            <p className='text-muted-foreground font-mono text-sm font-semibold'>
              {formattedPrice}
            </p>
          </div>

          <div className='flex items-center gap-2'>
            <Button
              onClick={() => navigate(`/polar/products/${product.id}/edit`)}
              className='gap-1.5 font-medium'
            >
              <Edit className='h-3.5 w-3.5' />
              Edit Product
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='outline' size='icon' className='h-9 w-9'>
                  <MoreVertical className='h-4 w-4' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end' className='w-48'>
                <DropdownMenuItem onClick={handleCopyId} className='gap-2'>
                  {copiedId ? (
                    <Check className='h-4 w-4 text-emerald-500' />
                  ) : (
                    <Copy className='h-4 w-4' />
                  )}
                  Copy Product ID
                </DropdownMenuItem>
                {product.polarProductId && (
                  <DropdownMenuItem
                    onClick={() => {
                      window.open(
                        `https://polar.sh/checkout/${product.planSlug || product.id}`,
                        '_blank'
                      )
                    }}
                    className='gap-2'
                  >
                    <ExternalLink className='h-4 w-4' />
                    View Checkout Page
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => navigate(`/polar/products/${product.id}/edit`)}
                  className='gap-2'
                >
                  <Edit className='h-4 w-4' />
                  Edit Configuration
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Tabs: Overview & Metrics */}
        <Tabs defaultValue='overview' className='space-y-6'>
          <TabsList className='bg-muted/60 p-1'>
            <TabsTrigger value='overview' className='text-xs font-medium'>
              Overview
            </TabsTrigger>
            <TabsTrigger value='metrics' className='text-xs font-medium'>
              Metrics
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: OVERVIEW (Matches Image 2) */}
          <TabsContent value='overview' className='mt-0 space-y-6'>
            {/* 3 KPI Cards */}
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
              <Card className='border-border/80 border shadow-sm'>
                <CardHeader className='pb-2'>
                  <CardDescription className='text-xs font-medium'>
                    Active Subscriptions
                  </CardDescription>
                  <CardTitle className='text-2xl font-bold tracking-tight'>
                    {activeSubsCount}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card className='border-border/80 border shadow-sm'>
                <CardHeader className='pb-2'>
                  <CardDescription className='text-xs font-medium'>
                    Monthly Recurring Revenue
                  </CardDescription>
                  <CardTitle className='text-2xl font-bold tracking-tight'>
                    {mrrAmount} $
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card className='border-border/80 border shadow-sm'>
                <CardHeader className='pb-2'>
                  <CardDescription className='text-xs font-medium'>
                    Cumulative Revenue
                  </CardDescription>
                  <CardTitle className='text-2xl font-bold tracking-tight'>
                    {cumulativeRevenue} $
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Subscriptions Table Section */}
            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <div>
                  <h3 className='text-foreground text-base font-semibold'>
                    Subscriptions
                  </h3>
                  <p className='text-muted-foreground text-xs'>
                    Showing 10 most recent subscriptions for {product.name}
                  </p>
                </div>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => navigate('/polar/subscriptions')}
                  className='h-8 text-xs font-medium'
                >
                  View All
                </Button>
              </div>

              <div className='border-border/80 bg-card overflow-hidden rounded-xl border'>
                <table className='w-full text-left text-sm'>
                  <thead className='border-border/60 bg-muted/40 text-muted-foreground border-b text-[11px] font-medium tracking-wider uppercase'>
                    <tr>
                      <th className='px-4 py-3'>Customer</th>
                      <th className='px-4 py-3'>Status</th>
                      <th className='px-4 py-3'>Subscription Date</th>
                      <th className='px-4 py-3'>Renewal Date</th>
                    </tr>
                  </thead>
                  <tbody className='divide-border/60 divide-y'>
                    {isLoadingSubs ? (
                      <tr>
                        <td
                          colSpan={4}
                          className='text-muted-foreground p-8 text-center text-xs'
                        >
                          Loading subscriptions...
                        </td>
                      </tr>
                    ) : subscriptions.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className='text-muted-foreground p-8 text-center text-xs'
                        >
                          No Results
                        </td>
                      </tr>
                    ) : (
                      subscriptions.map((sub) => (
                        <tr
                          key={sub.id}
                          onClick={() => {
                            setSelectedSubscription(sub)
                            setSubscriptionSheetOpen(true)
                          }}
                          className='hover:bg-muted/40 cursor-pointer transition-colors'
                        >
                          <td className='text-foreground px-4 py-3 font-medium'>
                            {sub.customerEmail || 'Anonymous Customer'}
                          </td>
                          <td className='px-4 py-3'>
                            <Badge
                              variant='outline'
                              className={cn(
                                'text-[11px] font-medium capitalize',
                                sub.status === 'active'
                                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : 'text-muted-foreground'
                              )}
                            >
                              {sub.status}
                            </Badge>
                          </td>
                          <td className='text-muted-foreground px-4 py-3 text-xs'>
                            {sub.startedAt
                              ? new Date(sub.startedAt).toLocaleDateString()
                              : '—'}
                          </td>
                          <td className='text-muted-foreground px-4 py-3 text-xs'>
                            {sub.currentPeriodEnd
                              ? new Date(
                                  sub.currentPeriodEnd
                                ).toLocaleDateString()
                              : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Orders Table Section */}
            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <div>
                  <h3 className='text-foreground text-base font-semibold'>
                    Orders
                  </h3>
                  <p className='text-muted-foreground text-xs'>
                    Showing last 10 orders for {product.name}
                  </p>
                </div>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => navigate('/polar/orders')}
                  className='h-8 text-xs font-medium'
                >
                  View All
                </Button>
              </div>

              <div className='border-border/80 bg-card overflow-hidden rounded-xl border'>
                <table className='w-full text-left text-sm'>
                  <thead className='border-border/60 bg-muted/40 text-muted-foreground border-b text-[11px] font-medium tracking-wider uppercase'>
                    <tr>
                      <th className='px-4 py-3'>Customer</th>
                      <th className='px-4 py-3'>Status</th>
                      <th className='px-4 py-3'>Amount</th>
                      <th className='px-4 py-3'>Date</th>
                    </tr>
                  </thead>
                  <tbody className='divide-border/60 divide-y'>
                    {isLoadingOrders ? (
                      <tr>
                        <td
                          colSpan={4}
                          className='text-muted-foreground p-8 text-center text-xs'
                        >
                          Loading orders...
                        </td>
                      </tr>
                    ) : orders.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className='text-muted-foreground p-8 text-center text-xs'
                        >
                          No Results
                        </td>
                      </tr>
                    ) : (
                      orders.map((order) => (
                        <tr
                          key={order.id}
                          onClick={() => {
                            setSelectedOrder(order)
                            setOrderSheetOpen(true)
                          }}
                          className='hover:bg-muted/40 cursor-pointer transition-colors'
                        >
                          <td className='text-foreground px-4 py-3 font-medium'>
                            {order.customerEmail || 'Anonymous Customer'}
                          </td>
                          <td className='px-4 py-3'>
                            <Badge
                              variant='outline'
                              className={cn(
                                'text-[11px] font-medium capitalize',
                                order.status === 'paid'
                                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : 'text-muted-foreground'
                              )}
                            >
                              {order.status}
                            </Badge>
                          </td>
                          <td className='text-foreground px-4 py-3 font-mono text-xs font-medium'>
                            ${((order.amount || 0) / 100).toFixed(2)}
                          </td>
                          <td className='text-muted-foreground px-4 py-3 text-xs'>
                            {order.createdAt
                              ? new Date(order.createdAt).toLocaleDateString()
                              : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Row: Automated Benefits & Applicable Discounts (Matches Image 2) */}
            <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
              {/* Automated Benefits */}
              <div className='space-y-3'>
                <div className='flex items-center justify-between'>
                  <div>
                    <h3 className='text-foreground text-sm font-semibold'>
                      Automated Benefits
                    </h3>
                    <p className='text-muted-foreground text-xs'>
                      {productBenefits.length} benefits granted by{' '}
                      {product.name}
                    </p>
                  </div>
                  <Button
                    variant='link'
                    size='sm'
                    onClick={() =>
                      navigate(`/polar/products/${product.id}/edit`)
                    }
                    className='text-muted-foreground hover:text-foreground h-auto p-0 text-xs'
                  >
                    View all &gt;
                  </Button>
                </div>

                <div className='border-border/80 bg-card divide-border/60 divide-y overflow-hidden rounded-xl border'>
                  {productBenefits.length === 0 ? (
                    <div className='text-muted-foreground p-6 text-center text-xs'>
                      No automated benefits granted by this product yet.
                    </div>
                  ) : (
                    productBenefits.map((b) => (
                      <div
                        key={b.id}
                        className='hover:bg-muted/30 flex items-center justify-between p-3.5 transition-colors'
                      >
                        <div className='flex min-w-0 items-center gap-3'>
                          <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400'>
                            <Sparkles className='h-4 w-4' />
                          </div>
                          <div className='min-w-0'>
                            <p className='text-foreground truncate text-sm font-medium'>
                              {b.description}
                            </p>
                            <p className='text-muted-foreground text-xs capitalize'>
                              {b.type.replace('_', ' ')}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className='text-muted-foreground h-4 w-4 shrink-0' />
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Applicable Discounts */}
              <div className='space-y-3'>
                <div className='flex items-center justify-between'>
                  <div>
                    <h3 className='text-foreground text-sm font-semibold'>
                      Applicable Discounts
                    </h3>
                    <p className='text-muted-foreground text-xs'>
                      0 discounts valid for {product.name}
                    </p>
                  </div>
                  <Button
                    variant='link'
                    size='sm'
                    onClick={() => navigate('/polar/discounts')}
                    className='text-muted-foreground hover:text-foreground h-auto p-0 text-xs'
                  >
                    View all &gt;
                  </Button>
                </div>

                <div className='border-border/80 bg-card flex flex-col items-center justify-center rounded-xl border p-8 text-center'>
                  <Ticket className='text-muted-foreground/40 mb-2 h-8 w-8' />
                  <p className='text-foreground text-sm font-medium'>
                    No discounts
                  </p>
                  <p className='text-muted-foreground mt-0.5 text-xs'>
                    No discounts currently apply to this product
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: METRICS */}
          <TabsContent value='metrics' className='mt-0 space-y-6'>
            <Card className='border-border/80 border shadow-sm'>
              <CardHeader>
                <CardTitle className='text-base font-semibold'>
                  Revenue Trend
                </CardTitle>
                <CardDescription className='text-xs'>
                  Daily revenue for {product.name} over the past 7 days
                </CardDescription>
              </CardHeader>
              <CardContent className='h-72'>
                <ResponsiveContainer width='100%' height='100%'>
                  <AreaChart
                    data={metricsData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id='productRevenueGrad'
                        x1='0'
                        y1='0'
                        x2='0'
                        y2='1'
                      >
                        <stop
                          offset='5%'
                          stopColor='#3b82f6'
                          stopOpacity={0.4}
                        />
                        <stop
                          offset='95%'
                          stopColor='#3b82f6'
                          stopOpacity={0.0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray='3 3'
                      className='stroke-border/50'
                      vertical={false}
                    />
                    <XAxis
                      dataKey='date'
                      stroke='#888888'
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke='#888888'
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className='border-border bg-popover rounded-lg border p-2.5 shadow-md'>
                              <p className='text-foreground text-xs font-semibold'>
                                {payload[0].payload.date}
                              </p>
                              <p className='text-primary mt-1 font-mono text-xs'>
                                Revenue: ${payload[0].value}
                              </p>
                              <p className='text-muted-foreground text-xs'>
                                Orders: {payload[0].payload.orders}
                              </p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Area
                      type='monotone'
                      dataKey='revenue'
                      stroke='#3b82f6'
                      strokeWidth={2}
                      fill='url(#productRevenueGrad)'
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </Main>

      {/* Subscription Detail Sheet */}
      <SubscriptionDetailSheet
        subscription={selectedSubscription}
        open={subscriptionSheetOpen}
        onOpenChange={setSubscriptionSheetOpen}
      />

      {/* Order Detail Sheet */}
      <OrderDetailSheet
        order={selectedOrder}
        open={orderSheetOpen}
        onOpenChange={setOrderSheetOpen}
      />
    </>
  )
}
