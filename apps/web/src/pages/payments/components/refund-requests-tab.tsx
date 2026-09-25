import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import type { ColumnDef } from '@tanstack/react-table'
import { CheckCircle2, Clock, ShieldCheck, XCircle } from 'lucide-react'
import { parseAsString } from 'nuqs'
import { Link } from 'react-router'
import { PaginateQueryBuilder } from '@/lib/query-builder'
import { sortParser } from '@/lib/utils'
import { useDataTable } from '@/hooks/use-data-table'
import useGetFilterParams from '@/hooks/use-get-filter-params'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/data-table/data-table'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import { useDataAdminRefundRequests } from '../queries'
import { type PaymentRefundRequestSchema } from '../schema'
import { ReviewRefundDialog } from './review-refund-dialog'

const refundStatusVariant: Record<
  string,
  'default' | 'destructive' | 'secondary' | 'outline'
> = {
  pending: 'outline',
  approved: 'default',
  rejected: 'destructive',
}

const refundFilterParsers = {
  search: parseAsString.withDefault(''),
  status: parseAsString.withDefault(''),
} as const

export function RefundRequestsTab() {
  const [selectedRequest, setSelectedRequest] =
    useState<PaymentRefundRequestSchema | null>(null)
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)

  const {
    page,
    perPage,
    sorting: sort,
    filter,
  } = useGetFilterParams<
    PaymentRefundRequestSchema,
    typeof refundFilterParsers
  >({
    allowedSorts: ['id', 'amount', 'status', 'createdAt', 'updatedAt'],
    filterParsers: refundFilterParsers,
  })

  const builder = new PaginateQueryBuilder()
    .page(page)
    .limit(perPage)
    .applySorts(sortParser(sort))

  if (filter.status) {
    builder.eq('status', filter.status)
  }

  const { data, isFetching } = useDataAdminRefundRequests(builder.build())

  const columns = useMemo<ColumnDef<PaymentRefundRequestSchema>[]>(
    () => [
      {
        id: 'id',
        accessorFn: (row) => row.id,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label='Req #' />
        ),
        cell: ({ row }) => (
          <span className='font-mono font-medium'>#{row.original.id}</span>
        ),
      },
      {
        id: 'orderId',
        accessorFn: (row) => row.orderId,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label='Order' />
        ),
        cell: ({ row }) => {
          const order = row.original.order
          return (
            <div className='flex flex-col gap-0.5'>
              <span className='font-mono text-xs font-semibold'>
                {order?.orderNumber || `Order #${row.original.orderId}`}
              </span>
              {order?.customerEmail && (
                <span className='text-muted-foreground text-xs'>
                  {order.customerEmail}
                </span>
              )}
            </div>
          )
        },
      },
      {
        id: 'userId',
        accessorFn: (row) => row.userId,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label='User' />
        ),
        cell: ({ row }) => (
          <Link
            to={`/users/${row.original.userId}/show`}
            className='text-primary font-mono text-xs hover:underline'
          >
            User #{row.original.userId}
          </Link>
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
        id: 'reason',
        accessorFn: (row) => row.reason,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label='Reason & Note' />
        ),
        cell: ({ row }) => (
          <div className='max-w-xs space-y-1'>
            <Badge variant='outline' className='text-[11px] capitalize'>
              {row.original.reason.replace(/_/g, ' ')}
            </Badge>
            {row.original.customerNote && (
              <p className='text-muted-foreground line-clamp-2 text-xs italic'>
                &ldquo;{row.original.customerNote}&rdquo;
              </p>
            )}
          </div>
        ),
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
            <div className='flex items-center gap-1.5'>
              <Badge
                variant={refundStatusVariant[status] ?? 'outline'}
                className={
                  status === 'pending'
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 capitalize dark:text-amber-400'
                    : status === 'approved'
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 capitalize dark:text-emerald-400'
                      : 'capitalize'
                }
              >
                {status === 'pending' && <Clock className='mr-1 size-3' />}
                {status === 'approved' && (
                  <CheckCircle2 className='mr-1 size-3' />
                )}
                {status === 'rejected' && <XCircle className='mr-1 size-3' />}
                {status}
              </Badge>
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
          const req = row.original
          if (req.status === 'pending') {
            return (
              <Button
                variant='outline'
                size='sm'
                className='h-7 gap-1 px-2.5 text-xs font-medium'
                onClick={() => {
                  setSelectedRequest(req)
                  setReviewDialogOpen(true)
                }}
              >
                <ShieldCheck className='text-primary size-3.5' />
                <span>Review</span>
              </Button>
            )
          }

          return (
            <span className='text-muted-foreground text-xs italic'>
              {req.adminNote ? `"${req.adminNote}"` : 'Reviewed'}
            </span>
          )
        },
      },
    ],
    []
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

      <ReviewRefundDialog
        request={selectedRequest}
        open={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
      />
    </>
  )
}
