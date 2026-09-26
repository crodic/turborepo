import { useState } from 'react'
import { format } from 'date-fns'
import {
  ExternalLink,
  Copy,
  Check,
  Package,
  Sparkles,
  Calendar,
  CreditCard,
  Image as ImageIcon,
  Building,
  Eye,
  CheckCircle2,
  Archive,
  Tag,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

interface ProductDetailSheetProps {
  product: any | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProductDetailSheet({
  product,
  open,
  onOpenChange,
}: ProductDetailSheetProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  if (!product) return null

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    toast.success('Copied to clipboard!')
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const formatPrice = (price: any) => {
    if (!price) return 'Free'
    const raw = price.priceAmount ?? price.price_amount ?? price.amount ?? 0
    const currency = (
      price.priceCurrency ??
      price.price_currency ??
      price.currency ??
      'USD'
    ).toUpperCase()
    const isZeroDecimal = ['VND', 'JPY', 'KRW'].includes(currency)
    const amount = isZeroDecimal ? raw : raw / 100

    if (currency === 'VND') {
      return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
      }).format(amount)
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const primaryMedia =
    product.medias && product.medias.length > 0 ? product.medias[0] : null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='w-full overflow-y-auto p-0 sm:max-w-xl md:max-w-2xl'>
        {/* Header Hero Banner */}
        <div className='bg-muted/30 border-b p-6'>
          <SheetHeader className='space-y-4'>
            <div className='flex items-start justify-between gap-4'>
              <div className='flex items-start gap-3.5'>
                {primaryMedia?.publicUrl ? (
                  <img
                    src={primaryMedia.publicUrl}
                    alt={product.name}
                    className='bg-background h-14 w-14 shrink-0 rounded-xl border object-cover shadow-sm'
                  />
                ) : (
                  <div className='bg-primary/10 text-primary flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border shadow-sm'>
                    <Package className='h-7 w-7' />
                  </div>
                )}
                <div>
                  <div className='flex flex-wrap items-center gap-2'>
                    <SheetTitle className='text-foreground text-xl font-bold tracking-tight'>
                      {product.name}
                    </SheetTitle>
                    <Badge
                      variant={product.isArchived ? 'secondary' : 'default'}
                      className={
                        product.isArchived
                          ? ''
                          : 'border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                      }
                    >
                      {product.isArchived ? (
                        <>
                          <Archive className='mr-1 h-3 w-3' />
                          Archived
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className='mr-1 h-3 w-3' />
                          Active
                        </>
                      )}
                    </Badge>
                    <Badge variant='outline' className='text-xs'>
                      {product.isRecurring ? 'Subscription' : 'One-time'}
                    </Badge>
                  </div>
                  <SheetDescription className='text-muted-foreground mt-1 line-clamp-2 text-sm'>
                    {product.description ||
                      'No description provided for this product on Polar.'}
                  </SheetDescription>
                </div>
              </div>
            </div>

            {/* Quick date meta */}
            <div className='text-muted-foreground flex items-center gap-4 pt-1 text-xs'>
              <div className='flex items-center gap-1.5'>
                <Calendar className='h-3.5 w-3.5' />
                Created:{' '}
                <span className='text-foreground font-medium'>
                  {product.createdAt
                    ? format(new Date(product.createdAt), 'dd MMM yyyy, HH:mm')
                    : '—'}
                </span>
              </div>
              {product.visibility && (
                <div className='flex items-center gap-1.5'>
                  <Eye className='h-3.5 w-3.5' />
                  Visibility:{' '}
                  <span className='text-foreground font-medium capitalize'>
                    {product.visibility}
                  </span>
                </div>
              )}
            </div>
          </SheetHeader>
        </div>

        <div className='space-y-6 p-6'>
          {/* Identifiers & Details Box */}
          <div className='bg-card space-y-3 rounded-xl border p-4 shadow-xs'>
            <h4 className='text-muted-foreground flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase'>
              <Building className='text-primary h-3.5 w-3.5' />
              Gateway Identifiers
            </h4>

            <div className='space-y-2 text-xs'>
              <div className='flex items-center justify-between'>
                <span className='text-muted-foreground'>Product ID:</span>
                <div className='flex items-center gap-1.5 font-mono'>
                  <span className='max-w-[240px] truncate font-medium select-all'>
                    {product.id}
                  </span>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-6 w-6'
                    onClick={() => handleCopy(product.id, 'product_id')}
                  >
                    {copiedKey === 'product_id' ? (
                      <Check className='h-3.5 w-3.5 text-emerald-500' />
                    ) : (
                      <Copy className='h-3.5 w-3.5' />
                    )}
                  </Button>
                </div>
              </div>

              {product.organizationId && (
                <div className='flex items-center justify-between'>
                  <span className='text-muted-foreground'>
                    Organization ID:
                  </span>
                  <div className='flex items-center gap-1.5 font-mono'>
                    <span className='max-w-[240px] truncate font-medium select-all'>
                      {product.organizationId}
                    </span>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-6 w-6'
                      onClick={() =>
                        handleCopy(product.organizationId, 'org_id')
                      }
                    >
                      {copiedKey === 'org_id' ? (
                        <Check className='h-3.5 w-3.5 text-emerald-500' />
                      ) : (
                        <Copy className='h-3.5 w-3.5' />
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {product.recurringInterval && (
                <div className='flex items-center justify-between'>
                  <span className='text-muted-foreground'>
                    Billing Interval:
                  </span>
                  <span className='text-foreground font-medium capitalize'>
                    Every {product.recurringIntervalCount || 1}{' '}
                    {product.recurringInterval}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Pricing Options */}
          <div className='space-y-3'>
            <div className='flex items-center justify-between'>
              <h4 className='text-muted-foreground flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase'>
                <CreditCard className='text-primary h-3.5 w-3.5' />
                Pricing Tiers ({product.prices?.length || 0})
              </h4>
              <Badge variant='outline' className='font-mono text-[11px]'>
                {product.isRecurring ? 'Recurring' : 'One-time'}
              </Badge>
            </div>

            <div className='space-y-2.5'>
              {product.prices && product.prices.length > 0 ? (
                product.prices.map((price: any, idx: number) => {
                  const currency = (
                    price.priceCurrency ??
                    price.price_currency ??
                    'USD'
                  ).toUpperCase()
                  const interval =
                    price.recurringInterval ?? price.recurring_interval
                  const isArchived = price.isArchived

                  return (
                    <div
                      key={price.id || idx}
                      className='bg-card hover:bg-muted/30 flex items-center justify-between gap-4 rounded-xl border p-3.5 shadow-2xs transition-colors'
                    >
                      <div className='min-w-0 space-y-1'>
                        <div className='flex items-center gap-2'>
                          <span className='text-foreground text-sm font-semibold capitalize'>
                            {price.type === 'recurring'
                              ? 'Recurring'
                              : 'One-time'}
                          </span>
                          <Badge
                            variant='secondary'
                            className='px-1.5 py-0 font-mono text-[10px]'
                          >
                            {currency}
                          </Badge>
                          {interval && (
                            <Badge
                              variant='outline'
                              className='px-1.5 py-0 text-[10px] capitalize'
                            >
                              / {interval}
                            </Badge>
                          )}
                          {isArchived && (
                            <Badge
                              variant='destructive'
                              className='px-1.5 py-0 text-[10px]'
                            >
                              Archived
                            </Badge>
                          )}
                        </div>
                        <div className='text-muted-foreground flex items-center gap-1.5 font-mono text-xs'>
                          <span className='max-w-[200px] truncate'>
                            {price.id}
                          </span>
                          <Button
                            variant='ghost'
                            size='icon'
                            className='h-5 w-5'
                            onClick={() => handleCopy(price.id, `price_${idx}`)}
                          >
                            {copiedKey === `price_${idx}` ? (
                              <Check className='h-3 w-3 text-emerald-500' />
                            ) : (
                              <Copy className='h-3 w-3' />
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className='shrink-0 text-right'>
                        <div className='text-primary text-lg font-bold tracking-tight'>
                          {formatPrice(price)}
                        </div>
                        <div className='text-muted-foreground text-[11px] capitalize'>
                          {price.amountType || 'Fixed'}
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className='text-muted-foreground rounded-xl border border-dashed p-4 text-center text-sm'>
                  No pricing tiers configured on this product.
                </div>
              )}
            </div>
          </div>

          {/* Included Benefits */}
          <div className='space-y-3'>
            <div className='flex items-center justify-between'>
              <h4 className='text-muted-foreground flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase'>
                <Sparkles className='h-3.5 w-3.5 text-amber-500' />
                Included Benefits ({product.benefits?.length || 0})
              </h4>
            </div>

            <div className='space-y-2'>
              {product.benefits && product.benefits.length > 0 ? (
                product.benefits.map((benefit: any, idx: number) => (
                  <div
                    key={benefit.id || idx}
                    className='bg-card hover:bg-muted/20 flex items-start justify-between gap-3 rounded-xl border p-3.5 shadow-2xs transition-colors'
                  >
                    <div className='min-w-0 space-y-0.5'>
                      <div className='text-foreground text-sm font-medium'>
                        {benefit.description}
                      </div>
                      <div className='text-muted-foreground flex items-center gap-2 font-mono text-xs'>
                        <span className='max-w-[180px] truncate'>
                          {benefit.id}
                        </span>
                        {benefit.type && (
                          <Badge
                            variant='outline'
                            className='text-[10px] tracking-wider uppercase'
                          >
                            {benefit.type}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Badge variant='secondary' className='shrink-0 text-[10px]'>
                      Entitled
                    </Badge>
                  </div>
                ))
              ) : (
                <div className='text-muted-foreground rounded-xl border border-dashed p-4 text-center text-sm'>
                  No automated benefits attached to this product.
                </div>
              )}
            </div>
          </div>

          {/* Product Media Gallery */}
          {product.medias && product.medias.length > 0 && (
            <div className='space-y-3'>
              <h4 className='text-muted-foreground flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase'>
                <ImageIcon className='text-primary h-3.5 w-3.5' />
                Media Assets ({product.medias.length})
              </h4>
              <div className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
                {product.medias.map((media: any) => (
                  <a
                    key={media.id}
                    href={media.publicUrl}
                    target='_blank'
                    rel='noreferrer'
                    className='group bg-muted relative block aspect-video overflow-hidden rounded-xl border'
                  >
                    <img
                      src={media.publicUrl}
                      alt={media.name}
                      className='h-full w-full object-cover transition-transform group-hover:scale-105'
                    />
                    <div className='absolute inset-0 flex items-center justify-center gap-1 bg-black/40 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100'>
                      <ExternalLink className='h-3.5 w-3.5' />
                      View Image
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Custom Metadata */}
          {product.metadata && Object.keys(product.metadata).length > 0 && (
            <div className='space-y-3'>
              <h4 className='text-muted-foreground flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase'>
                <Tag className='text-primary h-3.5 w-3.5' />
                Custom Metadata
              </h4>
              <div className='bg-card space-y-1.5 rounded-xl border p-3'>
                {Object.entries(product.metadata).map(([key, val]) => (
                  <div
                    key={key}
                    className='flex items-center justify-between border-b py-1 text-xs last:border-0'
                  >
                    <span className='text-muted-foreground font-mono'>
                      {key}
                    </span>
                    <span className='text-foreground bg-muted rounded px-2 py-0.5 font-mono font-medium'>
                      {typeof val === 'object'
                        ? JSON.stringify(val)
                        : String(val)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Polar Dashboard Link */}
          <div className='pt-1'>
            <Button
              className='w-full gap-2 shadow-sm'
              onClick={() => {
                window.open('https://polar.sh/dashboard', '_blank')
              }}
            >
              <ExternalLink className='h-4 w-4' />
              Manage Product on Polar Dashboard
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
