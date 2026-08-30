import { format } from 'date-fns'
import type { ColumnDef } from '@tanstack/react-table'
import i18n from '@/i18n'
import { FileText, Text, TextIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { ColumnKey, type ActivityLogSchema } from './schema'

export function getActionBadge(action: string) {
  switch (action) {
    case 'INSERT':
    case 'CREATE':
      return (
        <Badge className='border-emerald-500/30 bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-300'>
          {i18n.t(`activityLogs.table.action_${action.toLowerCase()}`, {
            defaultValue: action,
          })}
        </Badge>
      )
    case 'UPDATE':
      return (
        <Badge className='border-blue-500/30 bg-blue-500/15 text-blue-700 hover:bg-blue-500/20 dark:bg-blue-500/20 dark:text-blue-300'>
          {i18n.t(`activityLogs.table.action_${action.toLowerCase()}`, {
            defaultValue: action,
          })}
        </Badge>
      )
    case 'DELETE':
    case 'SOFT_DELETE':
      return (
        <Badge variant='destructive'>
          {i18n.t(`activityLogs.table.action_${action.toLowerCase()}`, {
            defaultValue: action,
          })}
        </Badge>
      )
    case 'RESTORE':
      return (
        <Badge className='border-purple-500/30 bg-purple-500/15 text-purple-700 hover:bg-purple-500/20 dark:bg-purple-500/20 dark:text-purple-300'>
          {i18n.t(`activityLogs.table.action_${action.toLowerCase()}`, {
            defaultValue: action,
          })}
        </Badge>
      )
    default:
      return <Badge variant='secondary'>{action}</Badge>
  }
}

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
        <span className='text-muted-foreground font-mono text-xs'>
          #{row.original.id}
        </span>
      ),
      enableColumnFilter: false,
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
        options: actions.map((action) => ({
          value: action,
          label: i18n.t(`activityLogs.table.action_${action.toLowerCase()}`, {
            defaultValue: action,
          }),
        })),
      },
      cell: ({ row }) => getActionBadge(row.original.action),
      enableColumnFilter: true,
      enableHiding: false,
      enableSorting: false,
    },
    {
      id: ColumnKey.description,
      accessorFn: (row) => row.description,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          label={i18n.t('activityLogs.table.description')}
        />
      ),
      cell: ({ row }) => (
        <p
          className='max-w-105 truncate font-medium'
          title={row.original.description ?? undefined}
        >
          {row.original.description || '-'}
        </p>
      ),
      meta: {
        variant: 'text',
        placeholder: i18n.t('activityLogs.table.description'),
        label: i18n.t('activityLogs.table.description'),
        icon: FileText,
      },
      enableColumnFilter: true,
      enableHiding: false,
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
      cell: ({ row }) => {
        const entityLabel =
          row.original.metadata?.entityLabel ??
          row.original.entity?.replace(/Entity$/, '') ??
          'Resource'
        return (
          <div className='flex items-center gap-1.5'>
            <Badge variant='outline' className='font-mono text-xs'>
              {entityLabel}
            </Badge>
            {row.original.entityId && (
              <span className='text-muted-foreground text-xs'>
                #{row.original.entityId}
              </span>
            )}
          </div>
        )
      },
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
        <p className='text-muted-foreground truncate overflow-hidden font-mono text-xs'>
          {row.original.entityId || '-'}
        </p>
      ),
      enableColumnFilter: true,
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
              <span className='truncate text-xs font-medium'>
                {metadata.actorName || metadata.actorEmail}
              </span>
              {metadata.actorName && metadata.actorEmail && (
                <span className='text-muted-foreground truncate text-[11px]'>
                  {metadata.actorEmail}
                </span>
              )}
            </div>
          )
        }
        return (
          <span className='text-muted-foreground text-xs'>
            {metadata?.userType ?? 'Guest'}
            {metadata?.actorId != null ? ` (#${metadata.actorId})` : ''}
          </span>
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
        <p className='text-muted-foreground truncate overflow-hidden text-xs'>
          {format(new Date(row.original.timestamp), 'dd/MM/yyyy HH:mm:ss')}
        </p>
      ),
      enableColumnFilter: false,
      enableSorting: true,
    },
  ]
}
