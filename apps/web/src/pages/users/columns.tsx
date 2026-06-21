import { format } from 'date-fns'
import type { ColumnDef } from '@tanstack/react-table'
import i18n from '@/i18n'
import { Calendar, MailIcon, TextIcon, UserRoundCheckIcon } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { ColumnKey, type UserSchema } from '../users/schema'
import ComponentTableRowActions from './component-table-row-action'

export function getUsersTableColumns(): ColumnDef<UserSchema>[] {
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          aria-label='Select all'
          className='translate-y-0.5'
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          aria-label='Select row'
          className='translate-y-0.5'
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
        />
      ),
      enableHiding: false,
      enableSorting: false,
      size: 40,
      minSize: 40,
    },
    {
      id: ColumnKey.id,
      accessorFn: (row) => row.id,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='ID' />
      ),
      cell: ({ row }) => <p className='truncate'>{row.original.id}</p>,
      meta: {
        label: 'ID',
        placeholder: 'Search by ID...',
        variant: 'text',
        icon: UserRoundCheckIcon,
      },
      enableColumnFilter: true,
      enableHiding: false,
      enableSorting: false,
      minSize: 100,
    },
    {
      id: ColumnKey.email,
      accessorFn: (row) => row.email,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          label={i18n.t('users.table.email')}
        />
      ),
      cell: ({ row }) => <div className='truncate'>{row.original.email}</div>,
      meta: {
        label: i18n.t('users.table.email'),
        placeholder: i18n.t('users.table.email'),
        variant: 'text',
        icon: MailIcon,
      },
      enableSorting: false,
      enableColumnFilter: true,
      enableHiding: false,
    },
    {
      id: ColumnKey.fullName,
      accessorFn: (row) => row.fullName,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          label={i18n.t('users.table.fullName')}
        />
      ),
      cell: ({ row }) => (
        <div className='truncate'>{row.original.fullName}</div>
      ),
      meta: {
        label: i18n.t('users.table.fullName'),
        placeholder: i18n.t('users.table.fullName'),
        variant: 'text',
        icon: TextIcon,
      },
      enableSorting: false,
      enableColumnFilter: true,
      enableHiding: false,
    },
    {
      id: ColumnKey.createdAt,
      accessorFn: (row) => row.createdAt,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          label={i18n.t('users.table.createdAt')}
        />
      ),
      meta: {
        label: i18n.t('users.table.createdAt'),
        variant: 'dateRange',
        icon: Calendar,
      },
      cell: ({ row }) => (
        <p>{format(row.original.createdAt, 'dd/MM/yyyy HH:mm aa')}</p>
      ),
      enableColumnFilter: true,
    },
    {
      id: 'actions',
      accessorKey: 'actions',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          label={i18n.t('users.table.actions')}
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
