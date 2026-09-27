import { useState } from 'react'
import { format } from 'date-fns'
import type { ColumnDef } from '@tanstack/react-table'
import {
  Copy,
  Check,
  Eye,
  ExternalLink,
  Link2,
  Package,
  Pencil,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'

function CopyUrlCell({ url, id }: { url: string; id: string }) {
  const [copied, setCopied] = useState(false)
  const checkoutUrl = url || `https://sandbox.polar.sh/checkout/${id}`

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(checkoutUrl)
    setCopied(true)
    toast.success('Copied checkout link!')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className='flex items-center gap-1.5'>
      <span className='text-muted-foreground max-w-50 truncate font-mono text-xs'>
        {checkoutUrl}
      </span>
      <Button
        variant='ghost'
        size='icon'
        className='h-6 w-6 shrink-0'
        onClick={handleCopy}
      >
        {copied ? (
          <Check className='h-3 w-3 text-emerald-500' />
        ) : (
          <Copy className='h-3 w-3' />
        )}
      </Button>
    </div>
  )
}

export function getCheckoutLinksColumns({
  onViewDetail,
  onEdit,
  onDelete,
}: {
  onViewDetail: (link: any) => void
  onEdit?: (link: any) => void
  onDelete?: (link: any) => void
}): ColumnDef<any>[] {
  return [
    {
      id: 'label',
      accessorKey: 'label',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Link Label' />
      ),
      cell: ({ row }) => (
        <div className='flex items-center gap-2'>
          <Link2 className='text-primary h-4 w-4 shrink-0' />
          <span className='text-foreground text-sm font-semibold'>
            {row.original.label || 'Checkout Link'}
          </span>
        </div>
      ),
    },
    {
      id: 'product',
      header: () => <span>Product</span>,
      cell: ({ row }) => {
        const product = row.original.product
        return (
          <div className='text-muted-foreground flex items-center gap-1.5 text-xs'>
            <Package className='text-primary/70 h-3.5 w-3.5' />
            <span className='text-foreground font-medium'>
              {product?.name || row.original.productId || 'Any Product'}
            </span>
          </div>
        )
      },
    },
    {
      id: 'url',
      header: () => <span>Checkout URL</span>,
      cell: ({ row }) => (
        <CopyUrlCell url={row.original.url} id={row.original.id} />
      ),
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Status' />
      ),
      cell: ({ row }) => (
        <Badge variant='outline' className='font-mono text-xs'>
          {row.original.status || 'Active'}
        </Badge>
      ),
    },
    {
      id: 'allowDiscountCodes',
      header: () => <span>Coupons</span>,
      cell: ({ row }) => (
        <span className='text-muted-foreground text-xs'>
          {row.original.allowDiscountCodes ? 'Allowed' : 'Disabled'}
        </span>
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
      cell: ({ row }) => {
        const checkoutUrl =
          row.original.url ||
          `https://sandbox.polar.sh/checkout/${row.original.id}`

        return (
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
                title='Edit Checkout Link'
                className='h-8 w-8 text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-950'
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(row.original)
                }}
              >
                <Pencil className='h-4 w-4' />
              </Button>
            )}
            {onDelete && (
              <Button
                variant='ghost'
                size='icon'
                title='Delete Checkout Link'
                className='h-8 w-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950'
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(row.original)
                }}
              >
                <Trash2 className='h-4 w-4' />
              </Button>
            )}
            <Button
              variant='ghost'
              size='icon'
              title='Open in Browser'
              className='text-muted-foreground hover:text-foreground h-8 w-8'
              onClick={(e) => {
                e.stopPropagation()
                window.open(checkoutUrl, '_blank')
              }}
            >
              <ExternalLink className='h-4 w-4' />
            </Button>
          </div>
        )
      },
    },
  ]
}
