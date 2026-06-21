import { format } from 'date-fns'
import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { ColumnKey, type EmailLogSchema } from './schema'

type EmailColumnsOptions = {
  onEdit?: (email: EmailLogSchema) => void
  onCancel?: (email: EmailLogSchema) => void
}

const statusVariant: Record<string, 'default' | 'destructive' | 'secondary'> = {
  scheduled: 'secondary',
  sent: 'default',
  failed: 'destructive',
  cancelled: 'secondary',
}

export function getEmailTableColumns(
  options: EmailColumnsOptions = {}
): ColumnDef<EmailLogSchema>[] {
  return [
    {
      id: ColumnKey.status,
      accessorFn: (row) => row.status,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Status' />
      ),
      cell: ({ row }) => (
        <Badge variant={statusVariant[row.original.status] ?? 'secondary'}>
          {row.original.status}
        </Badge>
      ),
      enableColumnFilter: true,
    },
    {
      id: ColumnKey.subject,
      accessorFn: (row) => row.subject,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Subject' />
      ),
      cell: ({ row }) => (
        <p className='max-w-[360px] truncate font-medium'>
          {row.original.subject}
        </p>
      ),
      enableColumnFilter: true,
    },
    {
      id: 'recipients',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Recipients' />
      ),
      cell: ({ row }) => (
        <p className='max-w-[320px] truncate text-sm'>
          {row.original.to.join(', ')}
        </p>
      ),
      enableSorting: false,
    },
    {
      id: ColumnKey.scheduledAt,
      accessorFn: (row) => row.scheduledAt,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Scheduled' />
      ),
      cell: ({ row }) =>
        row.original.scheduledAt
          ? format(row.original.scheduledAt, 'dd/MM/yyyy HH:mm')
          : '-',
    },
    {
      id: ColumnKey.sentAt,
      accessorFn: (row) => row.sentAt,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Sent' />
      ),
      cell: ({ row }) =>
        row.original.sentAt
          ? format(row.original.sentAt, 'dd/MM/yyyy HH:mm')
          : '-',
    },
    {
      id: ColumnKey.createdAt,
      accessorFn: (row) => row.createdAt,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Created' />
      ),
      cell: ({ row }) => format(row.original.createdAt, 'dd/MM/yyyy HH:mm'),
    },
    {
      id: 'actions',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Actions' />
      ),
      cell: ({ row }) =>
        row.original.status === 'scheduled' && options.onEdit ? (
          <div className='flex justify-end gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={(event) => {
                event.stopPropagation()
                options.onEdit?.(row.original)
              }}
            >
              Edit
            </Button>
            <Button
              variant='destructive'
              size='sm'
              onClick={(event) => {
                event.stopPropagation()
                options.onCancel?.(row.original)
              }}
            >
              Cancel
            </Button>
          </div>
        ) : null,
      enableSorting: false,
      enableHiding: false,
    },
  ]
}
