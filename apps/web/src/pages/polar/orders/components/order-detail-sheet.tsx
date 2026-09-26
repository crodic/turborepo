import { useState } from 'react'
import { format } from 'date-fns'
import {
  FileText,
  Receipt,
  RotateCcw,
  Copy,
  Check,
  User,
  Package,
  Calendar,
  CreditCard,
  Tag,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import type { PolarOrderSchema } from '../../schema'

interface OrderDetailSheetProps {
  order: PolarOrderSchema | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onRefund?: (order: PolarOrderSchema) => void
  canManageRefund?: boolean
}

export function OrderDetailSheet({
  order,
  open,
  onOpenChange,
  onRefund,
  canManageRefund = false,
}: OrderDetailSheetProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  if (!order) return null

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    toast.success('Copied to clipboard!')
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <Badge className='border-emerald-500/20 bg-emerald-500/10 text-xs font-semibold text-emerald-600 uppercase dark:text-emerald-400'>
            ● Paid
          </Badge>
        )
      case 'pending':
        return (
          <Badge className='border-amber-500/20 bg-amber-500/10 text-xs font-semibold text-amber-600 uppercase dark:text-amber-400'>
            ● Pending
          </Badge>
        )
      case 'refunded':
        return (
          <Badge
            variant='secondary'
            className='text-xs font-semibold uppercase'
          >
            Refunded
          </Badge>
        )
      case 'failed':
      case 'canceled':
        return (
          <Badge
            variant='destructive'
            className='text-xs font-semibold uppercase'
          >
            {status}
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

  const totalAmount = (order.amount / 100).toFixed(2)
  const discountAmount = order.discountAmount
    ? (order.discountAmount / 100).toFixed(2)
    : null
  const taxAmount = order.taxAmount ? (order.taxAmount / 100).toFixed(2) : null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side='right'
        className='flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-lg'
      >
        <SheetHeader className='border-border/70 bg-muted/20 border-b p-6 pb-4'>
          <div className='flex items-center justify-between'>
            <span className='text-muted-foreground font-mono text-xs'>
              Order #{order.orderNumber || order.id}
            </span>
            {getStatusBadge(order.status)}
          </div>
          <SheetTitle className='text-foreground flex items-center gap-2 text-xl font-bold tracking-tight'>
            <span>${totalAmount}</span>
            <span className='text-muted-foreground font-mono text-xs font-medium uppercase'>
              {order.currency}
            </span>
          </SheetTitle>
          <SheetDescription className='text-muted-foreground flex items-center gap-1.5 text-xs'>
            <Calendar className='h-3.5 w-3.5' />
            Created on{' '}
            {format(new Date(order.createdAt), 'dd MMMM yyyy, HH:mm:ss')}
          </SheetDescription>
        </SheetHeader>

        <div className='flex-1 space-y-6 p-6'>
          {/* Customer Profile Card */}
          <div className='border-border/70 bg-card space-y-3 rounded-xl border p-4'>
            <p className='text-muted-foreground flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase'>
              <User className='text-primary h-3.5 w-3.5' />
              Customer Information
            </p>
            <div className='space-y-1.5 text-sm'>
              <div className='flex items-center justify-between'>
                <span className='text-muted-foreground text-xs'>Email:</span>
                <span className='text-foreground font-medium'>
                  {order.customerEmail}
                </span>
              </div>
              {order.customerName && (
                <div className='flex items-center justify-between'>
                  <span className='text-muted-foreground text-xs'>Name:</span>
                  <span className='text-foreground font-medium'>
                    {order.customerName}
                  </span>
                </div>
              )}
              {order.userId && (
                <div className='flex items-center justify-between'>
                  <span className='text-muted-foreground text-xs'>
                    User ID:
                  </span>
                  <Link
                    to={`/users/${order.userId}/show`}
                    className='text-primary flex items-center gap-1 font-mono text-xs hover:underline'
                  >
                    <span>User #{order.userId}</span>
                    <ExternalLink className='h-3 w-3' />
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Product & Purchase Item */}
          <div className='border-border/70 bg-card space-y-3 rounded-xl border p-4'>
            <p className='text-muted-foreground flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase'>
              <Package className='text-primary h-3.5 w-3.5' />
              Purchased Product
            </p>
            <div className='flex items-start justify-between gap-3'>
              <div>
                <p className='text-foreground text-sm font-bold'>
                  {order.productTitle || order.productId}
                </p>
                <p className='text-muted-foreground mt-0.5 font-mono text-xs'>
                  Product ID: {order.productId}
                </p>
              </div>
              <Badge variant='outline' className='font-mono text-xs'>
                ${totalAmount} {order.currency.toUpperCase()}
              </Badge>
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className='border-border/70 bg-card space-y-3 rounded-xl border p-4'>
            <p className='text-muted-foreground flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase'>
              <CreditCard className='text-primary h-3.5 w-3.5' />
              Payment Summary
            </p>
            <div className='space-y-2 text-xs'>
              <div className='flex items-center justify-between'>
                <span className='text-muted-foreground'>Subtotal:</span>
                <span className='font-mono'>
                  ${totalAmount} {order.currency.toUpperCase()}
                </span>
              </div>
              {discountAmount && (
                <div className='flex items-center justify-between text-emerald-600 dark:text-emerald-400'>
                  <span className='flex items-center gap-1'>
                    <Tag className='h-3 w-3' /> Discount Applied:
                  </span>
                  <span className='font-mono font-medium'>
                    -${discountAmount}
                  </span>
                </div>
              )}
              {taxAmount && (
                <div className='text-muted-foreground flex items-center justify-between'>
                  <span>Tax:</span>
                  <span className='font-mono'>+${taxAmount}</span>
                </div>
              )}
              <Separator />
              <div className='text-foreground flex items-center justify-between text-sm font-bold'>
                <span>Total Paid:</span>
                <span className='font-mono'>
                  ${totalAmount} {order.currency.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Polar Technical IDs */}
          <div className='border-border/70 bg-muted/20 space-y-2.5 rounded-xl border p-4 font-mono text-xs'>
            <p className='text-muted-foreground font-sans text-xs font-semibold tracking-wider uppercase'>
              Gateway Sync Identifiers
            </p>
            {order.polarOrderId && (
              <div className='flex items-center justify-between'>
                <span className='text-muted-foreground font-sans'>
                  Polar Order ID:
                </span>
                <button
                  type='button'
                  onClick={() =>
                    handleCopy(order.polarOrderId!, 'polarOrderId')
                  }
                  className='text-foreground hover:text-primary flex items-center gap-1 transition-colors'
                >
                  <span>{order.polarOrderId.slice(0, 16)}...</span>
                  {copiedKey === 'polarOrderId' ? (
                    <Check className='h-3.5 w-3.5 text-emerald-500' />
                  ) : (
                    <Copy className='h-3.5 w-3.5 opacity-60' />
                  )}
                </button>
              </div>
            )}
            {order.polarCheckoutId && (
              <div className='flex items-center justify-between'>
                <span className='text-muted-foreground font-sans'>
                  Checkout ID:
                </span>
                <button
                  type='button'
                  onClick={() =>
                    handleCopy(order.polarCheckoutId!, 'polarCheckoutId')
                  }
                  className='text-foreground hover:text-primary flex items-center gap-1 transition-colors'
                >
                  <span>{order.polarCheckoutId.slice(0, 16)}...</span>
                  {copiedKey === 'polarCheckoutId' ? (
                    <Check className='h-3.5 w-3.5 text-emerald-500' />
                  ) : (
                    <Copy className='h-3.5 w-3.5 opacity-60' />
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Invoices & Receipts Buttons */}
          <div className='flex flex-wrap gap-2 pt-1'>
            {order.invoiceUrl && (
              <a
                href={order.invoiceUrl}
                target='_blank'
                rel='noopener noreferrer'
                className='flex-1'
              >
                <Button
                  variant='outline'
                  className='h-9 w-full gap-1.5 text-xs'
                >
                  <FileText className='h-3.5 w-3.5' />
                  View Invoice PDF
                </Button>
              </a>
            )}
            {order.receiptUrl && (
              <a
                href={order.receiptUrl}
                target='_blank'
                rel='noopener noreferrer'
                className='flex-1'
              >
                <Button
                  variant='outline'
                  className='h-9 w-full gap-1.5 text-xs'
                >
                  <Receipt className='h-3.5 w-3.5' />
                  Payment Receipt
                </Button>
              </a>
            )}
          </div>
        </div>

        {/* Action Footer (Refund Trigger) */}
        {order.status === 'paid' && canManageRefund && (
          <div className='border-border/70 bg-muted/30 flex items-center justify-between gap-3 border-t p-4'>
            <div className='text-muted-foreground flex items-center gap-1.5 text-xs'>
              <ShieldCheck className='h-4 w-4 text-emerald-500' />
              <span>Refund protection enabled</span>
            </div>
            <Button
              variant='outline'
              size='sm'
              className='gap-1.5 border-amber-500/30 text-xs text-amber-600 hover:bg-amber-500/10 dark:text-amber-400'
              onClick={() => {
                onOpenChange(false)
                onRefund?.(order)
              }}
            >
              <RotateCcw className='h-3.5 w-3.5' />
              Issue Refund
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
