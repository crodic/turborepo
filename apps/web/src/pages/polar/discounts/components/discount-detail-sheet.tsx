import { useState } from 'react'
import { format } from 'date-fns'
import {
  Copy,
  Check,
  Calendar,
  ExternalLink,
  Percent,
  Layers,
  DollarSign,
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

interface DiscountDetailSheetProps {
  discount: any | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DiscountDetailSheet({
  discount,
  open,
  onOpenChange,
}: DiscountDetailSheetProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  if (!discount) return null

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    toast.success('Copied code to clipboard!')
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const isPercentage = discount.type === 'percentage'
  const discountDisplay = isPercentage
    ? `${discount.basisPoints ? discount.basisPoints / 100 : (discount.amount ?? 0)}% OFF`
    : `$${((discount.amount ?? 0) / 100).toFixed(2)} OFF`

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='w-full gap-0 overflow-y-auto p-0 sm:max-w-xl md:max-w-2xl'>
        {/* Header Hero Banner */}
        <div className='from-muted/60 via-muted/20 to-background border-b bg-gradient-to-b px-6 py-6 pr-16'>
          <SheetHeader className='space-y-4 p-0'>
            <div className='flex items-start gap-4'>
              <div className='bg-primary/10 text-primary ring-primary/20 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm ring-1'>
                {isPercentage ? (
                  <Percent className='h-6 w-6' />
                ) : (
                  <DollarSign className='h-6 w-6' />
                )}
              </div>
              <div className='min-w-0 flex-1 space-y-1.5'>
                <div className='flex flex-wrap items-center gap-2.5'>
                  <SheetTitle className='text-foreground text-xl font-bold tracking-tight'>
                    {discount.name || 'Discount'}
                  </SheetTitle>
                  <Badge className='border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400'>
                    {discountDisplay}
                  </Badge>
                </div>
                <SheetDescription className='text-muted-foreground text-xs leading-normal'>
                  Polar Promotional Discount & Coupon
                </SheetDescription>
              </div>
            </div>

            {/* Sub-meta tags */}
            <div className='flex flex-wrap items-center gap-2 pt-1'>
              <Badge
                variant='outline'
                className='bg-background px-2.5 py-1 text-xs font-medium capitalize shadow-xs'
              >
                {discount.duration || 'Once'} duration
              </Badge>
              {discount.durationInMonths && (
                <Badge
                  variant='secondary'
                  className='px-2.5 py-1 text-xs font-medium'
                >
                  {discount.durationInMonths} months
                </Badge>
              )}
            </div>
          </SheetHeader>
        </div>

        {/* Content Body with consistent p-6 pb-12 padding */}
        <div className='space-y-6 p-6 pb-12 text-sm'>
          {/* Promo Code Card */}
          {discount.code && (
            <div className='bg-primary/5 border-primary/20 flex items-center justify-between rounded-xl border p-4 shadow-sm'>
              <div className='space-y-1'>
                <span className='text-muted-foreground text-xs font-semibold tracking-wider uppercase'>
                  Coupon Code
                </span>
                <p className='text-primary font-mono text-xl font-bold tracking-widest'>
                  {discount.code}
                </p>
              </div>
              <Button
                variant='outline'
                size='sm'
                className='border-primary/30 h-9'
                onClick={() => handleCopy(discount.code, 'code')}
              >
                {copiedKey === 'code' ? (
                  <>
                    <Check className='mr-1.5 h-3.5 w-3.5 text-emerald-500' />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className='mr-1.5 h-3.5 w-3.5' />
                    Copy Code
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Quick Info Grid */}
          <div className='grid grid-cols-2 gap-3'>
            <div className='bg-muted/40 space-y-1 rounded-xl border p-3.5'>
              <span className='text-muted-foreground text-xs'>
                Duration Type
              </span>
              <p className='text-foreground text-xs font-semibold capitalize'>
                {discount.duration || 'Once'}
                {discount.durationInMonths
                  ? ` (${discount.durationInMonths} months)`
                  : ''}
              </p>
            </div>
            <div className='bg-muted/40 space-y-1 rounded-xl border p-3.5'>
              <span className='text-muted-foreground text-xs'>Redemptions</span>
              <p className='text-foreground text-xs font-semibold'>
                {discount.redemptionsCount ?? 0}
                {discount.maxRedemptions
                  ? ` / ${discount.maxRedemptions}`
                  : ' (unlimited)'}
              </p>
            </div>
          </div>

          {/* Applicable Products */}
          <div className='bg-muted/40 space-y-2 rounded-xl border p-4'>
            <span className='text-muted-foreground text-xs font-semibold tracking-wider uppercase'>
              Applicable Products
            </span>
            <div className='flex items-center gap-2 pt-0.5'>
              <Layers className='text-primary h-4 w-4' />
              <p className='text-foreground text-xs font-medium'>
                {discount.products && discount.products.length > 0
                  ? `${discount.products.length} specific products selected`
                  : 'Applies to all products across organization'}
              </p>
            </div>
          </div>

          {/* Validity & Dates */}
          <div className='grid grid-cols-2 gap-3'>
            <div className='bg-muted/40 space-y-1 rounded-xl border p-3.5'>
              <span className='text-muted-foreground text-xs'>Starts At</span>
              <p className='text-foreground mt-1 flex items-center gap-1.5 text-xs'>
                <Calendar className='text-muted-foreground h-3.5 w-3.5' />
                {discount.startsAt
                  ? format(new Date(discount.startsAt), 'MMM dd, yyyy')
                  : 'Immediate'}
              </p>
            </div>
            <div className='bg-muted/40 space-y-1 rounded-xl border p-3.5'>
              <span className='text-muted-foreground text-xs'>Expires At</span>
              <p className='text-foreground mt-1 flex items-center gap-1.5 text-xs'>
                <Clock className='text-muted-foreground h-3.5 w-3.5' />
                {discount.endsAt
                  ? format(new Date(discount.endsAt), 'MMM dd, yyyy')
                  : 'Never'}
              </p>
            </div>
          </div>

          {/* Discount ID with copy */}
          <div className='bg-muted/40 flex items-center justify-between rounded-xl border p-3.5'>
            <div className='min-w-0 flex-1 space-y-0.5'>
              <span className='text-muted-foreground text-xs font-medium'>
                Polar Discount ID
              </span>
              <p className='text-foreground truncate font-mono text-xs font-semibold'>
                {discount.id}
              </p>
            </div>
            <Button
              variant='outline'
              size='sm'
              className='ml-3 h-8 shrink-0 text-xs'
              onClick={() => handleCopy(discount.id, 'id')}
            >
              {copiedKey === 'id' ? (
                <>
                  <Check className='mr-1.5 h-3.5 w-3.5 text-emerald-500' />
                  Copied
                </>
              ) : (
                <>
                  <Copy className='mr-1.5 h-3.5 w-3.5' />
                  Copy ID
                </>
              )}
            </Button>
          </div>

          {/* Link to Polar Dashboard */}
          <div className='pt-2'>
            <Button
              variant='outline'
              className='h-10 w-full'
              onClick={() =>
                window.open('https://sandbox.polar.sh/dashboard', '_blank')
              }
            >
              <ExternalLink className='mr-2 h-4 w-4' />
              Manage in Polar Dashboard
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
