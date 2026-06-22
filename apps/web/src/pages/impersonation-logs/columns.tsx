import { format } from 'date-fns'
import type { ColumnDef } from '@tanstack/react-table'
import {
  CircleCheckIcon,
  CircleIcon,
  CircleXIcon,
  TextIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import {
  HistoryColumnKey,
  ItemColumnKey,
  type ImpersonationLogHistorySchema,
  type ImpersonationLogItemSchema,
} from './schema'

function formatLogUser(
  user: ImpersonationLogHistorySchema['admin'],
  fallbackId?: string | null
) {
  if (!user) return fallbackId ? `#${fallbackId}` : '-'

  const name =
    user.fullName ||
    [user.firstName, user.lastName].filter(Boolean).join(' ') ||
    undefined
  const id = user.id || fallbackId
  const primary = name || user.email || (id ? `#${id}` : undefined)
  const secondary = name && user.email ? user.email : undefined

  return [primary, secondary, id ? `#${id}` : undefined]
    .filter(Boolean)
    .join(' | ')
}

function formatDate(value?: string | null) {
  return value ? format(value, 'dd/MM/yyyy HH:mm aa') : '-'
}

export function getImpersonationHistoriesTableColumns(): ColumnDef<ImpersonationLogHistorySchema>[] {
  return [
    {
      id: HistoryColumnKey.adminId,
      accessorFn: (row) => row.adminId,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Admin' />
      ),
      cell: ({ row }) => (
        <p className='max-w-[260px] truncate overflow-hidden'>
          {formatLogUser(row.original.admin, row.original.adminId)}
        </p>
      ),
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
      id: HistoryColumnKey.targetUserId,
      accessorFn: (row) => row.targetUserId,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Target user' />
      ),
      cell: ({ row }) => (
        <p className='max-w-[260px] truncate overflow-hidden'>
          {formatLogUser(row.original.targetUser, row.original.targetUserId)}
        </p>
      ),
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
      id: HistoryColumnKey.reason,
      accessorFn: (row) => row.reason,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Reason' />
      ),
      cell: ({ row }) => (
        <p className='max-w-[340px] truncate overflow-hidden'>
          {row.original.reason || '-'}
        </p>
      ),
      meta: {
        variant: 'text',
        placeholder: 'Reason',
        label: 'Reason',
        icon: TextIcon,
      },
      enableColumnFilter: true,
      enableSorting: false,
    },
    {
      id: HistoryColumnKey.status,
      accessorFn: (row) => row.status,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Status' />
      ),
      cell: ({ row }) => {
        const isActive = row.original.status === 'active'

        return (
          <Badge variant={isActive ? 'default' : 'outline'}>
            {isActive ? (
              <CircleIcon className='size-3 fill-current' />
            ) : (
              <CircleCheckIcon className='size-3' />
            )}
            {row.original.status}
          </Badge>
        )
      },
      meta: {
        variant: 'multiSelect',
        label: 'Status',
        options: [
          { value: 'active', label: 'Active' },
          { value: 'stopped', label: 'Stopped' },
        ],
      },
      enableColumnFilter: true,
      enableSorting: false,
    },
    {
      id: HistoryColumnKey.itemsCount,
      accessorFn: (row) => row.itemsCount,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Actions' />
      ),
      cell: ({ row }) => row.original.itemsCount ?? 0,
      enableColumnFilter: false,
      enableSorting: false,
    },
    {
      id: HistoryColumnKey.startedAt,
      accessorFn: (row) => row.startedAt,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Started at' />
      ),
      cell: ({ row }) => (
        <p className='truncate overflow-hidden'>
          {formatDate(row.original.startedAt)}
        </p>
      ),
      enableColumnFilter: false,
      enableSorting: true,
    },
    {
      id: HistoryColumnKey.stoppedAt,
      accessorFn: (row) => row.stoppedAt,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Stopped at' />
      ),
      cell: ({ row }) => (
        <p className='truncate overflow-hidden'>
          {formatDate(row.original.stoppedAt)}
        </p>
      ),
      enableColumnFilter: false,
      enableSorting: true,
    },
  ]
}

export function getImpersonationItemsTableColumns(): ColumnDef<ImpersonationLogItemSchema>[] {
  return [
    {
      id: ItemColumnKey.action,
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
      id: ItemColumnKey.method,
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
      id: ItemColumnKey.endpoint,
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
      id: ItemColumnKey.entityType,
      accessorFn: (row) => row.entityType,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Entity' />
      ),
      cell: ({ row }) => row.original.entityType || '-',
      enableColumnFilter: false,
      enableSorting: false,
    },
    {
      id: ItemColumnKey.entityId,
      accessorFn: (row) => row.entityId,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Entity ID' />
      ),
      cell: ({ row }) => row.original.entityId || '-',
      enableColumnFilter: false,
      enableSorting: false,
    },
    {
      id: ItemColumnKey.status,
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
      id: ItemColumnKey.createdAt,
      accessorFn: (row) => row.createdAt,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Created at' />
      ),
      cell: ({ row }) => (
        <p className='truncate overflow-hidden'>
          {formatDate(row.original.createdAt)}
        </p>
      ),
      enableColumnFilter: false,
      enableSorting: true,
    },
  ]
}
