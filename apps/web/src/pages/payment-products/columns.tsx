import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import ComponentTableRowActions from './component-table-row-action'
import { ColumnKey, type PaymentProductSchema } from './schema'

export function getPaymentProductsTableColumns(): ColumnDef<PaymentProductSchema>[] {
  return [
    {
      id: ColumnKey.planSlug,
      accessorFn: (row) => row.planSlug,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Slug' />
      ),
      cell: ({ row }) => (
        <span className='font-mono text-xs font-semibold uppercase'>
          {row.getValue(ColumnKey.planSlug)}
        </span>
      ),
      meta: {
        label: 'Slug',
        placeholder: 'Filter slug...',
        variant: 'text',
      },
      enableColumnFilter: true,
    },
    {
      id: ColumnKey.name,
      accessorFn: (row) => row.name,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Name' />
      ),
      cell: ({ row }) => (
        <div className='flex items-center gap-2'>
          <span className='font-medium'>{row.original.name}</span>
          {row.original.badge && (
            <Badge variant='secondary' className='text-xs'>
              {row.original.badge}
            </Badge>
          )}
        </div>
      ),
      meta: {
        label: 'Name',
        placeholder: 'Search name or polar id...',
        variant: 'text',
      },
      enableColumnFilter: true,
    },
    {
      id: ColumnKey.interval,
      accessorFn: (row) => row.interval,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Interval' />
      ),
      cell: ({ row }) => {
        const interval = row.getValue<string>(ColumnKey.interval)
        return (
          <Badge
            variant={
              interval === 'yearly'
                ? 'default'
                : interval === 'one_time'
                  ? 'secondary'
                  : 'outline'
            }
            className='capitalize'
          >
            {interval === 'one_time' ? 'One-time' : interval}
          </Badge>
        )
      },
      meta: {
        label: 'Interval',
        variant: 'select',
        options: [
          { label: 'Monthly', value: 'monthly' },
          { label: 'Yearly', value: 'yearly' },
          { label: 'One-time', value: 'one_time' },
        ],
      },
      enableColumnFilter: true,
    },
    {
      accessorKey: ColumnKey.price,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Price' />
      ),
      cell: ({ row }) => {
        const isFree = row.original.isFree
        const price = row.getValue<number>(ColumnKey.price)
        const currency = (row.original.currency || 'USD').toUpperCase()
        const rawPrices = row.original.prices
        const activePrices =
          rawPrices && rawPrices.length > 0
            ? rawPrices.filter((p) => !p.isArchived)
            : []

        if (isFree) {
          return (
            <span className='font-semibold text-green-600 dark:text-green-400'>
              Free
            </span>
          )
        }

        if (activePrices.length > 0) {
          if (activePrices.every((p) => p.amount === 0)) {
            return (
              <span className='font-semibold text-green-600 dark:text-green-400'>
                Free
              </span>
            )
          }

          return (
            <div className='flex flex-wrap items-center gap-1.5'>
              {activePrices.map((p, idx) => {
                const curr = (p.currency || 'USD').toUpperCase()
                const formatted =
                  p.amount === 0
                    ? 'Free'
                    : curr === 'VND'
                      ? `${Number(p.amount).toLocaleString('vi-VN')} ₫`
                      : `$${p.amount} ${curr}`

                return (
                  <Badge
                    key={p.id || idx}
                    variant={p.amount === 0 ? 'secondary' : 'outline'}
                    className='font-mono text-xs font-medium'
                  >
                    {formatted}
                  </Badge>
                )
              })}
            </div>
          )
        }

        if (price === 0) {
          return (
            <span className='font-semibold text-green-600 dark:text-green-400'>
              Free
            </span>
          )
        }

        const formatted =
          currency === 'VND'
            ? `${Number(price).toLocaleString('vi-VN')} ₫`
            : `$${price} ${currency}`

        return <span className='font-semibold'>{formatted}</span>
      },
    },
    {
      accessorKey: ColumnKey.polarProductId,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Polar Product ID' />
      ),
      cell: ({ row }) => {
        const polarId = row.original.polarProductId
        if (!polarId) {
          return (
            <span className='text-muted-foreground text-xs italic'>
              None (Free / External)
            </span>
          )
        }
        return (
          <code className='bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-xs'>
            {polarId}
          </code>
        )
      },
    },
    {
      id: ColumnKey.isActive,
      accessorFn: (row) => (row.isActive ? 'true' : 'false'),
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Status' />
      ),
      cell: ({ row }) => {
        const isActive = row.original.isActive
        return (
          <Badge variant={isActive ? 'default' : 'secondary'}>
            {isActive ? 'Active' : 'Inactive'}
          </Badge>
        )
      },
      meta: {
        label: 'Status',
        variant: 'select',
        options: [
          { label: 'Active', value: 'true' },
          { label: 'Inactive', value: 'false' },
        ],
      },
      enableColumnFilter: true,
    },
    {
      accessorKey: ColumnKey.sortOrder,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Order' />
      ),
      cell: ({ row }) => (
        <span className='text-muted-foreground text-xs'>
          {row.getValue(ColumnKey.sortOrder)}
        </span>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => <ComponentTableRowActions row={row} />,
    },
  ]
}
