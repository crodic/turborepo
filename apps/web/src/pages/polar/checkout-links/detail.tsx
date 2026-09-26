import { useState } from 'react'
import { format } from 'date-fns'
import {
  ArrowLeft,
  Link2,
  Calendar,
  ExternalLink,
  Package,
  ShieldCheck,
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
import { useDataPolarCheckoutLink } from '../queries'

export function PagePolarCheckoutLinkDetail() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const { data: link, isLoading } = useDataPolarCheckoutLink(id)

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    toast.success('Copied link to clipboard!')
    setTimeout(() => setCopiedKey(null), 2000)
  }

  if (isLoading) return <DataLoader />
  if (!link) {
    return (
      <Main className='flex h-[70vh] flex-col items-center justify-center space-y-4'>
        <p className='text-muted-foreground text-sm'>
          Checkout link not found.
        </p>
        <Button
          variant='outline'
          onClick={() => navigate('/polar/checkout-links')}
        >
          <ArrowLeft className='mr-2 h-4 w-4' />
          Back to Checkout Links
        </Button>
      </Main>
    )
  }

  const checkoutUrl = link.url || `https://sandbox.polar.sh/checkout/${link.id}`

  return (
    <>
      <Header fixed>
        <div className='flex items-center gap-3'>
          <Button
            variant='ghost'
            size='icon'
            className='h-8 w-8'
            onClick={() => navigate('/polar/checkout-links')}
          >
            <ArrowLeft className='h-4 w-4' />
          </Button>
          <div className='flex items-center gap-2'>
            <Link2 className='text-primary h-5 w-5' />
            <h1 className='text-lg font-semibold tracking-tight'>
              {link.label || 'Checkout Link'}
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
                <Link2 className='h-7 w-7' />
              </div>
              <div className='space-y-1.5'>
                <div className='flex flex-wrap items-center gap-3'>
                  <h2 className='text-foreground text-2xl font-bold tracking-tight'>
                    {link.label || 'Checkout Link'}
                  </h2>
                  <Badge
                    variant='outline'
                    className='bg-background font-mono text-xs'
                  >
                    {link.status || 'Active'}
                  </Badge>
                </div>
                <p className='text-muted-foreground text-xs'>
                  Direct Polar Hosted Checkout URL
                </p>
                {link.product?.name && (
                  <div className='text-muted-foreground flex items-center gap-1.5 pt-1 text-xs'>
                    <Package className='text-primary h-3.5 w-3.5' />
                    <span>Product:</span>
                    <span className='text-foreground font-semibold'>
                      {link.product.name}
                    </span>
                  </div>
                )}
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

        {/* Hosted Checkout URL Card */}
        <div className='bg-primary/5 border-primary/20 space-y-4 rounded-2xl border p-5 shadow-sm'>
          <div className='flex items-center justify-between'>
            <span className='text-muted-foreground text-xs font-semibold tracking-wider uppercase'>
              Hosted Checkout Link
            </span>
            <Badge variant='outline' className='text-xs font-normal'>
              SSL Protected
            </Badge>
          </div>
          <p className='text-primary truncate font-mono text-sm font-semibold'>
            {checkoutUrl}
          </p>
          <div className='flex items-center gap-3 pt-1'>
            <Button
              variant='outline'
              className='border-primary/30 h-10 flex-1 text-xs'
              onClick={() => handleCopy(checkoutUrl, 'url')}
            >
              {copiedKey === 'url' ? (
                <>
                  <Check className='mr-1.5 h-4 w-4 text-emerald-500' />
                  Copied Link
                </>
              ) : (
                <>
                  <Copy className='mr-1.5 h-4 w-4' />
                  Copy Link
                </>
              )}
            </Button>
            <Button
              className='h-10 flex-1 text-xs'
              onClick={() => window.open(checkoutUrl, '_blank')}
            >
              Test Checkout
              <ExternalLink className='ml-1.5 h-4 w-4' />
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
            <p className='text-foreground text-sm font-medium'>
              {link.product?.name || link.productId || 'Multiple / Any product'}
            </p>
          </div>
        </div>

        {/* Success URL */}
        <div className='bg-muted/40 space-y-1.5 rounded-xl border p-4'>
          <span className='text-muted-foreground text-xs font-medium tracking-wider uppercase'>
            Success Redirect URL
          </span>
          <p className='text-foreground truncate font-mono text-xs font-medium'>
            {link.successUrl || 'Standard Polar confirmation page'}
          </p>
        </div>

        {/* Settings Grid */}
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
          <div className='bg-muted/40 space-y-1.5 rounded-xl border p-4'>
            <span className='text-muted-foreground text-xs font-medium tracking-wider uppercase'>
              Discount Codes
            </span>
            <p className='text-foreground mt-1 flex items-center gap-1.5 text-sm font-medium'>
              <ShieldCheck className='h-4 w-4 text-emerald-500' />
              {link.allowDiscountCodes ? 'Allowed' : 'Disabled'}
            </p>
          </div>
          <div className='bg-muted/40 space-y-1.5 rounded-xl border p-4'>
            <span className='text-muted-foreground text-xs font-medium tracking-wider uppercase'>
              Created At
            </span>
            <p className='text-foreground mt-1 flex items-center gap-1.5 text-sm font-medium'>
              <Calendar className='text-muted-foreground h-4 w-4' />
              {link.createdAt
                ? format(new Date(link.createdAt), 'MMM dd, yyyy')
                : 'N/A'}
            </p>
          </div>
        </div>

        {/* Link ID with copy */}
        <div className='bg-muted/40 flex items-center justify-between rounded-xl border p-4'>
          <div className='min-w-0 flex-1 space-y-1'>
            <span className='text-muted-foreground text-xs font-medium tracking-wider uppercase'>
              Checkout Link ID
            </span>
            <p className='text-foreground truncate font-mono text-sm font-semibold'>
              {link.id}
            </p>
          </div>
          <Button
            variant='outline'
            size='sm'
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
      </Main>
    </>
  )
}

export default PagePolarCheckoutLinkDetail
