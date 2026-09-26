import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import {
  ArrowLeft,
  Package,
  Calendar,
  ExternalLink,
  Sparkles,
  CreditCard,
  CheckCircle2,
  Copy,
  Check,
  TrendingUp,
  Users,
  DollarSign,
  Image as ImageIcon,
  Layers,
  Clock,
  Tag,
  ArrowUpRight,
  Eye,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import DataLoader from '@/components/layout/data-loader'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import {
  useDataPolarOrders,
  useDataPolarProduct,
  useDataPolarSubscriptions,
} from '../queries'

export function PagePolarProductDetail() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const { data: product, isLoading: isLoadingProduct } = useDataPolarProduct(id)
  const { data: subscriptionsData, isLoading: isLoadingSubs } =
    useDataPolarSubscriptions({
      limit: 50,
      page: 1,
    })
  const { data: ordersData, isLoading: isLoadingOrders } = useDataPolarOrders({
    limit: 50,
    page: 1,
  })

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    toast.success('Copied to clipboard!')
    setTimeout(() => setCopiedKey(null), 2000)
  }

  // Filter subscriptions & orders belonging to this product
  const subscriptions = useMemo(() => {
    const list = subscriptionsData?.data || []
    if (!product?.id) return []
    return list.filter((s: any) => s.productId === product.id)
  }, [subscriptionsData, product?.id])

  const orders = useMemo(() => {
    const list = ordersData?.data || []
    if (!product?.id) return []
    return list.filter((o: any) => o.productId === product.id)
  }, [ordersData, product?.id])

  const activeSubsCount = useMemo(() => {
    return subscriptions.filter((s: any) => s.status === 'active').length
  }, [subscriptions])

  // MRR estimation
  const mrrAmount = useMemo(() => {
    if (!product?.isRecurring) return '$0'
    const totalMRRInCents = subscriptions
      .filter((s: any) => s.status === 'active')
      .reduce((acc: number, s: any) => {
        const amt = s.amount ?? 0
        if (s.recurringInterval === 'year') {
          return acc + amt / 12
        }
        return acc + amt
      }, 0)
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(totalMRRInCents / 100)
  }, [product?.isRecurring, subscriptions])

  // Cumulative revenue from paid orders
  const cumulativeRevenue = useMemo(() => {
    const paidOrders = orders.filter((o: any) => o.status === 'paid')
    const totalCents = paidOrders.reduce(
      (acc: number, curr: any) => acc + (curr.amount || 0),
      0
    )
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(totalCents / 100)
  }, [orders])

  // 7-day revenue & order trend data for Metrics tab
  const metricsData = useMemo(() => {
    const days: {
      date: string
      rawDate: string
      revenue: number
      orders: number
    }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = format(d, 'MMM dd')
      const rawDateStr = format(d, 'yyyy-MM-dd')
      days.push({ date: dateStr, rawDate: rawDateStr, revenue: 0, orders: 0 })
    }

    orders.forEach((o: any) => {
      if (o.status === 'paid' && o.createdAt) {
        try {
          const orderDateStr = format(new Date(o.createdAt), 'yyyy-MM-dd')
          const day = days.find((d) => d.rawDate === orderDateStr)
          if (day) {
            day.revenue += (o.amount || 0) / 100
            day.orders += 1
          }
        } catch {
          // ignore malformed date
        }
      }
    })

    return days
  }, [orders])

  const formatPrice = (price: any) => {
    if (!price) return 'Free'
    const rawAmount =
      price.priceAmount ?? price.price_amount ?? price.amount ?? 0
    const currency = (
      price.priceCurrency ??
      price.price_currency ??
      price.currency ??
      'USD'
    ).toUpperCase()
    const interval = price.recurringInterval ?? price.recurring_interval

    const amount = rawAmount / 100
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'VND' ? 0 : 2,
      minimumFractionDigits: currency === 'VND' ? 0 : 2,
    }).format(amount)

    return `${formatted}${interval ? ` / ${interval}` : ''}`
  }

  if (isLoadingProduct) return <DataLoader />
  if (!product) {
    return (
      <Main className='flex h-[70vh] flex-col items-center justify-center space-y-4'>
        <p className='text-muted-foreground text-sm'>Product not found.</p>
        <Button variant='outline' onClick={() => navigate('/polar/products')}>
          <ArrowLeft className='mr-2 h-4 w-4' />
          Back to Products
        </Button>
      </Main>
    )
  }

  return (
    <>
      <Header fixed>
        <div className='flex items-center gap-3'>
          <Button
            variant='ghost'
            size='icon'
            className='h-8 w-8'
            onClick={() => navigate('/polar/products')}
          >
            <ArrowLeft className='h-4 w-4' />
          </Button>
          <div className='flex items-center gap-2'>
            <Package className='text-primary h-5 w-5' />
            <span className='text-muted-foreground text-sm font-medium'>
              Products
            </span>
            <span className='text-muted-foreground/40 text-sm'>/</span>
            <h1 className='text-foreground max-w-sm truncate text-base font-semibold tracking-tight'>
              {product.name || 'Product Detail'}
            </h1>
          </div>
        </div>
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-6 p-6 pb-16'>
        {/* Hero Card */}
        <div className='from-muted/60 via-muted/20 to-background rounded-2xl border bg-gradient-to-b p-6 shadow-sm'>
          <div className='flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between'>
            <div className='flex items-start gap-4'>
              <div className='bg-primary/10 text-primary ring-primary/20 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-sm ring-1'>
                <Package className='h-7 w-7' />
              </div>
              <div className='space-y-1.5'>
                <div className='flex flex-wrap items-center gap-2.5'>
                  <h2 className='text-foreground text-2xl font-bold tracking-tight'>
                    {product.name}
                  </h2>
                  <Badge
                    variant={product.isRecurring ? 'default' : 'secondary'}
                    className='text-xs'
                  >
                    {product.isRecurring ? 'Subscription' : 'One-time'}
                  </Badge>
                  <Badge
                    variant={product.isArchived ? 'destructive' : 'outline'}
                    className='text-xs'
                  >
                    {product.isArchived ? 'Archived' : 'Active'}
                  </Badge>
                  {product.isPopular && (
                    <Badge className='border-amber-500/30 bg-amber-500/15 text-xs text-amber-700 dark:text-amber-400'>
                      Popular
                    </Badge>
                  )}
                </div>
                <p className='text-muted-foreground max-w-2xl text-sm leading-relaxed'>
                  {product.description || 'No description provided.'}
                </p>
              </div>
            </div>

            <div className='flex flex-wrap items-center gap-2.5'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => handleCopy(product.id, 'productId')}
                className='h-9 gap-1.5 text-xs'
              >
                {copiedKey === 'productId' ? (
                  <>
                    <Check className='h-3.5 w-3.5 text-emerald-500' />
                    ID Copied
                  </>
                ) : (
                  <>
                    <Copy className='h-3.5 w-3.5' />
                    Copy ID
                  </>
                )}
              </Button>
              <Button
                size='sm'
                onClick={() =>
                  window.open('https://sandbox.polar.sh/dashboard', '_blank')
                }
                className='h-9 gap-1.5 text-xs'
              >
                <ExternalLink className='h-3.5 w-3.5' />
                Manage on Polar
              </Button>
            </div>
          </div>
        </div>

        {/* 3 Top KPI Cards */}
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
          <Card className='gap-2 py-4'>
            <CardHeader className='flex flex-row items-center justify-between pb-0'>
              <CardDescription className='text-xs font-medium tracking-wider uppercase'>
                Active Subscriptions
              </CardDescription>
              <Users className='text-muted-foreground h-4 w-4' />
            </CardHeader>
            <CardContent>
              <div className='text-foreground text-2xl font-bold'>
                {activeSubsCount}
              </div>
              <p className='text-muted-foreground mt-1 text-xs'>
                Currently active subscribers
              </p>
            </CardContent>
          </Card>

          <Card className='gap-2 py-4'>
            <CardHeader className='flex flex-row items-center justify-between pb-0'>
              <CardDescription className='text-xs font-medium tracking-wider uppercase'>
                Monthly Recurring Revenue
              </CardDescription>
              <TrendingUp className='text-primary h-4 w-4' />
            </CardHeader>
            <CardContent>
              <div className='text-foreground text-2xl font-bold'>
                {mrrAmount}
              </div>
              <p className='text-muted-foreground mt-1 text-xs'>
                Estimated normalized MRR
              </p>
            </CardContent>
          </Card>

          <Card className='gap-2 py-4'>
            <CardHeader className='flex flex-row items-center justify-between pb-0'>
              <CardDescription className='text-xs font-medium tracking-wider uppercase'>
                Cumulative Revenue
              </CardDescription>
              <DollarSign className='h-4 w-4 text-emerald-500' />
            </CardHeader>
            <CardContent>
              <div className='text-foreground text-2xl font-bold'>
                {cumulativeRevenue}
              </div>
              <p className='text-muted-foreground mt-1 text-xs'>
                Total recorded paid order volume
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs: Overview & Metrics */}
        <Tabs defaultValue='overview' className='space-y-6'>
          <TabsList className='bg-muted/70 p-1'>
            <TabsTrigger value='overview' className='text-xs font-medium'>
              Overview
            </TabsTrigger>
            <TabsTrigger value='metrics' className='text-xs font-medium'>
              Metrics & Analytics
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: OVERVIEW */}
          <TabsContent value='overview' className='mt-0 space-y-6'>
            <div className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
              {/* Left / Main Column (2 spans) */}
              <div className='space-y-6 lg:col-span-2'>
                {/* Pricing Tiers Section */}
                <div className='space-y-3'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                      <CreditCard className='text-primary h-4 w-4' />
                      <h3 className='text-foreground text-sm font-bold tracking-wider uppercase'>
                        Pricing Tiers ({product.prices?.length || 0})
                      </h3>
                    </div>
                  </div>

                  <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                    {product.prices && product.prices.length > 0 ? (
                      product.prices.map((price: any) => (
                        <div
                          key={price.id}
                          className='bg-card/70 space-y-3 rounded-xl border p-4 shadow-sm'
                        >
                          <div className='flex items-center justify-between'>
                            <span className='text-muted-foreground text-xs font-semibold tracking-wider uppercase'>
                              {price.recurringInterval ||
                                (product.isRecurring
                                  ? 'Recurring'
                                  : 'One-time')}
                            </span>
                            <Badge
                              variant='outline'
                              className='font-mono text-xs font-medium'
                            >
                              {(
                                price.priceCurrency ??
                                price.currency ??
                                'USD'
                              ).toUpperCase()}
                            </Badge>
                          </div>
                          <p className='text-foreground text-2xl font-bold tracking-tight'>
                            {formatPrice(price)}
                          </p>
                          <div className='flex items-center justify-between border-t pt-2'>
                            <span className='text-muted-foreground truncate font-mono text-[11px]'>
                              ID: {price.id}
                            </span>
                            <Button
                              variant='ghost'
                              size='icon'
                              className='h-6 w-6'
                              onClick={() => handleCopy(price.id, price.id)}
                            >
                              {copiedKey === price.id ? (
                                <Check className='h-3 w-3 text-emerald-500' />
                              ) : (
                                <Copy className='text-muted-foreground h-3 w-3' />
                              )}
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className='bg-muted/40 text-muted-foreground col-span-2 rounded-xl border p-6 text-center text-xs italic'>
                        No pricing tiers attached (Free product)
                      </div>
                    )}
                  </div>
                </div>

                {/* Included Benefits Section */}
                <div className='space-y-3'>
                  <div className='flex items-center gap-2'>
                    <Sparkles className='h-4 w-4 text-amber-500' />
                    <h3 className='text-foreground text-sm font-bold tracking-wider uppercase'>
                      Included Benefits ({product.benefits?.length || 0})
                    </h3>
                  </div>

                  {product.benefits && product.benefits.length > 0 ? (
                    <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                      {product.benefits.map((benefit: any) => (
                        <div
                          key={benefit.id}
                          className='bg-card/60 flex items-start gap-3 rounded-xl border p-4 shadow-sm'
                        >
                          <CheckCircle2 className='mt-0.5 h-4 w-4 shrink-0 text-emerald-500' />
                          <div className='min-w-0 space-y-1'>
                            <p className='text-foreground text-sm font-medium'>
                              {benefit.description}
                            </p>
                            <div className='flex items-center gap-2'>
                              <Badge
                                variant='outline'
                                className='font-mono text-[10px] capitalize'
                              >
                                {benefit.type?.replace('_', ' ')}
                              </Badge>
                              {benefit.selectable && (
                                <span className='text-muted-foreground text-[10px]'>
                                  Selectable
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className='bg-muted/30 text-muted-foreground rounded-xl border p-6 text-center text-xs'>
                      No automated benefits granted by this product yet.
                    </div>
                  )}
                </div>

                {/* Product Media Gallery (if any) */}
                {product.medias && product.medias.length > 0 && (
                  <div className='space-y-3'>
                    <div className='flex items-center gap-2'>
                      <ImageIcon className='text-primary h-4 w-4' />
                      <h3 className='text-foreground text-sm font-bold tracking-wider uppercase'>
                        Product Media ({product.medias.length})
                      </h3>
                    </div>

                    <div className='grid grid-cols-2 gap-4 sm:grid-cols-3'>
                      {product.medias.map((media: any) => (
                        <div
                          key={media.id}
                          className='bg-card/60 group relative overflow-hidden rounded-xl border shadow-sm'
                        >
                          {media.publicUrl ? (
                            <img
                              src={media.publicUrl}
                              alt={media.name || 'Product media'}
                              className='h-36 w-full object-cover transition-transform duration-200 group-hover:scale-105'
                            />
                          ) : (
                            <div className='bg-muted/50 flex h-36 items-center justify-center'>
                              <ImageIcon className='text-muted-foreground/50 h-8 w-8' />
                            </div>
                          )}
                          <div className='bg-background/80 truncate border-t p-2 text-xs font-medium'>
                            {media.name || media.id}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Subscriptions Table */}
                <div className='space-y-3'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <h3 className='text-foreground text-sm font-bold tracking-wider uppercase'>
                        Recent Subscriptions
                      </h3>
                      <p className='text-muted-foreground text-xs'>
                        Active and recent subscribers for this product
                      </p>
                    </div>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => navigate('/polar/subscriptions')}
                      className='h-8 gap-1.5 text-xs'
                    >
                      View All
                      <ArrowUpRight className='h-3.5 w-3.5' />
                    </Button>
                  </div>

                  <div className='border-border/80 bg-card overflow-hidden rounded-xl border shadow-sm'>
                    <table className='w-full text-left text-sm'>
                      <thead className='border-border/60 bg-muted/40 text-muted-foreground border-b text-[11px] font-medium tracking-wider uppercase'>
                        <tr>
                          <th className='px-4 py-3'>Customer</th>
                          <th className='px-4 py-3'>Status</th>
                          <th className='px-4 py-3'>Subscription Date</th>
                          <th className='px-4 py-3'>Renewal Date</th>
                          <th className='px-4 py-3 text-right'>Action</th>
                        </tr>
                      </thead>
                      <tbody className='divide-border/60 divide-y'>
                        {isLoadingSubs ? (
                          <tr>
                            <td
                              colSpan={5}
                              className='text-muted-foreground p-8 text-center text-xs'
                            >
                              Loading subscriptions...
                            </td>
                          </tr>
                        ) : subscriptions.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              className='text-muted-foreground p-8 text-center text-xs'
                            >
                              No subscriptions found for this product.
                            </td>
                          </tr>
                        ) : (
                          subscriptions.slice(0, 5).map((sub: any) => (
                            <tr
                              key={sub.id}
                              className='hover:bg-muted/40 transition-colors'
                            >
                              <td className='text-foreground px-4 py-3 font-medium'>
                                {sub.customerEmail || 'Anonymous Customer'}
                              </td>
                              <td className='px-4 py-3'>
                                <Badge
                                  variant='outline'
                                  className='text-[11px] capitalize'
                                >
                                  {sub.status}
                                </Badge>
                              </td>
                              <td className='text-muted-foreground px-4 py-3 text-xs'>
                                {sub.startedAt
                                  ? format(
                                      new Date(sub.startedAt),
                                      'MMM dd, yyyy'
                                    )
                                  : '—'}
                              </td>
                              <td className='text-muted-foreground px-4 py-3 text-xs'>
                                {sub.currentPeriodEnd
                                  ? format(
                                      new Date(sub.currentPeriodEnd),
                                      'MMM dd, yyyy'
                                    )
                                  : '—'}
                              </td>
                              <td className='px-4 py-3 text-right'>
                                <Button
                                  variant='ghost'
                                  size='icon'
                                  className='h-7 w-7 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50'
                                  onClick={() =>
                                    navigate('/polar/subscriptions')
                                  }
                                >
                                  <Eye className='h-3.5 w-3.5' />
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Recent Orders Table */}
                <div className='space-y-3'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <h3 className='text-foreground text-sm font-bold tracking-wider uppercase'>
                        Recent Orders
                      </h3>
                      <p className='text-muted-foreground text-xs'>
                        Latest transactions and checkout completions
                      </p>
                    </div>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => navigate('/polar/orders')}
                      className='h-8 gap-1.5 text-xs'
                    >
                      View All
                      <ArrowUpRight className='h-3.5 w-3.5' />
                    </Button>
                  </div>

                  <div className='border-border/80 bg-card overflow-hidden rounded-xl border shadow-sm'>
                    <table className='w-full text-left text-sm'>
                      <thead className='border-border/60 bg-muted/40 text-muted-foreground border-b text-[11px] font-medium tracking-wider uppercase'>
                        <tr>
                          <th className='px-4 py-3'>Customer</th>
                          <th className='px-4 py-3'>Status</th>
                          <th className='px-4 py-3'>Amount</th>
                          <th className='px-4 py-3'>Date</th>
                          <th className='px-4 py-3 text-right'>Action</th>
                        </tr>
                      </thead>
                      <tbody className='divide-border/60 divide-y'>
                        {isLoadingOrders ? (
                          <tr>
                            <td
                              colSpan={5}
                              className='text-muted-foreground p-8 text-center text-xs'
                            >
                              Loading orders...
                            </td>
                          </tr>
                        ) : orders.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              className='text-muted-foreground p-8 text-center text-xs'
                            >
                              No orders found for this product.
                            </td>
                          </tr>
                        ) : (
                          orders.slice(0, 5).map((order: any) => (
                            <tr
                              key={order.id}
                              className='hover:bg-muted/40 transition-colors'
                            >
                              <td className='text-foreground px-4 py-3 font-medium'>
                                {order.customerEmail || 'Customer'}
                              </td>
                              <td className='px-4 py-3'>
                                <Badge
                                  variant='outline'
                                  className='text-[11px] capitalize'
                                >
                                  {order.status}
                                </Badge>
                              </td>
                              <td className='text-foreground px-4 py-3 font-mono text-xs font-semibold'>
                                {new Intl.NumberFormat('en-US', {
                                  style: 'currency',
                                  currency: (
                                    order.currency || 'USD'
                                  ).toUpperCase(),
                                  maximumFractionDigits:
                                    order.currency?.toUpperCase() === 'VND'
                                      ? 0
                                      : 2,
                                }).format((order.amount || 0) / 100)}
                              </td>
                              <td className='text-muted-foreground px-4 py-3 text-xs'>
                                {order.createdAt
                                  ? format(
                                      new Date(order.createdAt),
                                      'MMM dd, yyyy'
                                    )
                                  : '—'}
                              </td>
                              <td className='px-4 py-3 text-right'>
                                <Button
                                  variant='ghost'
                                  size='icon'
                                  className='h-7 w-7 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50'
                                  onClick={() => navigate('/polar/orders')}
                                >
                                  <Eye className='h-3.5 w-3.5' />
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Right Side Column (1 span) */}
              <div className='space-y-6 lg:col-span-1'>
                {/* Technical Specifications */}
                <Card className='gap-4 py-5'>
                  <CardHeader className='pb-2'>
                    <CardTitle className='text-sm font-bold tracking-wider uppercase'>
                      Specifications
                    </CardTitle>
                    <CardDescription className='text-xs'>
                      System identifiers & configuration
                    </CardDescription>
                  </CardHeader>
                  <CardContent className='space-y-4'>
                    <div className='space-y-1.5'>
                      <span className='text-muted-foreground text-xs font-medium tracking-wider uppercase'>
                        Polar Product ID
                      </span>
                      <div className='bg-muted/50 flex items-center justify-between rounded-lg border px-3 py-2'>
                        <span className='truncate font-mono text-xs font-medium'>
                          {product.id}
                        </span>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-6 w-6 shrink-0'
                          onClick={() => handleCopy(product.id, 'spec-id')}
                        >
                          {copiedKey === 'spec-id' ? (
                            <Check className='h-3 w-3 text-emerald-500' />
                          ) : (
                            <Copy className='text-muted-foreground h-3 w-3' />
                          )}
                        </Button>
                      </div>
                    </div>

                    {product.organizationId && (
                      <div className='space-y-1.5'>
                        <span className='text-muted-foreground text-xs font-medium tracking-wider uppercase'>
                          Organization ID
                        </span>
                        <p className='text-foreground font-mono text-xs'>
                          {product.organizationId}
                        </p>
                      </div>
                    )}

                    <div className='grid grid-cols-2 gap-3 border-t pt-3'>
                      <div>
                        <span className='text-muted-foreground text-xs font-medium tracking-wider uppercase'>
                          Billing Type
                        </span>
                        <p className='text-foreground mt-0.5 text-xs font-semibold'>
                          {product.isRecurring ? 'Recurring' : 'One-time'}
                        </p>
                      </div>
                      <div>
                        <span className='text-muted-foreground text-xs font-medium tracking-wider uppercase'>
                          Trial Period
                        </span>
                        <p className='text-foreground mt-0.5 text-xs font-semibold'>
                          {product.trialInterval
                            ? `${product.trialIntervalCount || 1} ${product.trialInterval}`
                            : 'None'}
                        </p>
                      </div>
                    </div>

                    <div className='grid grid-cols-2 gap-3 border-t pt-3'>
                      <div>
                        <span className='text-muted-foreground text-xs font-medium tracking-wider uppercase'>
                          Status
                        </span>
                        <p className='text-foreground mt-0.5 text-xs font-semibold'>
                          {product.isArchived ? 'Archived' : 'Active'}
                        </p>
                      </div>
                      <div>
                        <span className='text-muted-foreground text-xs font-medium tracking-wider uppercase'>
                          Created At
                        </span>
                        <p className='text-foreground mt-0.5 flex items-center gap-1 text-xs font-medium'>
                          <Calendar className='text-muted-foreground h-3 w-3' />
                          {product.createdAt
                            ? format(
                                new Date(product.createdAt),
                                'MMM dd, yyyy'
                              )
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Custom Metadata */}
                <Card className='gap-4 py-5'>
                  <CardHeader className='pb-2'>
                    <div className='flex items-center gap-2'>
                      <Tag className='text-primary h-4 w-4' />
                      <CardTitle className='text-sm font-bold tracking-wider uppercase'>
                        Custom Metadata
                      </CardTitle>
                    </div>
                    <CardDescription className='text-xs'>
                      Key-value attributes synced with Polar
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {product.metadata &&
                    Object.keys(product.metadata).length > 0 ? (
                      <div className='space-y-2'>
                        {Object.entries(product.metadata).map(
                          ([key, value]) => (
                            <div
                              key={key}
                              className='bg-muted/40 flex items-center justify-between rounded-lg border p-2 text-xs'
                            >
                              <span className='text-muted-foreground font-mono font-medium'>
                                {key}:
                              </span>
                              <span className='text-foreground font-semibold'>
                                {String(value)}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <div className='bg-muted/20 text-muted-foreground rounded-lg border border-dashed p-4 text-center text-xs italic'>
                        No metadata tags configured.
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Resources */}
                <Card className='gap-4 py-5'>
                  <CardHeader className='pb-2'>
                    <CardTitle className='text-sm font-bold tracking-wider uppercase'>
                      Quick Resources
                    </CardTitle>
                    <CardDescription className='text-xs'>
                      Helpful links and actions
                    </CardDescription>
                  </CardHeader>
                  <CardContent className='space-y-2'>
                    <Button
                      variant='outline'
                      size='sm'
                      className='w-full justify-between text-xs'
                      onClick={() =>
                        window.open(
                          'https://sandbox.polar.sh/dashboard',
                          '_blank'
                        )
                      }
                    >
                      <span className='flex items-center gap-2'>
                        <Layers className='h-3.5 w-3.5 text-blue-500' />
                        Polar Sandbox Dashboard
                      </span>
                      <ExternalLink className='h-3 w-3' />
                    </Button>
                    <Button
                      variant='outline'
                      size='sm'
                      className='w-full justify-between text-xs'
                      onClick={() => navigate('/polar/webhook-events')}
                    >
                      <span className='flex items-center gap-2'>
                        <Clock className='h-3.5 w-3.5 text-amber-500' />
                        Tracked Webhook Events
                      </span>
                      <ArrowUpRight className='h-3 w-3' />
                    </Button>
                    <Button
                      variant='outline'
                      size='sm'
                      className='w-full justify-between text-xs'
                      onClick={() => navigate('/polar/discounts')}
                    >
                      <span className='flex items-center gap-2'>
                        <Tag className='h-3.5 w-3.5 text-emerald-500' />
                        Coupons & Discounts
                      </span>
                      <ArrowUpRight className='h-3 w-3' />
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: METRICS & ANALYTICS */}
          <TabsContent value='metrics' className='mt-0 space-y-6'>
            <Card className='border-border/80 border py-6 shadow-sm'>
              <CardHeader>
                <CardTitle className='text-base font-semibold'>
                  Revenue & Order Performance
                </CardTitle>
                <CardDescription className='text-xs'>
                  Daily revenue for {product.name} over the past 7 days
                </CardDescription>
              </CardHeader>
              <CardContent className='h-80'>
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
                            <div className='border-border bg-popover rounded-lg border p-3 shadow-md'>
                              <p className='text-foreground text-xs font-semibold'>
                                {payload[0].payload.date}
                              </p>
                              <p className='text-primary mt-1 font-mono text-xs font-bold'>
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
    </>
  )
}

export default PagePolarProductDetail
