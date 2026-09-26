import { format } from 'date-fns'
import type { ColumnDef } from '@tanstack/react-table'
import { Eye, ExternalLink, Package } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'

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

export function getProductsColumns({
  onViewDetail,
}: {
  onViewDetail: (product: any) => void
}): ColumnDef<any>[] {
  return [
    {
      id: 'name',
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Product' />
      ),
      cell: ({ row }) => (
        <div className='flex max-w-sm items-start gap-2.5'>
          <div className='bg-primary/10 text-primary mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg'>
            <Package className='h-4 w-4' />
          </div>
          <div className='min-w-0 space-y-0.5'>
            <p className='text-foreground truncate text-sm font-semibold'>
              {row.original.name}
            </p>
            {row.original.description && (
              <p className='text-muted-foreground line-clamp-1 text-xs'>
                {row.original.description}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      id: 'isRecurring',
      accessorKey: 'isRecurring',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Type' />
      ),
      cell: ({ row }) => (
        <Badge
          variant={row.original.isRecurring ? 'default' : 'secondary'}
          className='text-xs'
        >
          {row.original.isRecurring ? 'Subscription' : 'One-time'}
        </Badge>
      ),
    },
    {
      id: 'price',
      header: () => <span>Price</span>,
      cell: ({ row }) => {
        const prices = row.original.prices
        const mainPrice = prices && prices.length > 0 ? prices[0] : null
        return (
          <div className='space-y-0.5'>
            <span className='text-foreground text-sm font-semibold'>
              {formatPrice(mainPrice)}
            </span>
            {prices && prices.length > 1 && (
              <span className='text-muted-foreground block text-[11px]'>
                +{prices.length - 1} more tier(s)
              </span>
            )}
          </div>
        )
      },
    },
    {
      id: 'benefits',
      header: () => <span>Benefits</span>,
      cell: ({ row }) => {
        const count = row.original.benefits?.length ?? 0
        return (
          <span className='text-muted-foreground text-xs font-medium'>
            {count > 0 ? `${count} benefits` : 'None'}
          </span>
        )
      },
    },
    {
      id: 'status',
      header: () => <span>Status</span>,
      cell: ({ row }) => (
        <Badge
          variant={row.original.isArchived ? 'destructive' : 'outline'}
          className='text-xs'
        >
          {row.original.isArchived ? 'Archived' : 'Active'}
        </Badge>
      ),
    },
    {
      id: 'createdAt',
      accessorKey: 'createdAt',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Created At' />
      ),
      cell: ({ row }) => (
        <span className='text-muted-foreground text-xs'>
          {row.original.createdAt
            ? format(new Date(row.original.createdAt), 'MMM dd, yyyy')
            : 'N/A'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: () => <div className='text-right'>Actions</div>,
      cell: ({ row }) => (
        <div className='flex items-center justify-end gap-1'>
          <Button
            variant='ghost'
            size='icon'
            className='h-8 w-8 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950'
            onClick={(e) => {
              e.stopPropagation()
              onViewDetail(row.original)
            }}
          >
            <Eye className='h-4 w-4' />
          </Button>
          <Button
            variant='ghost'
            size='icon'
            className='text-muted-foreground hover:text-foreground h-8 w-8'
            onClick={(e) => {
              e.stopPropagation()
              window.open('https://sandbox.polar.sh/dashboard', '_blank')
            }}
          >
            <ExternalLink className='h-4 w-4' />
          </Button>
        </div>
      ),
    },
  ]
}
