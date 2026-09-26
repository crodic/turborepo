import { useState, useMemo } from 'react'
import {
  Package,
  ExternalLink,
  RefreshCw,
  Search,
  Sparkles,
  CreditCard,
  Layers,
} from 'lucide-react'
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
import { useDataPolarProducts } from '../queries'
import { ProductDetailSheet } from './components/product-detail-sheet'

export function PagePolarProducts() {
  const {
    data: products = [],
    isLoading,
    isFetching,
    refetch,
  } = useDataPolarProducts()
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<
    'all' | 'recurring' | 'one_time'
  >('all')
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const filteredProducts = useMemo(() => {
    return products.filter((p: any) => {
      const matchesSearch =
        !search ||
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.description?.toLowerCase().includes(search.toLowerCase()) ||
        p.id?.toLowerCase().includes(search.toLowerCase())

      const matchesType =
        filterType === 'all'
          ? true
          : filterType === 'recurring'
            ? p.isRecurring
            : !p.isRecurring

      return matchesSearch && matchesType
    })
  }, [products, search, filterType])

  const handleOpenDetail = (product: any) => {
    setSelectedProduct(product)
    setSheetOpen(true)
  }

  const formatPrice = (price: any) => {
    if (!price) return 'Free'
    const amount = (price.priceAmount ?? price.price_amount ?? 0) / 100
    const currency = (
      price.priceCurrency ??
      price.price_currency ??
      'USD'
    ).toUpperCase()
    const interval = price.recurringInterval ?? price.recurring_interval
    return `${new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount)}${interval ? ` / ${interval}` : ''}`
  }

  return (
    <>
      <Header fixed>
        <div className='flex items-center gap-2'>
          <Package className='text-primary h-5 w-5' />
          <h1 className='text-lg font-semibold tracking-tight'>
            Polar Products
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
            <h2 className='text-2xl font-bold tracking-tight'>
              Products & Tiers
            </h2>
            <p className='text-muted-foreground text-sm'>
              Live catalog fetched directly from your Polar organization. Single
              source of truth.
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              className='gap-2'
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw
                className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`}
              />
              Refresh
            </Button>
            <Button
              size='sm'
              className='gap-2'
              onClick={() =>
                window.open('https://polar.sh/dashboard', '_blank')
              }
            >
              <ExternalLink className='h-4 w-4' />
              Manage on Polar
            </Button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className='flex flex-col justify-between gap-3 sm:flex-row sm:items-center'>
          <div className='relative w-full sm:w-80'>
            <Search className='text-muted-foreground absolute top-2.5 left-3 h-4 w-4' />
            <Input
              placeholder='Search products...'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className='pl-9'
            />
          </div>

          <div className='flex items-center gap-2'>
            <Button
              variant={filterType === 'all' ? 'default' : 'outline'}
              size='sm'
              onClick={() => setFilterType('all')}
            >
              All ({products.length})
            </Button>
            <Button
              variant={filterType === 'recurring' ? 'default' : 'outline'}
              size='sm'
              onClick={() => setFilterType('recurring')}
            >
              Subscriptions
            </Button>
            <Button
              variant={filterType === 'one_time' ? 'default' : 'outline'}
              size='sm'
              onClick={() => setFilterType('one_time')}
            >
              One-Time
            </Button>
          </div>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className='flex h-64 items-center justify-center'>
            <RefreshCw className='text-muted-foreground h-8 w-8 animate-spin' />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className='flex h-64 flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center'>
            <Package className='text-muted-foreground/60 mb-3 h-12 w-12' />
            <h3 className='text-lg font-medium'>No products found</h3>
            <p className='text-muted-foreground mt-1 max-w-sm text-sm'>
              {search
                ? 'No products matched your search keyword.'
                : 'You have not created any active products on Polar yet.'}
            </p>
            <Button
              className='mt-4 gap-2'
              onClick={() =>
                window.open('https://polar.sh/dashboard', '_blank')
              }
            >
              <ExternalLink className='h-4 w-4' />
              Create Product on Polar
            </Button>
          </div>
        ) : (
          <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
            {filteredProducts.map((product: any) => (
              <Card
                key={product.id}
                className='hover:border-primary/50 flex flex-col justify-between shadow-sm transition-colors'
              >
                <CardHeader>
                  <div className='flex items-start justify-between gap-2'>
                    <div>
                      <CardTitle className='text-lg font-bold'>
                        {product.name}
                      </CardTitle>
                      <CardDescription className='mt-1 line-clamp-2'>
                        {product.description || 'No description'}
                      </CardDescription>
                    </div>
                    <Badge
                      variant={product.isRecurring ? 'default' : 'secondary'}
                      className='shrink-0'
                    >
                      {product.isRecurring ? 'Subscription' : 'One-time'}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className='space-y-4'>
                  {/* Prices */}
                  <div className='bg-muted/40 space-y-1.5 rounded-lg p-3'>
                    <div className='text-muted-foreground flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase'>
                      <CreditCard className='h-3.5 w-3.5' />
                      Price
                    </div>
                    <div className='text-foreground text-xl font-bold'>
                      {product.prices && product.prices.length > 0
                        ? formatPrice(product.prices[0])
                        : 'Free'}
                    </div>
                    {product.prices && product.prices.length > 1 && (
                      <div className='text-muted-foreground text-xs'>
                        + {product.prices.length - 1} other tier(s)
                      </div>
                    )}
                  </div>

                  {/* Benefits overview */}
                  {product.benefits && product.benefits.length > 0 && (
                    <div className='space-y-1.5'>
                      <div className='text-muted-foreground flex items-center gap-1.5 text-xs font-semibold'>
                        <Sparkles className='h-3.5 w-3.5 text-amber-500' />
                        {product.benefits.length} Benefits included
                      </div>
                      <div className='flex flex-wrap gap-1.5'>
                        {product.benefits.slice(0, 3).map((benefit: any) => (
                          <Badge
                            key={benefit.id}
                            variant='outline'
                            className='max-w-48 truncate text-xs'
                          >
                            {benefit.description}
                          </Badge>
                        ))}
                        {product.benefits.length > 3 && (
                          <Badge variant='outline' className='text-xs'>
                            +{product.benefits.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>

                <CardFooter className='pt-2'>
                  <Button
                    variant='outline'
                    className='w-full gap-1.5'
                    onClick={() => handleOpenDetail(product)}
                  >
                    <Layers className='h-4 w-4' />
                    View Details
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </Main>

      <ProductDetailSheet
        product={selectedProduct}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </>
  )
}
