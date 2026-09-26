import { CreditCard, ShieldCheck, User } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useDataCustomerPaymentMethods, useDataCustomerState } from '../queries'
import type { PolarCustomerSchema } from '../schema'

interface CustomerDetailsModalProps {
  customer: PolarCustomerSchema | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CustomerDetailsModal({
  customer,
  open,
  onOpenChange,
}: CustomerDetailsModalProps) {
  const { data: stateData, isLoading: isLoadingState } = useDataCustomerState(
    customer?.id
  )
  const { data: paymentMethodsData, isLoading: isLoadingMethods } =
    useDataCustomerPaymentMethods(customer?.id)

  const paymentMethods = Array.isArray(paymentMethodsData)
    ? paymentMethodsData
    : (paymentMethodsData?.items ?? [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[85vh] overflow-y-auto sm:max-w-xl'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <User className='text-primary size-5' />
            Customer Polar Profile
          </DialogTitle>
          <DialogDescription>
            Live state and saved payment methods synchronized with Polar.
          </DialogDescription>
        </DialogHeader>

        {customer && (
          <div className='space-y-6 pt-2'>
            {/* Header info */}
            <div className='bg-muted/30 flex items-start gap-4 rounded-lg border p-4'>
              {customer.avatarUrl ? (
                <img
                  src={customer.avatarUrl}
                  alt={customer.name || customer.email}
                  className='size-12 rounded-full border object-cover'
                />
              ) : (
                <div className='bg-primary/10 text-primary flex size-12 items-center justify-center rounded-full font-bold'>
                  {(customer.name || customer.email).charAt(0).toUpperCase()}
                </div>
              )}
              <div className='min-w-0 flex-1 space-y-1'>
                <div className='flex flex-wrap items-center gap-2'>
                  <h4 className='truncate text-base font-semibold'>
                    {customer.name || 'Unnamed Customer'}
                  </h4>
                  {customer.taxId && (
                    <Badge variant='outline' className='text-xs'>
                      Tax ID: {customer.taxId}
                    </Badge>
                  )}
                </div>
                <p className='text-muted-foreground truncate text-sm'>
                  {customer.email}
                </p>
                <div className='text-muted-foreground flex items-center gap-2 font-mono text-xs'>
                  <span>Polar ID:</span>
                  <Badge variant='secondary' className='font-mono text-[10px]'>
                    {customer.polarCustomerId}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Saved Payment Methods */}
            <div className='space-y-3'>
              <h4 className='flex items-center gap-2 text-sm font-semibold'>
                <CreditCard className='text-primary size-4' />
                Saved Payment Methods
              </h4>
              {isLoadingMethods ? (
                <div className='space-y-2'>
                  <Skeleton className='h-12 w-full' />
                </div>
              ) : paymentMethods.length > 0 ? (
                <div className='space-y-2'>
                  {paymentMethods.map((pm: any) => (
                    <div
                      key={pm.id}
                      className='bg-card flex items-center justify-between rounded-lg border p-3 text-sm'
                    >
                      <div className='flex items-center gap-3'>
                        <CreditCard className='text-muted-foreground size-5' />
                        <div>
                          <p className='font-medium capitalize'>
                            {pm.brand || pm.type || 'Card'} ••••{' '}
                            {pm.last4 || '••••'}
                          </p>
                          {pm.expMonth && pm.expYear && (
                            <p className='text-muted-foreground text-xs'>
                              Expires {String(pm.expMonth).padStart(2, '0')}/
                              {pm.expYear}
                            </p>
                          )}
                        </div>
                      </div>
                      {pm.isDefault && (
                        <Badge variant='default' className='text-xs'>
                          Default
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className='text-muted-foreground text-xs italic'>
                  No saved payment methods on file with Polar.
                </p>
              )}
            </div>

            <Separator />

            {/* Active Grants & State */}
            <div className='space-y-3'>
              <h4 className='flex items-center gap-2 text-sm font-semibold'>
                <ShieldCheck className='text-primary size-4' />
                Polar State & Entitlements
              </h4>
              {isLoadingState ? (
                <div className='space-y-2'>
                  <Skeleton className='h-8 w-full' />
                  <Skeleton className='h-8 w-full' />
                </div>
              ) : stateData ? (
                <div className='space-y-3'>
                  {stateData.grants && stateData.grants.length > 0 ? (
                    <div className='space-y-1.5'>
                      <span className='text-muted-foreground text-xs font-medium'>
                        Granted Benefits ({stateData.grants.length}):
                      </span>
                      <div className='flex flex-wrap gap-1.5'>
                        {stateData.grants.map((grant: any) => (
                          <Badge
                            key={grant.id}
                            variant='outline'
                            className='gap-1 text-xs'
                          >
                            <span className='size-1.5 rounded-full bg-emerald-500' />
                            {grant.benefit?.description ||
                              grant.benefitId ||
                              'Benefit'}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className='text-muted-foreground text-xs italic'>
                      No active benefit grants currently active.
                    </p>
                  )}

                  {stateData.activeSubscriptions &&
                    stateData.activeSubscriptions.length > 0 && (
                      <div className='space-y-1.5 pt-2'>
                        <span className='text-muted-foreground text-xs font-medium'>
                          Active Subscriptions (
                          {stateData.activeSubscriptions.length}):
                        </span>
                        <div className='space-y-1'>
                          {stateData.activeSubscriptions.map((sub: any) => (
                            <div
                              key={sub.id}
                              className='flex items-center justify-between rounded border p-2 text-xs'
                            >
                              <span className='font-medium'>
                                {sub.product?.name || sub.productId}
                              </span>
                              <Badge
                                variant='default'
                                className='text-[10px] capitalize'
                              >
                                {sub.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              ) : (
                <p className='text-muted-foreground text-xs italic'>
                  No state records available.
                </p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
