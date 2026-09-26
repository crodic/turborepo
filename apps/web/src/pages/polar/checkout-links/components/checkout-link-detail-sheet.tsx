import { useState } from 'react'
import { format } from 'date-fns'
import {
  Link2,
  Copy,
  Check,
  Calendar,
  ExternalLink,
  Package,
  ShieldCheck,
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

interface CheckoutLinkDetailSheetProps {
  link: any | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CheckoutLinkDetailSheet({
  link,
  open,
  onOpenChange,
}: CheckoutLinkDetailSheetProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  if (!link) return null

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    toast.success('Copied link to clipboard!')
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const checkoutUrl = link.url || `https://sandbox.polar.sh/checkout/${link.id}`

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='w-full gap-0 overflow-y-auto p-0 sm:max-w-xl md:max-w-2xl'>
        {/* Header Hero Banner */}
        <div className='from-muted/60 via-muted/20 to-background border-b bg-gradient-to-b px-6 py-6 pr-16'>
          <SheetHeader className='space-y-4 p-0'>
            <div className='flex items-start gap-4'>
              <div className='bg-primary/10 text-primary ring-primary/20 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm ring-1'>
                <Link2 className='h-6 w-6' />
              </div>
              <div className='min-w-0 flex-1 space-y-1.5'>
                <div className='flex flex-wrap items-center gap-2.5'>
                  <SheetTitle className='text-foreground text-xl font-bold tracking-tight'>
                    {link.label || 'Checkout Link'}
                  </SheetTitle>
                  <Badge
                    variant='outline'
                    className='bg-background px-2.5 py-0.5 font-mono text-xs font-semibold shadow-xs'
                  >
                    {link.status || 'Active'}
                  </Badge>
                </div>
                <SheetDescription className='text-muted-foreground text-xs leading-normal'>
                  Direct Polar Hosted Checkout URL
                </SheetDescription>
              </div>
            </div>

            {/* Sub-meta tags */}
            {link.product?.name && (
              <div className='text-muted-foreground flex items-center gap-1.5 pt-1 text-xs'>
                <Package className='text-primary h-3.5 w-3.5' />
                <span>Product:</span>
                <span className='text-foreground font-semibold'>
                  {link.product.name}
                </span>
              </div>
            )}
          </SheetHeader>
        </div>

        {/* Content Body with consistent p-6 pb-12 padding */}
        <div className='space-y-6 p-6 pb-12 text-sm'>
          {/* Quick Action Checkout URL Card */}
          <div className='bg-primary/5 border-primary/20 space-y-3 rounded-xl border p-4 shadow-sm'>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground text-xs font-semibold tracking-wider uppercase'>
                Hosted Checkout Link
              </span>
              <Badge variant='outline' className='text-xs font-normal'>
                SSL Protected
              </Badge>
            </div>
            <p className='text-primary truncate font-mono text-xs font-semibold'>
              {checkoutUrl}
            </p>
            <div className='flex items-center gap-2 pt-1'>
              <Button
                variant='outline'
                size='sm'
                className='border-primary/30 h-9 flex-1 text-xs'
                onClick={() => handleCopy(checkoutUrl, 'url')}
              >
                {copiedKey === 'url' ? (
                  <>
                    <Check className='mr-1.5 h-3.5 w-3.5 text-emerald-500' />
                    Copied Link
                  </>
                ) : (
                  <>
                    <Copy className='mr-1.5 h-3.5 w-3.5' />
                    Copy Link
                  </>
                )}
              </Button>
              <Button
                size='sm'
                className='h-9 flex-1 text-xs'
                onClick={() => window.open(checkoutUrl, '_blank')}
              >
                Test Checkout
                <ExternalLink className='ml-1.5 h-3.5 w-3.5' />
              </Button>
            </div>
          </div>

          {/* Attached Product */}
          <div className='bg-muted/40 space-y-2 rounded-xl border p-4'>
            <span className='text-muted-foreground text-xs font-semibold tracking-wider uppercase'>
              Attached Product
            </span>
            <div className='flex items-center gap-2 pt-0.5'>
              <Package className='text-primary h-4 w-4' />
              <p className='text-foreground text-xs font-medium'>
                {link.product?.name ||
                  link.productId ||
                  'Multiple / Any product'}
              </p>
            </div>
          </div>

          {/* Success URL */}
          <div className='bg-muted/40 space-y-1.5 rounded-xl border p-3.5'>
            <span className='text-muted-foreground text-xs'>
              Success Redirect URL
            </span>
            <p className='text-foreground truncate font-mono text-xs font-medium'>
              {link.successUrl || 'Standard Polar confirmation page'}
            </p>
          </div>

          {/* Settings Grid */}
          <div className='grid grid-cols-2 gap-3'>
            <div className='bg-muted/40 space-y-1 rounded-xl border p-3.5'>
              <span className='text-muted-foreground text-xs'>
                Discount Codes
              </span>
              <p className='text-foreground mt-1 flex items-center gap-1.5 text-xs font-medium'>
                <ShieldCheck className='h-3.5 w-3.5 text-emerald-500' />
                {link.allowDiscountCodes ? 'Allowed' : 'Disabled'}
              </p>
            </div>
            <div className='bg-muted/40 space-y-1 rounded-xl border p-3.5'>
              <span className='text-muted-foreground text-xs'>Created At</span>
              <p className='text-foreground mt-1 flex items-center gap-1.5 text-xs font-medium'>
                <Calendar className='text-muted-foreground h-3.5 w-3.5' />
                {link.createdAt
                  ? format(new Date(link.createdAt), 'MMM dd, yyyy')
                  : 'N/A'}
              </p>
            </div>
          </div>

          {/* Link ID with copy */}
          <div className='bg-muted/40 flex items-center justify-between rounded-xl border p-3.5'>
            <div className='min-w-0 flex-1 space-y-0.5'>
              <span className='text-muted-foreground text-xs font-medium'>
                Checkout Link ID
              </span>
              <p className='text-foreground truncate font-mono text-xs font-semibold'>
                {link.id}
              </p>
            </div>
            <Button
              variant='outline'
              size='sm'
              className='ml-3 h-8 shrink-0 text-xs'
              onClick={() => handleCopy(link.id, 'id')}
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

          {/* Manage in Polar */}
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
