import { useMemo } from 'react'
import { format } from 'date-fns'
import type { ColumnDef } from '@tanstack/react-table'
import { parseAsString } from 'nuqs'
import { Link } from 'react-router'
import { PaginateQueryBuilder } from '@/lib/query-builder'
import { sortParser } from '@/lib/utils'
import { useDataTable } from '@/hooks/use-data-table'
import useGetFilterParams from '@/hooks/use-get-filter-params'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/data-table/data-table'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import { useDataAdminTransactions } from '../queries'
import { type PaymentTransactionSchema } from '../schema'

const txStatusVariant: Record<
  string,
  'default' | 'destructive' | 'secondary' | 'outline'
> = {
  succeeded: 'default',
  pending: 'outline',
  failed: 'destructive',
}

const txFilterParsers = {
  search: parseAsString.withDefault(''),
  status: parseAsString.withDefault(''),
  type: parseAsString.withDefault(''),
} as const

export function TransactionsTab() {
  const {
    page,
    perPage,
    sorting: sort,
    filter,
  } = useGetFilterParams<PaymentTransactionSchema, typeof txFilterParsers>({
    allowedSorts: ['id', 'amount', 'type', 'status', 'createdAt'],
    filterParsers: txFilterParsers,
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
  if (filter.type) {
    builder.eq('type', filter.type)
  }

  const { data, isFetching } = useDataAdminTransactions(builder.build())

  const columns = useMemo<ColumnDef<PaymentTransactionSchema>[]>(
    () => [
      {
        id: 'polarPaymentId',
        accessorFn: (row) => row.polarPaymentId,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label='Payment ID' />
        ),
        cell: ({ row }) => (
          <span className='font-mono text-xs font-medium'>
            {row.original.polarPaymentId || `#${row.original.id}`}
          </span>
        ),
      },
      {
        id: 'userId',
        accessorFn: (row) => row.userId,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label='User' />
        ),
        cell: ({ row }) => {
          const userId = row.original.userId
          if (!userId)
            return <span className='text-muted-foreground text-xs'>-</span>
          return (
            <Link
              to={`/users/${userId}/show`}
              className='text-primary font-mono text-xs hover:underline'
            >
              User #{userId}
            </Link>
          )
        },
      },
      {
        id: 'type',
        accessorFn: (row) => row.type,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label='Type' />
        ),
        cell: ({ row }) => (
          <Badge variant='outline'>{row.original.type.toUpperCase()}</Badge>
        ),
      },
      {
        id: 'amount',
        accessorFn: (row) => row.amount,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label='Gross' />
        ),
        cell: ({ row }) => {
          const gross = (row.original.amount / 100).toFixed(2)
          return (
            <span className='font-semibold'>
              ${gross} {row.original.currency.toUpperCase()}
            </span>
          )
        },
      },
      {
        id: 'netAmount',
        accessorFn: (row) => row.netAmount,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label='Net' />
        ),
        cell: ({ row }) => {
          const net =
            row.original.netAmount != null
              ? (row.original.netAmount / 100).toFixed(2)
              : '-'
          return <span className='text-muted-foreground text-sm'>${net}</span>
        },
      },
      {
        id: 'feeAmount',
        accessorFn: (row) => row.feeAmount,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label='Fee' />
        ),
        cell: ({ row }) => {
          const fee =
            row.original.feeAmount != null
              ? (row.original.feeAmount / 100).toFixed(2)
              : '-'
          return <span className='text-muted-foreground text-xs'>${fee}</span>
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
            <Badge variant={txStatusVariant[status] ?? 'secondary'}>
              {status.toUpperCase()}
            </Badge>
          )
        },
      },
      {
        id: 'paymentMethod',
        accessorFn: (row) => row.cardBrand || row.paymentMethod,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label='Method' />
        ),
        cell: ({ row }) => {
          const { cardBrand, cardLast4, paymentMethod } = row.original
          if (cardBrand && cardLast4) {
            return (
              <span className='text-xs capitalize'>
                {cardBrand} •••• {cardLast4}
              </span>
            )
          }
          return (
            <span className='text-muted-foreground text-xs capitalize'>
              {paymentMethod || '-'}
            </span>
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
    <DataTable table={table} isFetching={isFetching}>
      <DataTableToolbar table={table} />
    </DataTable>
  )
}
