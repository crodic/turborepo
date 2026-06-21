import type { ColumnDef } from '@tanstack/react-table'
import i18n from '@/i18n'
import { CheckSquareIcon, MailIcon, TextIcon, XSquareIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { type RoleSchema } from '../roles/schema'
import ComponentTableRowActions from './component-table-row-action'
import { ColumnKey, type AdminSchema } from './schema'

export function getAdminsTableColumns({
  roles = [],
}: {
  roles?: RoleSchema[]
}): ColumnDef<AdminSchema>[] {
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
      id: ColumnKey.email,
      accessorFn: (row) => row.email,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          label={i18n.t('adminUsers.table.email')}
        />
      ),
      meta: {
        variant: 'text',
        placeholder: i18n.t('adminUsers.table.email'),
        label: i18n.t('adminUsers.table.email'),
        icon: MailIcon,
      },
      cell: ({ row }) => <div>{row.original.email}</div>,
      enableColumnFilter: true,
    },
    {
      id: ColumnKey.fullName,
      accessorFn: (row) => row.fullName,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          label={i18n.t('adminUsers.table.fullName')}
        />
      ),
      cell: ({ row }) => (
        <p className='truncate overflow-hidden'>{row.original.fullName}</p>
      ),
      meta: {
        variant: 'text',
        placeholder: i18n.t('adminUsers.table.fullName'),
        label: i18n.t('adminUsers.table.fullName'),
        icon: TextIcon,
      },
      enableHiding: false,
      enableSorting: false,
      enableColumnFilter: true,
    },
    {
      id: ColumnKey.role,
      accessorFn: (row) => row.roleIds,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          label={i18n.t('adminUsers.table.role')}
        />
      ),
      meta: {
        variant: 'multiSelect',
        label: i18n.t('adminUsers.table.role'),
        options: roles.map((role) => ({ label: role.name, value: role.id })),
      },
      cell: ({ row }) => (
        <div className='flex flex-wrap gap-1'>
          {row.original.roles.map((role) => (
            <Badge key={role.id} variant='secondary'>
              {role.name}
            </Badge>
          ))}
        </div>
      ),
      enableColumnFilter: true,
      enableHiding: false,
      enableSorting: false,
    },
    {
      id: ColumnKey.verifiedAt,
      accessorFn: (row) => row.verifiedAt,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          label={i18n.t('adminUsers.table.emailVerified')}
        />
      ),
      cell: ({ row }) => (
        <div className='flex items-center'>
          {row.original.verifiedAt ? (
            <CheckSquareIcon className='text-green-500' />
          ) : (
            <XSquareIcon className='text-destructive' />
          )}
        </div>
      ),
      enableHiding: false,
      enableSorting: false,
      enableColumnFilter: true,
    },
    {
      id: 'actions',
      accessorKey: 'actions',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          label={i18n.t('adminUsers.table.action')}
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
