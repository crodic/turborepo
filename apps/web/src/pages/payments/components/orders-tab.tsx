import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import type { ColumnDef } from '@tanstack/react-table'
import { RotateCcw } from 'lucide-react'
import { parseAsString } from 'nuqs'
import { Link } from 'react-router'
import { useAuthStore } from '@/stores/auth-store'
import { PaginateQueryBuilder } from '@/lib/query-builder'
import { sortParser } from '@/lib/utils'
import { useDataTable } from '@/hooks/use-data-table'
import useGetFilterParams from '@/hooks/use-get-filter-params'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/data-table/data-table'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import { useDataAdminOrders } from '../queries'
import { type PaymentOrderSchema } from '../schema'
import { DirectRefundDialog } from './direct-refund-dialog'

const statusVariant: Record<
  string,
  'default' | 'destructive' | 'secondary' | 'outline'
> = {
  paid: 'default',
  pending: 'outline',
  refunded: 'secondary',
  failed: 'destructive',
  expired: 'destructive',
}

const orderFilterParsers = {
  search: parseAsString.withDefault(''),
  status: parseAsString.withDefault(''),
} as const

export function OrdersTab() {
  const [selectedOrder, setSelectedOrder] = useState<PaymentOrderSchema | null>(
    null
  )
  const [directRefundOpen, setDirectRefundOpen] = useState(false)

  const {
    page,
    perPage,
    sorting: sort,
    filter,
  } = useGetFilterParams<PaymentOrderSchema, typeof orderFilterParsers>({
    allowedSorts: ['id', 'amount', 'status', 'createdAt', 'updatedAt'],
    filterParsers: orderFilterParsers,
  })

  const builder = new PaginateQueryBuilder()
    .page(page)
    .limit(perPage)
    .applySorts(sortParser(sort))

  if (filter.search) {
    builder.search(filter.search)
  }
  if (filter.status) {
    builder.eq('status', filter.status)
  }

  const { ability } = useAuthStore()
  const canManageRefund = ability.can('update', 'PAYMENT')

  const { data, isFetching } = useDataAdminOrders(builder.build())

  const columns = useMemo<ColumnDef<PaymentOrderSchema>[]>(
    () => [
      {
        id: 'orderNumber',
        accessorFn: (row) => row.orderNumber,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label='Order #' />
        ),
        cell: ({ row }) => (
          <span className='font-mono font-medium'>
            {row.original.orderNumber}
          </span>
        ),
      },
      {
        id: 'customerEmail',
        accessorFn: (row) => row.customerEmail,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label='Customer / User' />
        ),
        cell: ({ row }) => {
          const { customerEmail, customerName, userId } = row.original
          return (
            <div className='flex flex-col gap-0.5'>
              <span className='font-medium'>{customerEmail}</span>
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
          <DataTableColumnHeader column={column} label='Product / Plan' />
        ),
        cell: ({ row }) => (
          <span className='text-sm'>
            {row.original.productTitle || row.original.productId}
          </span>
        ),
      },
      {
        id: 'amount',
        accessorFn: (row) => row.amount,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label='Amount' />
        ),
        cell: ({ row }) => {
          const formatted = (row.original.amount / 100).toFixed(2)
          return (
            <span className='font-semibold'>
              ${formatted} {row.original.currency.toUpperCase()}
            </span>
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
            <Badge variant={statusVariant[status] ?? 'secondary'}>
              {status.toUpperCase()}
            </Badge>
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
                onClick={() => {
                  setSelectedOrder(order)
                  setDirectRefundOpen(true)
                }}
              >
                <RotateCcw className='size-3 text-amber-600 dark:text-amber-400' />
                <span>Refund</span>
              </Button>
            )
          }

          return null
        },
      },
    ],
    [canManageRefund]
  )

  const { table } = useDataTable({
    data: data?.data ?? [],
    columns,
    pageCount: data?.meta.totalPages ?? 0,
    getRowId: (row) => String(row.id),
  })

  return (
    <>
      <DataTable table={table} isFetching={isFetching}>
        <DataTableToolbar table={table} />
      </DataTable>

      <DirectRefundDialog
        order={selectedOrder}
        open={directRefundOpen}
        onOpenChange={setDirectRefundOpen}
      />
    </>
  )
}
