import { format } from 'date-fns'
import type { ColumnDef } from '@tanstack/react-table'
import { CircleCheckIcon, CircleXIcon, TextIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { ColumnKey, type ImpersonationLogSchema } from './schema'

export function getImpersonationLogsTableColumns(): ColumnDef<ImpersonationLogSchema>[] {
  return [
    {
      id: ColumnKey.sessionId,
      accessorFn: (row) => row.sessionId,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Session' />
      ),
      cell: ({ row }) => (
        <p className='truncate overflow-hidden'>
          {row.original.sessionId || '-'}
        </p>
      ),
      meta: {
        variant: 'text',
        placeholder: 'Session ID',
        label: 'Session',
        icon: TextIcon,
      },
      enableColumnFilter: true,
      enableSorting: false,
    },
    {
      id: ColumnKey.adminId,
      accessorFn: (row) => row.adminId,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Admin' />
      ),
      cell: ({ row }) => row.original.adminId || '-',
      meta: {
        variant: 'text',
        placeholder: 'Admin ID',
        label: 'Admin',
        icon: TextIcon,
      },
      enableColumnFilter: true,
      enableSorting: false,
    },
    {
      id: ColumnKey.targetUserId,
      accessorFn: (row) => row.targetUserId,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Target user' />
      ),
      cell: ({ row }) => row.original.targetUserId || '-',
      meta: {
        variant: 'text',
        placeholder: 'Target user ID',
        label: 'Target user',
        icon: TextIcon,
      },
      enableColumnFilter: true,
      enableSorting: false,
    },
    {
      id: ColumnKey.action,
      accessorFn: (row) => row.action,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Action' />
      ),
      cell: ({ row }) => row.original.action || '-',
      meta: {
        variant: 'text',
        placeholder: 'Action',
        label: 'Action',
        icon: TextIcon,
      },
      enableColumnFilter: true,
      enableSorting: false,
    },
    {
      id: ColumnKey.method,
      accessorFn: (row) => row.method,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Method' />
      ),
      cell: ({ row }) => (
        <Badge variant='outline'>{row.original.method || '-'}</Badge>
      ),
      enableColumnFilter: false,
      enableSorting: false,
    },
    {
      id: ColumnKey.endpoint,
      accessorFn: (row) => row.endpoint,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Endpoint' />
      ),
      cell: ({ row }) => (
        <p className='max-w-[320px] truncate overflow-hidden'>
          {row.original.endpoint || '-'}
        </p>
      ),
      meta: {
        variant: 'text',
        placeholder: 'Endpoint',
        label: 'Endpoint',
        icon: TextIcon,
      },
      enableColumnFilter: true,
      enableSorting: false,
    },
    {
      id: ColumnKey.status,
      accessorFn: (row) => row.status,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Status' />
      ),
      cell: ({ row }) => {
        const isSuccess = row.original.status === 'success'

        return (
          <Badge variant={isSuccess ? 'default' : 'destructive'}>
            {isSuccess ? (
              <CircleCheckIcon className='size-3' />
            ) : (
              <CircleXIcon className='size-3' />
            )}
            {row.original.status}
          </Badge>
        )
      },
      meta: {
        variant: 'multiSelect',
        label: 'Status',
        options: [
          { value: 'success', label: 'Success' },
          { value: 'failed', label: 'Failed' },
        ],
      },
      enableColumnFilter: true,
      enableSorting: false,
    },
    {
      id: ColumnKey.createdAt,
      accessorFn: (row) => row.createdAt,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Created at' />
      ),
      cell: ({ row }) => (
        <p className='truncate overflow-hidden'>
          {format(row.original.createdAt, 'dd/MM/yyyy HH:mm aa')}
        </p>
      ),
      enableColumnFilter: false,
      enableSorting: true,
    },
  ]
}
