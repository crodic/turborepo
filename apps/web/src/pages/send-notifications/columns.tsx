import type { ColumnDef } from '@tanstack/react-table'
import i18n from '@/i18n'
import { MailIcon, TextIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { type AdminSchema, ColumnKey } from '../admins/schema'

export function getSendNotificationColumns({
  onlineAdminIds,
}: {
  onlineAdminIds: number[]
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
      id: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const isOnline = onlineAdminIds.includes(Number(row.original.id))
        return (
          <div className='flex items-center gap-2'>
            <span
              className={`h-2.5 w-2.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-300'}`}
            />
            <span className='text-sm'>{isOnline ? 'Online' : 'Offline'}</span>
          </div>
        )
      },
      size: 100,
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
      cell: ({ row }) => (
        <div className='flex flex-wrap gap-1'>
          {row.original.roles.map((role) => (
            <Badge key={role.id} variant='secondary'>
              {role.name}
            </Badge>
          ))}
        </div>
      ),
      enableHiding: false,
      enableSorting: false,
    },
  ]
}
