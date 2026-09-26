import { useState } from 'react'
import { format } from 'date-fns'
import {
  AlertTriangle,
  Calendar,
  Check,
  Clock,
  Copy,
  ExternalLink,
  Package,
  Repeat,
  ShieldAlert,
  User,
  XCircle,
} from 'lucide-react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  useMutationCancelSubscription,
  useMutationRevokeSubscription,
} from '../../queries'
import type { PolarSubscriptionSchema } from '../../schema'

interface SubscriptionDetailSheetProps {
  subscription: PolarSubscriptionSchema | null
  open: boolean
  onOpenChange: (open: boolean) => void
  canManage?: boolean
}

export function SubscriptionDetailSheet({
  subscription,
  open,
  onOpenChange,
  canManage = false,
}: SubscriptionDetailSheetProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [revokeOpen, setRevokeOpen] = useState(false)

  const cancelMutation = useMutationCancelSubscription()
  const revokeMutation = useMutationRevokeSubscription()

  if (!subscription) return null

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    toast.success('Copied to clipboard!')
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className='border-emerald-500/20 bg-emerald-500/10 text-xs font-semibold text-emerald-600 uppercase dark:text-emerald-400'>
            ● Active
          </Badge>
        )
      case 'trialing':
        return (
          <Badge className='border-indigo-500/20 bg-indigo-500/10 text-xs font-semibold text-indigo-600 uppercase dark:text-indigo-400'>
            ● Trialing
          </Badge>
        )
      case 'past_due':
      case 'unpaid':
        return (
          <Badge className='border-amber-500/20 bg-amber-500/10 text-xs font-semibold text-amber-600 uppercase dark:text-amber-400'>
            ● Past Due
          </Badge>
        )
      case 'canceled':
        return (
          <Badge
            variant='secondary'
            className='text-xs font-semibold uppercase'
          >
            Canceled
          </Badge>
        )
      default:
        return (
          <Badge variant='outline' className='text-xs uppercase'>
            {status}
          </Badge>
        )
    }
  }

  const amountDisplay =
    subscription.amount != null
      ? `$${(subscription.amount / 100).toFixed(2)}`
      : 'Free'
  const intervalDisplay = subscription.recurringInterval
    ? `/ ${subscription.recurringInterval}`
    : ''

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side='right'
          className='flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-lg'
        >
          <SheetHeader className='border-border/70 bg-muted/20 border-b p-6 pb-4'>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground font-mono text-xs'>
                Subscription #{subscription.id}
              </span>
              {getStatusBadge(subscription.status)}
            </div>
            <SheetTitle className='text-foreground flex items-center gap-2 text-xl font-bold tracking-tight'>
              <span>{amountDisplay}</span>
              <span className='text-muted-foreground font-mono text-xs font-medium uppercase'>
                {intervalDisplay} {subscription.currency}
              </span>
            </SheetTitle>
            <SheetDescription className='text-muted-foreground flex items-center gap-1.5 text-xs'>
              <Calendar className='h-3.5 w-3.5' />
              Started on{' '}
              {subscription.startedAt
                ? format(new Date(subscription.startedAt), 'dd MMMM yyyy')
                : format(new Date(subscription.createdAt), 'dd MMMM yyyy')}
            </SheetDescription>
          </SheetHeader>

          <div className='flex-1 space-y-6 p-6'>
            {/* Customer Information Card */}
            <div className='border-border/70 bg-card space-y-3 rounded-xl border p-4'>
              <p className='text-muted-foreground flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase'>
                <User className='text-primary h-3.5 w-3.5' />
                Subscriber Information
              </p>
              <div className='space-y-1.5 text-sm'>
                <div className='flex items-center justify-between'>
                  <span className='text-muted-foreground text-xs'>Email:</span>
                  <span className='text-foreground font-medium'>
                    {subscription.customerEmail}
                  </span>
                </div>
                {subscription.customerName && (
                  <div className='flex items-center justify-between'>
                    <span className='text-muted-foreground text-xs'>Name:</span>
                    <span className='text-foreground font-medium'>
                      {subscription.customerName}
                    </span>
                  </div>
                )}
                {subscription.userId && (
                  <div className='flex items-center justify-between'>
                    <span className='text-muted-foreground text-xs'>
                      User ID:
                    </span>
                    <Link
                      to={`/users/${subscription.userId}/show`}
                      className='text-primary flex items-center gap-1 font-mono text-xs hover:underline'
                    >
                      <span>User #{subscription.userId}</span>
                      <ExternalLink className='h-3 w-3' />
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Plan Card */}
            <div className='border-border/70 bg-card space-y-3 rounded-xl border p-4'>
              <p className='text-muted-foreground flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase'>
                <Package className='text-primary h-3.5 w-3.5' />
                Subscribed Plan
              </p>
              <div className='flex items-start justify-between gap-3'>
                <div>
                  <p className='text-foreground text-sm font-bold'>
                    {subscription.productName || subscription.productId}
                  </p>
                  <p className='text-muted-foreground mt-0.5 font-mono text-xs'>
                    Product ID: {subscription.productId}
                  </p>
                </div>
                <Badge variant='outline' className='font-mono text-xs'>
                  {amountDisplay} {intervalDisplay}
                </Badge>
              </div>
            </div>

            {/* Current Billing Period */}
            <div className='border-border/70 bg-card space-y-3 rounded-xl border p-4'>
              <p className='text-muted-foreground flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase'>
                <Repeat className='text-primary h-3.5 w-3.5' />
                Billing Cycle Schedule
              </p>
              <div className='space-y-2 text-xs'>
                <div className='flex items-center justify-between'>
                  <span className='text-muted-foreground'>
                    Current Period Start:
                  </span>
                  <span className='font-mono'>
                    {subscription.currentPeriodStart
                      ? format(
                          new Date(subscription.currentPeriodStart),
                          'dd/MM/yyyy HH:mm'
                        )
                      : '—'}
                  </span>
                </div>
                <div className='flex items-center justify-between'>
                  <span className='text-muted-foreground'>
                    Next Renewal / End:
                  </span>
                  <span className='font-mono font-semibold'>
                    {subscription.currentPeriodEnd
                      ? format(
                          new Date(subscription.currentPeriodEnd),
                          'dd/MM/yyyy HH:mm'
                        )
                      : '—'}
                  </span>
                </div>
                {subscription.cancelAtPeriodEnd && (
                  <div className='mt-2 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-2.5 text-xs text-amber-600 dark:text-amber-400'>
                    <Clock className='h-4 w-4 shrink-0' />
                    <span>
                      Cancels automatically at current billing cycle end.
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Polar Gateway Identifiers */}
            <div className='border-border/70 bg-muted/20 space-y-2.5 rounded-xl border p-4 font-mono text-xs'>
              <p className='text-muted-foreground font-sans text-xs font-semibold tracking-wider uppercase'>
                Polar Subscription ID
              </p>
              <div className='flex items-center justify-between'>
                <span className='text-muted-foreground font-sans'>
                  Subscription:
                </span>
                <button
                  type='button'
                  onClick={() =>
                    handleCopy(
                      subscription.polarSubscriptionId,
                      'polarSubscriptionId'
                    )
                  }
                  className='text-foreground hover:text-primary flex items-center gap-1 transition-colors'
                >
                  <span>
                    {subscription.polarSubscriptionId.slice(0, 16)}...
                  </span>
                  {copiedKey === 'polarSubscriptionId' ? (
                    <Check className='h-3.5 w-3.5 text-emerald-500' />
                  ) : (
                    <Copy className='h-3.5 w-3.5 opacity-60' />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Action Footer (Cancel / Revoke) */}
          {canManage && subscription.status !== 'canceled' && (
            <div className='border-border/70 bg-muted/30 flex items-center justify-end gap-2 border-t p-4'>
              {!subscription.cancelAtPeriodEnd && (
                <Button
                  variant='outline'
                  size='sm'
                  className='gap-1.5 border-amber-500/30 text-xs text-amber-600 hover:bg-amber-500/10 dark:text-amber-400'
                  onClick={() => setCancelOpen(true)}
                >
                  <Clock className='h-3.5 w-3.5' />
                  Cancel at Period End
                </Button>
              )}
              <Button
                variant='destructive'
                size='sm'
                className='gap-1.5 text-xs'
                onClick={() => setRevokeOpen(true)}
              >
                <XCircle className='h-3.5 w-3.5' />
                Revoke Now
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='flex items-center gap-2'>
              <AlertTriangle className='size-5 text-amber-600' />
              Cancel Subscription at Period End?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The customer will retain full access until the end of their
              current billing cycle (
              {subscription.currentPeriodEnd
                ? format(new Date(subscription.currentPeriodEnd), 'dd/MM/yyyy')
                : 'current period'}
              ). No further renewals will be charged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Active</AlertDialogCancel>
            <AlertDialogAction
              className='bg-amber-600 text-white hover:bg-amber-700'
              onClick={() => {
                cancelMutation.mutate(subscription.id, {
                  onSuccess: () => {
                    setCancelOpen(false)
                    onOpenChange(false)
                  },
                })
              }}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending
                ? 'Canceling...'
                : 'Confirm Cancellation'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke Immediately Dialog */}
      <AlertDialog open={revokeOpen} onOpenChange={setRevokeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-destructive flex items-center gap-2'>
              <ShieldAlert className='text-destructive size-5' />
              Revoke Subscription Immediately?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will revoke all product access and cancel the subscription
              immediately on Polar. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abort</AlertDialogCancel>
            <AlertDialogAction
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
              onClick={() => {
                revokeMutation.mutate(subscription.id, {
                  onSuccess: () => {
                    setRevokeOpen(false)
                    onOpenChange(false)
                  },
                })
              }}
              disabled={revokeMutation.isPending}
            >
              {revokeMutation.isPending ? 'Revoking...' : 'Yes, Revoke Access'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
