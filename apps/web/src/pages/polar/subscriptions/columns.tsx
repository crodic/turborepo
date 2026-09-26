import { useState } from 'react'
import { format } from 'date-fns'
import type { ColumnDef } from '@tanstack/react-table'
import { AlertTriangle, Clock, MoreHorizontal, XCircle } from 'lucide-react'
import { Link } from 'react-router'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import {
  useMutationCancelSubscription,
  useMutationRevokeSubscription,
} from '../queries'
import type { PolarSubscriptionSchema } from '../schema'

const subStatusVariant: Record<
  string,
  'default' | 'destructive' | 'secondary' | 'outline'
> = {
  active: 'default',
  trialing: 'secondary',
  past_due: 'destructive',
  canceled: 'secondary',
  unpaid: 'destructive',
  incomplete: 'outline',
}

function SubscriptionRowActions({
  subscription,
  canManage,
}: {
  subscription: PolarSubscriptionSchema
  canManage: boolean
}) {
  const [cancelOpen, setCancelOpen] = useState(false)
  const [revokeOpen, setRevokeOpen] = useState(false)

  const cancelMutation = useMutationCancelSubscription()
  const revokeMutation = useMutationRevokeSubscription()

  if (!canManage || subscription.status === 'canceled') {
    return null
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' size='icon' className='size-8 p-0'>
            <MoreHorizontal className='size-4' />
            <span className='sr-only'>Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          {!subscription.cancelAtPeriodEnd && (
            <DropdownMenuItem onClick={() => setCancelOpen(true)}>
              <Clock className='mr-2 size-4 text-amber-600' />
              Cancel at Period End
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setRevokeOpen(true)}
            className='text-destructive focus:text-destructive'
          >
            <XCircle className='mr-2 size-4' />
            Revoke Immediately
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Cancel at Period End Confirmation */}
      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='flex items-center gap-2'>
              <AlertTriangle className='size-5 text-amber-600' />
              Cancel at Period End
            </AlertDialogTitle>
            <AlertDialogDescription>
              The customer will retain full access until the end of their
              current billing cycle (
              {subscription.currentPeriodEnd
                ? format(new Date(subscription.currentPeriodEnd), 'dd/MM/yyyy')
                : 'current period'}
              ), after which the subscription will not renew.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelMutation.mutate(subscription.id)}
              className='bg-amber-600 text-white hover:bg-amber-700'
            >
              Confirm Cancellation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke Immediately Confirmation */}
      <AlertDialog open={revokeOpen} onOpenChange={setRevokeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-destructive flex items-center gap-2'>
              <XCircle className='text-destructive size-5' />
              Revoke Subscription Immediately
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will IMMEDIATELY cancel the subscription on Polar and revoke
              all granted entitlements (benefits, licenses, Discord access).
              This action cannot be reversed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abort</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => revokeMutation.mutate(subscription.id)}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              Revoke Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export function getSubscriptionsTableColumns({
  canManage,
}: {
  canManage: boolean
}): ColumnDef<PolarSubscriptionSchema>[] {
  return [
    {
      id: 'customer',
      accessorFn: (row) => row.customerEmail,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Customer' />
      ),
      cell: ({ row }) => {
        const { customerEmail, customerName, userId } = row.original
        return (
          <div className='flex flex-col gap-0.5'>
            <span className='text-sm font-medium'>{customerEmail}</span>
            <div className='text-muted-foreground flex items-center gap-1.5 text-xs'>
              {customerName && <span>{customerName}</span>}
              {userId && (
                <Link
                  to={`/users/${userId}/show`}
                  className='text-primary font-mono text-[11px] hover:underline'
                >
                  (User #{userId})
                </Link>
              )}
            </div>
          </div>
        )
      },
    },
    {
      id: 'product',
      accessorFn: (row) => row.productName || row.productId,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Product / Tier' />
      ),
      cell: ({ row }) => (
        <span className='text-sm font-medium'>
          {row.original.productName || row.original.productId}
        </span>
      ),
    },
    {
      id: 'pricing',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Plan & Billing' />
      ),
      cell: ({ row }) => {
        const { amount, currency, recurringInterval } = row.original
        const formatted = amount != null ? (amount / 100).toFixed(2) : '-'
        return (
          <div className='flex flex-col text-xs'>
            <span className='font-mono font-semibold'>
              ${formatted} {(currency || 'usd').toUpperCase()}
            </span>
            <span className='text-muted-foreground capitalize'>
              per {recurringInterval || 'month'}
            </span>
          </div>
        )
      },
    },
    {
      id: 'status',
      accessorFn: (row) => row.status,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Status' />
      ),
      cell: ({ row }) => {
        const { status, cancelAtPeriodEnd } = row.original
        return (
          <div className='flex flex-col items-start gap-1'>
            <Badge
              variant={subStatusVariant[status] || 'secondary'}
              className='text-[10px] font-semibold tracking-wider uppercase'
            >
              {status}
            </Badge>
            {cancelAtPeriodEnd && (
              <Badge
                variant='outline'
                className='border-amber-600/30 text-[10px] text-amber-600'
              >
                Cancels end of period
              </Badge>
            )}
          </div>
        )
      },
    },
    {
      id: 'period',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Current Period' />
      ),
      cell: ({ row }) => {
        const { currentPeriodStart, currentPeriodEnd } = row.original
        if (!currentPeriodEnd)
          return <span className='text-muted-foreground text-xs'>-</span>
        return (
          <div className='text-muted-foreground flex flex-col font-mono text-xs'>
            <span>
              {currentPeriodStart
                ? format(new Date(currentPeriodStart), 'dd/MM/yy')
                : 'Start'}
              {' → '}
              {format(new Date(currentPeriodEnd), 'dd/MM/yy')}
            </span>
          </div>
        )
      },
    },
    {
      id: 'actions',
      header: () => <span className='text-xs'>Actions</span>,
      cell: ({ row }) => (
        <SubscriptionRowActions
          subscription={row.original}
          canManage={canManage}
        />
      ),
    },
  ]
}
