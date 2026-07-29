import { format } from 'date-fns'
import type { ColumnDef } from '@tanstack/react-table'
import { PencilIcon, BanIcon } from 'lucide-react'
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
      meta: {
        variant: 'multiSelect',
        label: 'Status',
        options: [
          { label: 'Scheduled', value: 'scheduled' },
          { label: 'Sent', value: 'sent' },
          { label: 'Failed', value: 'failed' },
          { label: 'Cancelled', value: 'cancelled' },
        ],
      },
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
      meta: {
        variant: 'text',
        placeholder: 'Search subject...',
      },
    },
    {
      id: 'to',
      accessorFn: (row) => row.to.join(', '),
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Recipients' />
      ),
      cell: ({ row }) => (
        <p className='max-w-[320px] truncate text-sm'>
          {row.original.to.join(', ')}
        </p>
      ),
      enableSorting: false,
      enableColumnFilter: true,
      meta: {
        variant: 'text',
        placeholder: 'Search email...',
      },
    },
    {
      id: ColumnKey.scheduledAt,
      accessorFn: (row) => row.scheduledAt,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Scheduled' />
      ),
      cell: ({ row }) =>
        row.original.scheduledAt
          ? format(new Date(row.original.scheduledAt), 'dd/MM/yyyy HH:mm')
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
          ? format(new Date(row.original.sentAt), 'dd/MM/yyyy HH:mm')
          : '-',
    },
    {
      id: ColumnKey.createdAt,
      accessorFn: (row) => row.createdAt,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Created' />
      ),
      cell: ({ row }) =>
        format(new Date(row.original.createdAt), 'dd/MM/yyyy HH:mm'),
    },
    {
      id: 'actions',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Actions' />
      ),
      cell: ({ row }) => (
        <div className='flex justify-end gap-1'>
          {row.original.status === 'scheduled' && options.onEdit && (
            <>
              <Button
                variant='ghost'
                size='icon'
                className='text-muted-foreground hover:text-foreground h-8 w-8'
                onClick={(event) => {
                  event.stopPropagation()
                  options.onEdit?.(row.original)
                }}
                title='Edit Campaign'
              >
                <PencilIcon className='h-4 w-4' />
              </Button>
              <Button
                variant='ghost'
                size='icon'
                className='text-destructive/70 hover:text-destructive h-8 w-8'
                onClick={(event) => {
                  event.stopPropagation()
                  options.onCancel?.(row.original)
                }}
                title='Cancel Campaign'
              >
                <BanIcon className='h-4 w-4' />
              </Button>
            </>
          )}
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ]
}
