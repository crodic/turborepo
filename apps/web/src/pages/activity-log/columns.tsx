import { format } from 'date-fns'
import type { ColumnDef } from '@tanstack/react-table'
import i18n from '@/i18n'
import { Text, TextIcon } from 'lucide-react'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { ColumnKey, type ActivityLogSchema } from './schema'

export function getActivitiesTableColumns({
  actions = [],
}: {
  actions: string[]
}): ColumnDef<ActivityLogSchema>[] {
  return [
    {
      id: ColumnKey.id,
      accessorFn: (row) => row.id,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='ID' />
      ),
      cell: ({ row }) => (
        <p className='truncate overflow-hidden'>{row.original.id}</p>
      ),
      enableColumnFilter: false,
    },
    {
      id: ColumnKey.entityId,
      accessorFn: (row) => row.entityId,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          label={i18n.t('activityLogs.table.resourceId')}
        />
      ),
      meta: {
        variant: 'text',
        placeholder: i18n.t('activityLogs.table.resourceId'),
        label: i18n.t('activityLogs.table.resourceId'),
        icon: Text,
      },
      cell: ({ row }) => (
        <p className='truncate overflow-hidden'>{row.original.entityId}</p>
      ),
      enableColumnFilter: true,
    },
    {
      id: ColumnKey.entity,
      accessorFn: (row) => row.entity,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          label={i18n.t('activityLogs.table.entity')}
        />
      ),
      cell: ({ row }) => (
        <p className='truncate overflow-hidden'>
          {row.original.metadata?.entityName
            ? `${row.original.entity} - ${row.original.metadata.entityName}`
            : row.original.entity}
        </p>
      ),
      meta: {
        variant: 'text',
        placeholder: i18n.t('activityLogs.table.entity'),
        label: i18n.t('activityLogs.table.entity'),
        icon: TextIcon,
      },
      enableHiding: false,
      enableSorting: false,
      enableColumnFilter: true,
    },
    {
      id: ColumnKey.action,
      accessorFn: (row) => row.action,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          label={i18n.t('activityLogs.table.action')}
        />
      ),
      meta: {
        variant: 'multiSelect',
        label: i18n.t('activityLogs.table.action'),
        options: actions.map((action) => ({ value: action, label: action })),
      },
      cell: ({ row }) => <p>{row.original.action}</p>,
      enableColumnFilter: true,
      enableHiding: false,
      enableSorting: false,
    },
    {
      id: ColumnKey.userId,
      accessorFn: (row) => row.userId,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          label={i18n.t('activityLogs.table.actor')}
        />
      ),
      cell: ({ row }) => {
        const metadata = row.original.metadata
        if (metadata?.actorName || metadata?.actorEmail) {
          return (
            <div className='flex flex-col'>
              <span className='truncate font-medium'>
                {metadata.actorName || ''}{' '}
                {metadata.actorEmail ? `(${metadata.actorEmail})` : ''}
              </span>
              <span className='text-muted-foreground text-xs'>
                ID: {row.original.userId || metadata?.actorId}
              </span>
            </div>
          )
        }
        return (
          <p className='truncate overflow-hidden'>
            <span>
              {`Type: ${metadata?.userType ?? 'Guest'}`}
              {metadata?.actorId != null
                ? ` | Actor ID: ${metadata.actorId}`
                : ''}
            </span>
          </p>
        )
      },
      meta: {
        variant: 'text',
        placeholder: i18n.t('activityLogs.table.actor'),
        label: i18n.t('activityLogs.table.actor'),
        icon: TextIcon,
      },
      enableHiding: false,
      enableSorting: false,
      enableColumnFilter: true,
    },
    {
      id: ColumnKey.timestamp,
      accessorFn: (row) => row.timestamp,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          label={i18n.t('activityLogs.table.timestamp')}
        />
      ),
      cell: ({ row }) => (
        <p className='truncate overflow-hidden'>
          {format(row.original.timestamp, 'dd/MM/yyyy HH:mm aa')}
        </p>
      ),
      enableColumnFilter: false,
      enableSorting: true,
    },
  ]
}
