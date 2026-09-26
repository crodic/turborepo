import { format } from 'date-fns'
import type { ColumnDef } from '@tanstack/react-table'
import { FileText, Receipt, RotateCcw } from 'lucide-react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import type { PolarOrderSchema } from '../schema'

const orderStatusVariant: Record<
  string,
  'default' | 'destructive' | 'secondary' | 'outline'
> = {
  paid: 'default',
  pending: 'outline',
  refunded: 'secondary',
  partially_refunded: 'secondary',
  failed: 'destructive',
  expired: 'destructive',
}

export function getOrdersTableColumns({
  canManageRefund,
  onRefund,
}: {
  canManageRefund: boolean
  onRefund: (order: PolarOrderSchema) => void
}): ColumnDef<PolarOrderSchema>[] {
  return [
    {
      id: 'orderNumber',
      accessorFn: (row) => row.orderNumber,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Order #' />
      ),
      cell: ({ row }) => (
        <span className='font-mono text-xs font-medium'>
          {row.original.orderNumber}
        </span>
      ),
    },
    {
      id: 'customer',
      accessorFn: (row) => row.customerEmail,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Customer / User' />
      ),
      cell: ({ row }) => {
        const { customerEmail, customerName, userId } = row.original
        return (
          <div className='flex flex-col gap-0.5'>
            <span className='text-sm font-medium'>{customerEmail}</span>
            <div className='text-muted-foreground flex items-center gap-1.5 text-xs'>
              {customerName && <span>{customerName}</span>}
              {userId && (
                <Link
                  to={`/users/${userId}/show`}
                  className='text-primary font-mono text-[11px] hover:underline'
                >
                  (User #{userId})
                </Link>
              )}
            </div>
          </div>
        )
      },
    },
    {
      id: 'productTitle',
      accessorFn: (row) => row.productTitle || row.productId,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Product' />
      ),
      cell: ({ row }) => (
        <span className='text-sm'>
          {row.original.productTitle || row.original.productId}
        </span>
      ),
    },
    {
      id: 'breakdown',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Amount & Tax' />
      ),
      cell: ({ row }) => {
        const { amount, currency, discountAmount, taxAmount } = row.original
        const total = (amount / 100).toFixed(2)
        const discount = discountAmount
          ? (discountAmount / 100).toFixed(2)
          : null
        const tax = taxAmount ? (taxAmount / 100).toFixed(2) : null

        return (
          <div className='flex flex-col text-xs'>
            <span className='font-mono text-sm font-semibold'>
              ${total} {currency.toUpperCase()}
            </span>
            <div className='text-muted-foreground flex items-center gap-2 text-[11px]'>
              {discount && (
                <span className='font-mono text-emerald-600'>
                  -${discount} discount
                </span>
              )}
              {tax && <span className='font-mono'>+${tax} tax</span>}
            </div>
          </div>
        )
      },
    },
    {
      id: 'status',
      accessorFn: (row) => row.status,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Status' />
      ),
      cell: ({ row }) => {
        const status = row.original.status
        return (
          <Badge
            variant={orderStatusVariant[status] || 'secondary'}
            className='text-[10px] font-semibold tracking-wider uppercase'
          >
            {status}
          </Badge>
        )
      },
    },
    {
      id: 'documents',
      header: () => <span className='text-xs'>Documents</span>,
      cell: ({ row }) => {
        const { invoiceUrl, receiptUrl } = row.original
        return (
          <div className='flex items-center gap-1.5'>
            {invoiceUrl && (
              <a
                href={invoiceUrl}
                target='_blank'
                rel='noopener noreferrer'
                title='View Invoice PDF'
              >
                <Button variant='outline' size='icon' className='size-7 p-0'>
                  <FileText className='text-muted-foreground size-3.5' />
                </Button>
              </a>
            )}
            {receiptUrl && (
              <a
                href={receiptUrl}
                target='_blank'
                rel='noopener noreferrer'
                title='View Payment Receipt'
              >
                <Button variant='outline' size='icon' className='size-7 p-0'>
                  <Receipt className='text-muted-foreground size-3.5' />
                </Button>
              </a>
            )}
          </div>
        )
      },
    },
    {
      id: 'createdAt',
      accessorFn: (row) => row.createdAt,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Date' />
      ),
      cell: ({ row }) => (
        <span className='text-muted-foreground text-xs'>
          {format(new Date(row.original.createdAt), 'dd/MM/yyyy HH:mm')}
        </span>
      ),
    },
    {
      id: 'actions',
      header: () => <span className='text-xs'>Actions</span>,
      cell: ({ row }) => {
        const order = row.original
        if (order.status === 'paid' && canManageRefund) {
          return (
            <Button
              variant='outline'
              size='sm'
              className='text-muted-foreground hover:text-foreground h-7 gap-1 px-2 text-xs font-medium'
              onClick={() => onRefund(order)}
            >
              <RotateCcw className='size-3 text-amber-600 dark:text-amber-400' />
              <span>Refund</span>
            </Button>
          )
        }
        return null
      },
    },
  ]
}
