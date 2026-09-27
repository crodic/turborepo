import { format } from 'date-fns'
import type { ColumnDef } from '@tanstack/react-table'
import { Eye, ExternalLink, Package, Pencil, Archive } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { formatPolarPrice } from '../utils'

export function getProductsColumns({
  onViewDetail,
  onEdit,
  onArchive,
}: {
  onViewDetail: (product: any) => void
  onEdit?: (product: any) => void
  onArchive?: (product: any) => void
}): ColumnDef<any>[] {
  return [
    {
      id: 'name',
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Product' />
      ),
      cell: ({ row }) => {
        const medias = row.original.medias || []
        const firstMedia = medias[0]
        const imageUrl =
          typeof firstMedia === 'string'
            ? firstMedia.startsWith('http')
              ? firstMedia
              : undefined
            : firstMedia?.publicUrl ||
              firstMedia?.public_url ||
              (firstMedia?.path
                ? `https://polar-public-sandbox-files.s3.amazonaws.com/${firstMedia.path}`
                : undefined)

        return (
          <div className='flex max-w-sm items-start gap-2.5'>
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={row.original.name}
                className='border-border/60 bg-background mt-0.5 size-8 shrink-0 rounded-lg border object-cover'
                onError={(e) => {
                  ;(e.currentTarget as HTMLElement).style.display = 'none'
                }}
              />
            ) : (
              <div className='bg-primary/10 text-primary mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg'>
                <Package className='size-4' />
              </div>
            )}
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
        )
      },
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
        const prices = row.original.prices || []
        const activePrices = prices.filter((p: any) => !p.isArchived)
        if (activePrices.length === 0) {
          return (
            <span className='text-muted-foreground text-sm font-medium'>
              Free
            </span>
          )
        }
        return (
          <div className='flex flex-col gap-1'>
            {activePrices.map((p: any, idx: number) => (
              <span
                key={p.id || idx}
                className='text-foreground text-sm font-semibold whitespace-nowrap'
              >
                {formatPolarPrice(p, row.original.recurringInterval)}
              </span>
            ))}
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
            title='View Details'
            className='h-8 w-8 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950'
            onClick={(e) => {
              e.stopPropagation()
              onViewDetail(row.original)
            }}
          >
            <Eye className='h-4 w-4' />
          </Button>
          {onEdit && (
            <Button
              variant='ghost'
              size='icon'
              title='Edit Product'
              className='h-8 w-8 text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-950'
              onClick={(e) => {
                e.stopPropagation()
                onEdit(row.original)
              }}
            >
              <Pencil className='h-4 w-4' />
            </Button>
          )}
          {onArchive && !row.original.isArchived && (
            <Button
              variant='ghost'
              size='icon'
              title='Archive Product'
              className='h-8 w-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950'
              onClick={(e) => {
                e.stopPropagation()
                onArchive(row.original)
              }}
            >
              <Archive className='h-4 w-4' />
            </Button>
          )}
          <Button
            variant='ghost'
            size='icon'
            title='View on Polar'
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
