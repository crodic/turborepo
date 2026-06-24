import { format } from 'date-fns'
import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import ComponentTableRowActions from './component-table-row-action'
import { ColumnKey, type ThemeSchema } from './schema'

export function getThemesTableColumns(): ColumnDef<ThemeSchema>[] {
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label='Select all'
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label='Select row'
        />
      ),
      size: 32,
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: ColumnKey.name,
      accessorFn: (row) => row.name,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Name' />
      ),
      meta: {
        variant: 'text',
        placeholder: 'Name',
        label: 'Name',
      },
      cell: ({ row }) => (
        <div className='min-w-0'>
          <p className='truncate font-medium'>{row.original.name}</p>
          <p className='text-muted-foreground truncate font-mono text-xs'>
            {row.original.slug}
          </p>
        </div>
      ),
      enableColumnFilter: true,
    },
    {
      id: ColumnKey.status,
      accessorFn: (row) => row.status,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Status' />
      ),
      cell: ({ row }) => (
        <Badge
          variant={
            row.original.status === 'published' ? 'default' : 'secondary'
          }
        >
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: ColumnKey.runtime,
      accessorFn: (row) =>
        [
          row.isAdminDefault ? 'admin' : null,
          row.isClientDefault ? 'client' : null,
        ]
          .filter(Boolean)
          .join(', '),
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Runtime' />
      ),
      cell: ({ row }) => {
        const theme = row.original

        if (!theme.isAdminDefault && !theme.isClientDefault) {
          return <span className='text-muted-foreground text-sm'>-</span>
        }

        return (
          <div className='flex flex-wrap gap-1'>
            {theme.isAdminDefault && <Badge>Admin</Badge>}
            {theme.isClientDefault && <Badge variant='secondary'>Client</Badge>}
          </div>
        )
      },
    },
    {
      id: ColumnKey.updatedAt,
      accessorFn: (row) => row.updatedAt,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Updated At' />
      ),
      cell: ({ row }) => (
        <p className='truncate'>
          {format(row.original.updatedAt, 'dd/MM/yyyy HH:mm aa')}
        </p>
      ),
    },
    {
      id: ColumnKey.actions,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Actions' />
      ),
      cell: ({ row }) => <ComponentTableRowActions row={row} />,
      size: 40,
      enableColumnFilter: false,
      enableHiding: false,
      enableSorting: false,
    },
  ]
}
