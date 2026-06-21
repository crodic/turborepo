import { format } from 'date-fns'
import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import ComponentTableRowActions from './component-table-row-action'
import { ColumnKey, type PermissionSchema } from './schema'

export function getPermissionsTableColumns(): ColumnDef<PermissionSchema>[] {
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
            {row.original.key}
          </p>
        </div>
      ),
      enableColumnFilter: true,
    },
    {
      id: ColumnKey.group,
      accessorFn: (row) => row.group,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Group' />
      ),
      meta: {
        variant: 'text',
        placeholder: 'Group',
        label: 'Group',
      },
      cell: ({ row }) => (
        <Badge variant='secondary'>{row.original.group}</Badge>
      ),
      enableColumnFilter: true,
    },
    {
      id: ColumnKey.updatedAt,
      accessorFn: (row) => row.updatedAt,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Updated At' />
      ),
      meta: {
        label: 'Updated At',
      },
      cell: ({ row }) => (
        <p className='truncate'>
          {format(row.original.updatedAt, 'dd/MM/yyyy HH:mm aa')}
        </p>
      ),
      enableColumnFilter: false,
    },
    {
      id: ColumnKey.actions,
      accessorKey: ColumnKey.actions,
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
