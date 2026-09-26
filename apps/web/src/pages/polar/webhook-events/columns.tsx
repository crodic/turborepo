import { useState } from 'react'
import { format } from 'date-fns'
import type { ColumnDef } from '@tanstack/react-table'
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Copy,
  Check,
  Eye,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'

function CopyCell({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Copied Event ID!')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className='flex items-center gap-1.5'>
      <span className='text-muted-foreground max-w-[180px] truncate font-mono text-xs'>
        {text}
      </span>
      <Button
        variant='ghost'
        size='icon'
        className='h-6 w-6 shrink-0'
        onClick={handleCopy}
      >
        {copied ? (
          <Check className='h-3 w-3 text-emerald-500' />
        ) : (
          <Copy className='h-3 w-3' />
        )}
      </Button>
    </div>
  )
}

function StatusCell({ status }: { status: string }) {
  switch (status?.toLowerCase()) {
    case 'processed':
      return (
        <Badge className='border-emerald-500/20 bg-emerald-500/10 font-medium text-emerald-600 dark:text-emerald-400'>
          <CheckCircle2 className='mr-1 h-3 w-3' />
          Processed
        </Badge>
      )
    case 'failed':
      return (
        <Badge className='border-rose-500/20 bg-rose-500/10 font-medium text-rose-600 dark:text-rose-400'>
          <AlertCircle className='mr-1 h-3 w-3' />
          Failed
        </Badge>
      )
    default:
      return (
        <Badge className='border-amber-500/20 bg-amber-500/10 font-medium text-amber-600 dark:text-amber-400'>
          <Clock className='mr-1 h-3 w-3' />
          Pending
        </Badge>
      )
  }
}

export function getWebhookEventsColumns({
  onViewDetail,
}: {
  onViewDetail: (event: any) => void
}): ColumnDef<any>[] {
  return [
    {
      id: 'id',
      accessorKey: 'id',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='#ID' />
      ),
      cell: ({ row }) => (
        <span className='text-muted-foreground font-mono text-xs font-semibold'>
          #{row.original.id}
        </span>
      ),
    },
    {
      id: 'eventType',
      accessorKey: 'eventType',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Event Type' />
      ),
      cell: ({ row }) => (
        <Badge variant='outline' className='font-mono text-xs font-normal'>
          {row.original.eventType}
        </Badge>
      ),
    },
    {
      id: 'eventId',
      accessorKey: 'eventId',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Polar Event ID' />
      ),
      cell: ({ row }) => <CopyCell text={row.original.eventId} />,
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Status' />
      ),
      cell: ({ row }) => <StatusCell status={row.original.status} />,
    },
    {
      id: 'createdAt',
      accessorKey: 'createdAt',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Received At' />
      ),
      cell: ({ row }) => (
        <span className='text-muted-foreground text-xs'>
          {row.original.createdAt
            ? format(new Date(row.original.createdAt), 'MMM dd, yyyy HH:mm:ss')
            : 'N/A'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: () => <div className='text-right'>Actions</div>,
      cell: ({ row }) => (
        <div className='flex items-center justify-end'>
          <Button
            variant='ghost'
            size='icon'
            className='h-8 w-8 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950'
            onClick={(e) => {
              e.stopPropagation()
              onViewDetail(row.original)
            }}
          >
            <Eye className='h-4 w-4' />
          </Button>
        </div>
      ),
    },
  ]
}
