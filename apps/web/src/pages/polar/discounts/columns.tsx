import { useState } from 'react'
import { format } from 'date-fns'
import type { ColumnDef } from '@tanstack/react-table'
import { Copy, Check, Eye, Tag, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'

function CopyCodeCell({ code }: { code?: string }) {
  const [copied, setCopied] = useState(false)

  if (!code) {
    return (
      <span className='text-muted-foreground text-xs italic'>
        Automatic (no code)
      </span>
    )
  }

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(code)
    setCopied(true)
    toast.success('Copied coupon code!')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className='flex items-center gap-1.5'>
      <span className='bg-muted text-primary rounded px-2 py-0.5 font-mono text-xs font-bold'>
        {code}
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

export function getDiscountsColumns({
  onViewDetail,
  onEdit,
  onDelete,
}: {
  onViewDetail: (discount: any) => void
  onEdit?: (discount: any) => void
  onDelete?: (discount: any) => void
}): ColumnDef<any>[] {
  return [
    {
      id: 'name',
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Discount Name' />
      ),
      cell: ({ row }) => (
        <div className='flex items-center gap-2'>
          <Tag className='text-primary h-4 w-4 shrink-0' />
          <span className='text-foreground text-sm font-semibold'>
            {row.original.name || 'Unnamed Discount'}
          </span>
        </div>
      ),
    },
    {
      id: 'code',
      accessorKey: 'code',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Coupon Code' />
      ),
      cell: ({ row }) => <CopyCodeCell code={row.original.code} />,
    },
    {
      id: 'value',
      header: () => <span>Value / Off</span>,
      cell: ({ row }) => {
        const d = row.original
        const isPercentage = d.type === 'percentage'
        const display = isPercentage
          ? `${d.basisPoints ? d.basisPoints / 100 : (d.amount ?? 0)}% OFF`
          : `$${((d.amount ?? 0) / 100).toFixed(2)} OFF`

        return (
          <Badge className='border-emerald-500/20 bg-emerald-500/10 font-semibold text-emerald-700 dark:text-emerald-400'>
            {display}
          </Badge>
        )
      },
    },
    {
      id: 'duration',
      accessorKey: 'duration',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Duration' />
      ),
      cell: ({ row }) => (
        <span className='text-muted-foreground text-xs capitalize'>
          {row.original.duration || 'once'}
          {row.original.durationInMonths
            ? ` (${row.original.durationInMonths}m)`
            : ''}
        </span>
      ),
    },
    {
      id: 'redemptions',
      header: () => <span>Redemptions</span>,
      cell: ({ row }) => {
        const d = row.original
        return (
          <span className='text-foreground text-xs font-medium'>
            {d.redemptionsCount ?? 0}
            {d.maxRedemptions ? ` / ${d.maxRedemptions}` : ' (unlimited)'}
          </span>
        )
      },
    },
    {
      id: 'startsAt',
      accessorKey: 'startsAt',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Starts At' />
      ),
      cell: ({ row }) => (
        <span className='text-muted-foreground text-xs'>
          {row.original.startsAt
            ? format(new Date(row.original.startsAt), 'MMM dd, yyyy')
            : 'Immediate'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: () => <div className='text-right'>Actions</div>,
      cell: ({ row }) => (
        <div className='flex items-center justify-end gap-1'>
          <Button
            variant='ghost'
            size='icon'
            title='View Details'
            className='h-8 w-8 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950'
            onClick={(e) => {
              e.stopPropagation()
              onViewDetail(row.original)
            }}
          >
            <Eye className='h-4 w-4' />
          </Button>
          {onEdit && (
            <Button
              variant='ghost'
              size='icon'
              title='Edit Discount'
              className='h-8 w-8 text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-950'
              onClick={(e) => {
                e.stopPropagation()
                onEdit(row.original)
              }}
            >
              <Pencil className='h-4 w-4' />
            </Button>
          )}
          {onDelete && (
            <Button
              variant='ghost'
              size='icon'
              title='Delete Discount'
              className='h-8 w-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950'
              onClick={(e) => {
                e.stopPropagation()
                onDelete(row.original)
              }}
            >
              <Trash2 className='h-4 w-4' />
            </Button>
          )}
        </div>
      ),
    },
  ]
}
