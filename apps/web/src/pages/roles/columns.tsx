import { format } from 'date-fns'
import type { ColumnDef } from '@tanstack/react-table'
import app from '@/config/app'
import i18n from '@/i18n'
import { Text } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import ComponentTableRowActions from './component-table-row-action'
import { ColumnKey, DomainType, type RoleSchema } from './schema'

export function getRolesTableColumns(): ColumnDef<RoleSchema>[] {
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
        <DataTableColumnHeader
          column={column}
          label={i18n.t('roles.table.name')}
        />
      ),
      meta: {
        variant: 'text',
        placeholder: i18n.t('roles.table.name'),
        label: i18n.t('roles.table.name'),
        icon: Text,
      },
      cell: ({ row }) => (
        <div className='flex flex-col'>
          <div className='flex items-center gap-2'>
            <span className='truncate font-medium'>{row.original.name}</span>
            {row.original.isSystem && (
              <Badge variant='secondary' className='px-1.5 py-0 text-[10px]'>
                {i18n.t('roles.show.systemRole')}
              </Badge>
            )}
          </div>
          {row.original.code && (
            <span className='text-muted-foreground font-mono text-xs'>
              {row.original.code}
            </span>
          )}
        </div>
      ),
      enableColumnFilter: true,
    },
    {
      id: ColumnKey.domain,
      accessorFn: (row) => row.domain,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          label={i18n.t('roles.table.domain')}
        />
      ),
      cell: ({ row }) => {
        const isClient = row.original.domain === DomainType.CLIENT
        return (
          <Badge variant={isClient ? 'outline' : 'secondary'}>
            {isClient
              ? i18n.t('roles.domain.client')
              : i18n.t('roles.domain.admin')}
          </Badge>
        )
      },
      enableColumnFilter: true,
      enableSorting: true,
    },
    {
      id: ColumnKey.permissions,
      accessorFn: (row) => row.permissions,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          label={i18n.t('roles.table.permissions')}
        />
      ),
      cell: ({ row }) => (
        <p className='truncate overflow-hidden'>
          {app.isSupperAdmin(row.original.permissions)
            ? 'Super Admin'
            : `${row.original.permissions.length} permissions`}
        </p>
      ),
      enableColumnFilter: false,
      enableHiding: false,
      enableSorting: false,
    },
    {
      id: ColumnKey.createdAt,
      accessorFn: (row) => row.createdAt,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          label={i18n.t('roles.table.createdAt')}
        />
      ),
      meta: {
        label: i18n.t('roles.table.createdAt'),
      },
      cell: ({ row }) => (
        <p className='truncate overflow-hidden'>
          {row.original.createdAt
            ? format(row.original.createdAt, 'dd/MM/yyyy HH:mm aa')
            : '-'}
        </p>
      ),
      enableColumnFilter: true,
    },
    {
      id: 'actions',
      accessorKey: 'actions',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          label={i18n.t('roles.table.actions')}
        />
      ),
      cell: ({ row }) => <ComponentTableRowActions row={row} />,
      size: 40,
      enableColumnFilter: true,
      enableHiding: false,
      enableSorting: false,
    },
  ]
}
