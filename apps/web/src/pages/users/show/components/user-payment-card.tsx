import { format } from 'date-fns'
import { CreditCard, DollarSign, Package, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
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
import { useDataUserPaymentSummary } from '@/pages/payments/queries'

interface UserPaymentCardProps {
  userId: string
}

export function UserPaymentCard({ userId }: UserPaymentCardProps) {
  const { data, isLoading } = useDataUserPaymentSummary(userId)

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className='text-base font-semibold'>
            Billing & Subscriptions
          </CardTitle>
          <CardDescription>Loading user payment details...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const activeSub = data?.subscriptions.find((s) => s.status === 'active')
  const totalSpentFormatted = data ? (data.totalSpent / 100).toFixed(2) : '0.00'
  const currencyUpper = data?.currency ? data.currency.toUpperCase() : 'USD'

  return (
    <Card className='col-span-full'>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <div>
            <CardTitle className='flex items-center gap-2 text-lg font-semibold'>
              <CreditCard className='text-primary h-5 w-5' />
              Billing & Subscriptions
            </CardTitle>
            <CardDescription>
              Overview of this customer's recurring plans, lifetime spend, and
              orders.
            </CardDescription>
          </div>
          {activeSub ? (
            <Badge variant='default' className='flex items-center gap-1'>
              <ShieldCheck className='h-3.5 w-3.5' />
              Active Subscription
            </Badge>
          ) : (
            <Badge variant='outline'>Free / No Active Plan</Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className='space-y-6'>
        {/* Quick Stats Grid */}
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
          <div className='bg-muted/30 rounded-lg border p-4'>
            <div className='text-muted-foreground flex items-center justify-between text-xs font-medium'>
              <span>Lifetime Spend</span>
              <DollarSign className='h-4 w-4' />
            </div>
            <div className='mt-2 text-2xl font-bold'>
              ${totalSpentFormatted}{' '}
              <span className='text-muted-foreground text-xs font-normal'>
                {currencyUpper}
              </span>
            </div>
          </div>

          <div className='bg-muted/30 rounded-lg border p-4'>
            <div className='text-muted-foreground flex items-center justify-between text-xs font-medium'>
              <span>Total Orders Placed</span>
              <Package className='h-4 w-4' />
            </div>
            <div className='mt-2 text-2xl font-bold'>
              {data?.totalOrdersCount ?? 0}
            </div>
          </div>

          <div className='bg-muted/30 rounded-lg border p-4'>
            <div className='text-muted-foreground flex items-center justify-between text-xs font-medium'>
              <span>Current Status</span>
              <CreditCard className='h-4 w-4' />
            </div>
            <div className='mt-2 truncate text-base font-semibold'>
              {activeSub ? (
                <span className='text-primary capitalize'>
                  {activeSub.productId} (
                  {activeSub.cancelAtPeriodEnd ? 'Canceling' : 'Active'})
                </span>
              ) : (
                <span className='text-muted-foreground'>No active plan</span>
              )}
            </div>
          </div>
        </div>

        {/* Subscriptions section */}
        <div>
          <h4 className='mb-2 text-sm font-semibold'>Subscriptions</h4>
          {!data?.subscriptions || data.subscriptions.length === 0 ? (
            <p className='text-muted-foreground text-xs italic'>
              No subscriptions found for this user.
            </p>
          ) : (
            <div className='rounded-md border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subscription ID</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Current Period End</TableHead>
                    <TableHead>Auto Renew</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.subscriptions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className='font-mono text-xs'>
                        {sub.polarSubscriptionId}
                      </TableCell>
                      <TableCell className='text-xs font-medium'>
                        {sub.productId}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            sub.status === 'active' ? 'default' : 'secondary'
                          }
                          className='capitalize'
                        >
                          {sub.status}
                        </Badge>
                      </TableCell>
                      <TableCell className='text-muted-foreground text-xs'>
                        {sub.currentPeriodEnd
                          ? format(new Date(sub.currentPeriodEnd), 'dd/MM/yyyy')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            sub.cancelAtPeriodEnd ? 'destructive' : 'outline'
                          }
                          className='text-[11px]'
                        >
                          {sub.cancelAtPeriodEnd ? 'Cancels at end' : 'Renews'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Recent Orders section */}
        <div>
          <h4 className='mb-2 text-sm font-semibold'>Recent Orders</h4>
          {!data?.recentOrders || data.recentOrders.length === 0 ? (
            <p className='text-muted-foreground text-xs italic'>
              No orders found for this user.
            </p>
          ) : (
            <div className='rounded-md border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className='font-mono text-xs'>
                        {order.orderNumber}
                      </TableCell>
                      <TableCell className='text-xs'>
                        {order.productTitle || order.productId}
                      </TableCell>
                      <TableCell className='text-xs font-medium'>
                        ${(order.amount / 100).toFixed(2)}{' '}
                        {order.currency.toUpperCase()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            order.status === 'paid'
                              ? 'default'
                              : order.status === 'pending'
                                ? 'outline'
                                : 'destructive'
                          }
                          className='text-[11px] capitalize'
                        >
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className='text-muted-foreground text-xs'>
                        {format(new Date(order.createdAt), 'dd/MM/yyyy HH:mm')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
