import { useState, useMemo } from 'react'
import {
  Tag,
  RefreshCw,
  Search,
  ExternalLink,
  Copy,
  Check,
  Eye,
  Plus,
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
import { useDataPolarDiscounts } from '../queries'
import { DiscountDetailSheet } from './components/discount-detail-sheet'

export function PagePolarDiscounts() {
  const {
    data: discounts = [],
    isLoading,
    isFetching,
    refetch,
  } = useDataPolarDiscounts()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDiscount, setSelectedDiscount] = useState<any | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const filteredDiscounts = useMemo(() => {
    if (!searchTerm) return discounts
    const lower = searchTerm.toLowerCase()
    return discounts.filter(
      (d: any) =>
        d.name?.toLowerCase().includes(lower) ||
        d.code?.toLowerCase().includes(lower) ||
        d.id?.toLowerCase().includes(lower)
    )
  }, [discounts, searchTerm])

  const handleCopyCode = (e: React.MouseEvent, code: string) => {
    e.stopPropagation()
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    toast.success('Copied discount code!')
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const handleOpenDetail = (discount: any) => {
    setSelectedDiscount(discount)
    setSheetOpen(true)
  }

  return (
    <>
      <Header fixed>
        <div className='flex items-center gap-2'>
          <Tag className='text-primary h-5 w-5' />
          <h1 className='text-lg font-semibold tracking-tight'>
            Discounts & Coupons
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
            <h2 className='text-xl font-bold tracking-tight'>Discounts</h2>
            <p className='text-muted-foreground text-sm'>
              Read-only promotional coupons & discounts managed directly in
              Polar
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
              placeholder='Search discount name or code...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className='pl-9'
            />
          </div>
          <span className='text-muted-foreground text-xs'>
            Showing {filteredDiscounts.length} discounts
          </span>
        </div>

        {/* Grid List */}
        {isLoading ? (
          <div className='text-muted-foreground flex h-64 flex-col items-center justify-center'>
            <RefreshCw className='mb-2 h-8 w-8 animate-spin' />
            Loading discounts from Polar...
          </div>
        ) : filteredDiscounts.length === 0 ? (
          <div className='text-muted-foreground flex h-64 flex-col items-center justify-center rounded-xl border border-dashed'>
            <Tag className='mb-2 h-10 w-10 opacity-30' />
            <p className='font-medium'>No discounts found</p>
            <p className='text-xs'>
              Create coupon codes in Polar to offer price reductions to
              customers.
            </p>
          </div>
        ) : (
          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
            {filteredDiscounts.map((discount: any) => {
              const isPercentage = discount.type === 'percentage'
              const discountDisplay = isPercentage
                ? `${discount.basisPoints ? discount.basisPoints / 100 : (discount.amount ?? 0)}% OFF`
                : `$${((discount.amount ?? 0) / 100).toFixed(2)} OFF`

              return (
                <Card
                  key={discount.id}
                  className='hover:border-primary/50 cursor-pointer transition-all hover:shadow-sm'
                  onClick={() => handleOpenDetail(discount)}
                >
                  <CardHeader className='pb-3'>
                    <div className='flex items-start justify-between gap-2'>
                      <div>
                        <CardTitle className='text-base font-semibold'>
                          {discount.name || 'Discount'}
                        </CardTitle>
                        <CardDescription className='text-xs capitalize'>
                          {discount.duration || 'once'} duration
                        </CardDescription>
                      </div>
                      <Badge className='border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'>
                        {discountDisplay}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className='space-y-3 pb-3'>
                    {discount.code ? (
                      <div className='bg-muted/50 flex items-center justify-between rounded-lg border px-3 py-2'>
                        <span className='text-primary font-mono text-sm font-bold tracking-wider'>
                          {discount.code}
                        </span>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-6 w-6'
                          onClick={(e) => handleCopyCode(e, discount.code)}
                        >
                          {copiedCode === discount.code ? (
                            <Check className='h-3.5 w-3.5 text-emerald-500' />
                          ) : (
                            <Copy className='h-3.5 w-3.5' />
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className='text-muted-foreground text-xs italic'>
                        Automatic discount (no code required)
                      </div>
                    )}

                    <div className='text-muted-foreground flex items-center justify-between text-xs'>
                      <span>Redemptions</span>
                      <span className='text-foreground font-medium'>
                        {discount.redemptionsCount ?? 0}
                        {discount.maxRedemptions
                          ? ` / ${discount.maxRedemptions}`
                          : ''}
                      </span>
                    </div>
                  </CardContent>

                  <CardFooter className='border-t pt-3'>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='w-full text-xs'
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenDetail(discount)
                      }}
                    >
                      <Eye className='mr-1.5 h-3.5 w-3.5' />
                      View Details
                    </Button>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        )}

        {/* Discount Detail Sheet */}
        <DiscountDetailSheet
          discount={selectedDiscount}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
        />
      </Main>
    </>
  )
}
