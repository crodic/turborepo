import { useState } from 'react'
import { format } from 'date-fns'
import {
  ArrowLeft,
  Calendar,
  ExternalLink,
  Percent,
  Layers,
  DollarSign,
  Clock,
  Tag,
  Copy,
  Check,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import DataLoader from '@/components/layout/data-loader'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { useDataPolarDiscount } from '../queries'

export function PagePolarDiscountDetail() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const { data: discount, isLoading } = useDataPolarDiscount(id)

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    toast.success('Copied to clipboard!')
    setTimeout(() => setCopiedKey(null), 2000)
  }

  if (isLoading) return <DataLoader />
  if (!discount) {
    return (
      <Main className='flex h-[70vh] flex-col items-center justify-center space-y-4'>
        <p className='text-muted-foreground text-sm'>Discount not found.</p>
        <Button variant='outline' onClick={() => navigate('/polar/discounts')}>
          <ArrowLeft className='mr-2 h-4 w-4' />
          Back to Discounts
        </Button>
      </Main>
    )
  }

  const isPercentage = discount.type === 'percentage'
  const discountDisplay = isPercentage
    ? `${discount.basisPoints ? discount.basisPoints / 100 : (discount.amount ?? 0)}% OFF`
    : `$${((discount.amount ?? 0) / 100).toFixed(2)} OFF`

  return (
    <>
      <Header fixed>
        <div className='flex items-center gap-3'>
          <Button
            variant='ghost'
            size='icon'
            className='h-8 w-8'
            onClick={() => navigate('/polar/discounts')}
          >
            <ArrowLeft className='h-4 w-4' />
          </Button>
          <div className='flex items-center gap-2'>
            <Tag className='text-primary h-5 w-5' />
            <h1 className='text-lg font-semibold tracking-tight'>
              {discount.name || 'Discount Detail'}
            </h1>
          </div>
        </div>
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='mx-auto max-w-4xl space-y-6 p-6 pb-16'>
        {/* Hero Card */}
        <div className='from-muted/60 via-muted/20 to-background rounded-2xl border bg-gradient-to-b p-6 shadow-sm'>
          <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
            <div className='flex items-start gap-4'>
              <div className='bg-primary/10 text-primary ring-primary/20 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-sm ring-1'>
                {isPercentage ? (
                  <Percent className='h-7 w-7' />
                ) : (
                  <DollarSign className='h-7 w-7' />
                )}
              </div>
              <div className='space-y-1.5'>
                <div className='flex flex-wrap items-center gap-3'>
                  <h2 className='text-foreground text-2xl font-bold tracking-tight'>
                    {discount.name || 'Discount'}
                  </h2>
                  <Badge className='border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-sm font-bold text-emerald-700 dark:text-emerald-400'>
                    {discountDisplay}
                  </Badge>
                </div>
                <p className='text-muted-foreground text-xs'>
                  Polar Promotional Discount & Coupon
                </p>
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
              </div>
            </div>

            <Button
              variant='outline'
              onClick={() =>
                window.open('https://sandbox.polar.sh/dashboard', '_blank')
              }
            >
              <ExternalLink className='mr-2 h-4 w-4' />
              Manage on Polar
            </Button>
          </div>
        </div>

        {/* Promo Code Card */}
        {discount.code && (
          <div className='bg-primary/5 border-primary/20 flex items-center justify-between rounded-2xl border p-5 shadow-sm'>
            <div className='space-y-1'>
              <span className='text-muted-foreground text-xs font-semibold tracking-wider uppercase'>
                Coupon Code
              </span>
              <p className='text-primary font-mono text-2xl font-bold tracking-widest'>
                {discount.code}
              </p>
            </div>
            <Button
              variant='outline'
              size='sm'
              className='border-primary/30 h-10'
              onClick={() => handleCopy(discount.code, 'code')}
            >
              {copiedKey === 'code' ? (
                <>
                  <Check className='mr-1.5 h-4 w-4 text-emerald-500' />
                  Copied Code
                </>
              ) : (
                <>
                  <Copy className='mr-1.5 h-4 w-4' />
                  Copy Code
                </>
              )}
            </Button>
          </div>
        )}

        {/* Quick Info Grid */}
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
          <div className='bg-muted/40 space-y-1.5 rounded-xl border p-4'>
            <span className='text-muted-foreground text-xs font-medium tracking-wider uppercase'>
              Duration Type
            </span>
            <p className='text-foreground text-sm font-semibold capitalize'>
              {discount.duration || 'Once'}
              {discount.durationInMonths
                ? ` (${discount.durationInMonths} months)`
                : ''}
            </p>
          </div>
          <div className='bg-muted/40 space-y-1.5 rounded-xl border p-4'>
            <span className='text-muted-foreground text-xs font-medium tracking-wider uppercase'>
              Redemptions
            </span>
            <p className='text-foreground text-sm font-semibold'>
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
            <p className='text-foreground text-sm font-medium'>
              {discount.products && discount.products.length > 0
                ? `${discount.products.length} specific products selected`
                : 'Applies to all products across organization'}
            </p>
          </div>
        </div>

        {/* Validity & Dates */}
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
          <div className='bg-muted/40 space-y-1.5 rounded-xl border p-4'>
            <span className='text-muted-foreground text-xs font-medium tracking-wider uppercase'>
              Starts At
            </span>
            <p className='text-foreground mt-1 flex items-center gap-1.5 text-sm'>
              <Calendar className='text-muted-foreground h-4 w-4' />
              {discount.startsAt
                ? format(new Date(discount.startsAt), 'MMM dd, yyyy')
                : 'Immediate'}
            </p>
          </div>
          <div className='bg-muted/40 space-y-1.5 rounded-xl border p-4'>
            <span className='text-muted-foreground text-xs font-medium tracking-wider uppercase'>
              Expires At
            </span>
            <p className='text-foreground mt-1 flex items-center gap-1.5 text-sm'>
              <Clock className='text-muted-foreground h-4 w-4' />
              {discount.endsAt
                ? format(new Date(discount.endsAt), 'MMM dd, yyyy')
                : 'Never'}
            </p>
          </div>
        </div>

        {/* Polar Discount ID with copy */}
        <div className='bg-muted/40 flex items-center justify-between rounded-xl border p-4'>
          <div className='min-w-0 flex-1 space-y-1'>
            <span className='text-muted-foreground text-xs font-medium tracking-wider uppercase'>
              Polar Discount ID
            </span>
            <p className='text-foreground truncate font-mono text-sm font-semibold'>
              {discount.id}
            </p>
          </div>
          <Button
            variant='outline'
            size='sm'
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
      </Main>
    </>
  )
}

export default PagePolarDiscountDetail
