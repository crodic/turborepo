import { useState, useMemo } from 'react'
import {
  Link2,
  RefreshCw,
  Search,
  ExternalLink,
  Copy,
  Check,
  Eye,
  Plus,
  Package,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { useDataPolarCheckoutLinks } from '../queries'
import { CheckoutLinkDetailSheet } from './components/checkout-link-detail-sheet'

export function PagePolarCheckoutLinks() {
  const {
    data: checkoutLinks = [],
    isLoading,
    isFetching,
    refetch,
  } = useDataPolarCheckoutLinks()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLink, setSelectedLink] = useState<any | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const filteredLinks = useMemo(() => {
    if (!searchTerm) return checkoutLinks
    const lower = searchTerm.toLowerCase()
    return checkoutLinks.filter(
      (l: any) =>
        l.label?.toLowerCase().includes(lower) ||
        l.url?.toLowerCase().includes(lower) ||
        l.id?.toLowerCase().includes(lower) ||
        l.product?.name?.toLowerCase().includes(lower)
    )
  }, [checkoutLinks, searchTerm])

  const handleCopy = (e: React.MouseEvent, text: string, key: string) => {
    e.stopPropagation()
    navigator.clipboard.writeText(text)
    setCopiedId(key)
    toast.success('Copied checkout link!')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleOpenDetail = (link: any) => {
    setSelectedLink(link)
    setSheetOpen(true)
  }

  return (
    <>
      <Header fixed>
        <div className='flex items-center gap-2'>
          <Link2 className='text-primary h-5 w-5' />
          <h1 className='text-lg font-semibold tracking-tight'>
            Checkout Links
          </h1>
        </div>
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='space-y-6 p-6'>
        {/* Top bar */}
        <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <h2 className='text-xl font-bold tracking-tight'>Checkout Links</h2>
            <p className='text-muted-foreground text-sm'>
              Pre-configured shareable checkout links hosted on Polar
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`}
              />
              Refresh
            </Button>
            <Button
              size='sm'
              onClick={() =>
                window.open('https://sandbox.polar.sh/dashboard', '_blank')
              }
            >
              <Plus className='mr-2 h-4 w-4' />
              Create on Polar
              <ExternalLink className='ml-1.5 h-3.5 w-3.5' />
            </Button>
          </div>
        </div>

        {/* Filter bar */}
        <div className='flex items-center justify-between'>
          <div className='relative w-full max-w-sm'>
            <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
            <Input
              placeholder='Search checkout link or product...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className='pl-9'
            />
          </div>
          <span className='text-muted-foreground text-xs'>
            Showing {filteredLinks.length} checkout links
          </span>
        </div>

        {/* Grid List */}
        {isLoading ? (
          <div className='text-muted-foreground flex h-64 flex-col items-center justify-center'>
            <RefreshCw className='mb-2 h-8 w-8 animate-spin' />
            Loading checkout links from Polar...
          </div>
        ) : filteredLinks.length === 0 ? (
          <div className='text-muted-foreground flex h-64 flex-col items-center justify-center rounded-xl border border-dashed'>
            <Link2 className='mb-2 h-10 w-10 opacity-30' />
            <p className='font-medium'>No checkout links found</p>
            <p className='text-xs'>
              Generate quick hosted payment links on your Polar dashboard.
            </p>
          </div>
        ) : (
          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
            {filteredLinks.map((link: any) => {
              const url =
                link.url || `https://sandbox.polar.sh/checkout/${link.id}`

              return (
                <Card
                  key={link.id}
                  className='hover:border-primary/50 cursor-pointer transition-all hover:shadow-sm'
                  onClick={() => handleOpenDetail(link)}
                >
                  <CardHeader className='pb-3'>
                    <div className='flex items-start justify-between gap-2'>
                      <div>
                        <CardTitle className='text-base font-semibold'>
                          {link.label || 'Checkout Link'}
                        </CardTitle>
                        <CardDescription className='text-xs'>
                          {link.product?.name ? (
                            <span className='mt-0.5 flex items-center gap-1'>
                              <Package className='h-3 w-3' />
                              {link.product.name}
                            </span>
                          ) : (
                            'Custom Checkout'
                          )}
                        </CardDescription>
                      </div>
                      <Badge variant='outline' className='font-mono text-xs'>
                        {link.status || 'Active'}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className='space-y-3 pb-3'>
                    <div className='bg-muted/50 flex items-center justify-between rounded-lg border px-3 py-2'>
                      <span className='text-muted-foreground max-w-[200px] truncate font-mono text-xs'>
                        {url}
                      </span>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='h-6 w-6'
                        onClick={(e) => handleCopy(e, url, link.id)}
                      >
                        {copiedId === link.id ? (
                          <Check className='h-3.5 w-3.5 text-emerald-500' />
                        ) : (
                          <Copy className='h-3.5 w-3.5' />
                        )}
                      </Button>
                    </div>

                    <div className='text-muted-foreground flex items-center justify-between text-xs'>
                      <span>Discount Codes</span>
                      <span className='text-foreground font-medium'>
                        {link.allowDiscountCodes ? 'Allowed' : 'Disabled'}
                      </span>
                    </div>
                  </CardContent>

                  <CardFooter className='flex items-center justify-between gap-2 border-t pt-3'>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='flex-1 text-xs'
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenDetail(link)
                      }}
                    >
                      <Eye className='mr-1.5 h-3.5 w-3.5' />
                      Details
                    </Button>
                    <Button
                      variant='outline'
                      size='sm'
                      className='flex-1 text-xs'
                      onClick={(e) => {
                        e.stopPropagation()
                        window.open(url, '_blank')
                      }}
                    >
                      Open Link
                      <ExternalLink className='ml-1.5 h-3 w-3' />
                    </Button>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        )}

        {/* Checkout Link Detail Sheet */}
        <CheckoutLinkDetailSheet
          link={selectedLink}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
        />
      </Main>
    </>
  )
}
