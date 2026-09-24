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
import { useDataAdminSubscriptions } from '../queries'
import { type PaymentSubscriptionSchema } from '../schema'

const subStatusVariant: Record<
  string,
  'default' | 'destructive' | 'secondary' | 'outline'
> = {
  active: 'default',
  trialing: 'outline',
  past_due: 'destructive',
  canceled: 'secondary',
  unpaid: 'destructive',
  incomplete: 'destructive',
  incomplete_expired: 'destructive',
}

const subFilterParsers = {
  search: parseAsString.withDefault(''),
  status: parseAsString.withDefault(''),
} as const

export function SubscriptionsTab() {
  const {
    page,
    perPage,
    sorting: sort,
    filter,
  } = useGetFilterParams<PaymentSubscriptionSchema, typeof subFilterParsers>({
    allowedSorts: ['id', 'status', 'currentPeriodEnd', 'createdAt'],
    filterParsers: subFilterParsers,
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

  const { data, isFetching } = useDataAdminSubscriptions(builder.build())

  const columns = useMemo<ColumnDef<PaymentSubscriptionSchema>[]>(
    () => [
      {
        id: 'polarSubscriptionId',
        accessorFn: (row) => row.polarSubscriptionId,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label='Subscription ID' />
        ),
        cell: ({ row }) => (
          <span className='font-mono text-xs font-medium'>
            {row.original.polarSubscriptionId}
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
          const { customerEmail, userId } = row.original
          return (
            <div className='flex flex-col gap-0.5'>
              <span className='font-medium'>{customerEmail}</span>
              {userId && (
                <Link
                  to={`/users/${userId}/show`}
                  className='text-primary font-mono text-[11px] hover:underline'
                >
                  (User #{userId})
                </Link>
              )}
            </div>
          )
        },
      },
      {
        id: 'productId',
        accessorFn: (row) => row.productId,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label='Product ID' />
        ),
        cell: ({ row }) => (
          <span className='text-muted-foreground font-mono text-xs'>
            {row.original.productId}
          </span>
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
            <Badge variant={subStatusVariant[status] ?? 'secondary'}>
              {status.toUpperCase()}
            </Badge>
          )
        },
      },
      {
        id: 'currentPeriodEnd',
        accessorFn: (row) => row.currentPeriodEnd,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label='Period End' />
        ),
        cell: ({ row }) => {
          const end = row.original.currentPeriodEnd
          return (
            <span className='text-muted-foreground text-xs'>
              {end ? format(new Date(end), 'dd/MM/yyyy') : '-'}
            </span>
          )
        },
      },
      {
        id: 'cancelAtPeriodEnd',
        accessorFn: (row) => row.cancelAtPeriodEnd,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label='Auto Renew' />
        ),
        cell: ({ row }) => (
          <Badge
            variant={row.original.cancelAtPeriodEnd ? 'destructive' : 'outline'}
          >
            {row.original.cancelAtPeriodEnd ? 'Cancels at end' : 'Renews'}
          </Badge>
        ),
      },
      {
        id: 'createdAt',
        accessorFn: (row) => row.createdAt,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label='Created At' />
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
