import { format } from 'date-fns'
import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { ColumnKey, type CmsPageSchema } from './schema'

export function getCmsPagesTableColumns(): ColumnDef<CmsPageSchema>[] {
  return [
    {
      id: ColumnKey.title,
      accessorFn: (row) => row.title,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Title' />
      ),
      cell: ({ row }) => (
        <div>
          <p className='font-medium'>{row.original.title}</p>
          <p className='text-muted-foreground text-xs'>/{row.original.slug}</p>
        </div>
      ),
      enableColumnFilter: true,
    },
    {
      id: ColumnKey.status,
      accessorFn: (row) => row.status,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Status' />
      ),
      cell: ({ row }) => (
        <Badge
          variant={row.original.status === 'published' ? 'default' : 'outline'}
        >
          {row.original.status}
        </Badge>
      ),
      enableColumnFilter: true,
    },
    {
      id: ColumnKey.updatedAt,
      accessorFn: (row) => row.updatedAt,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Updated At' />
      ),
      cell: ({ row }) => (
        <p>{format(row.original.updatedAt, 'dd/MM/yyyy HH:mm aa')}</p>
      ),
    },
  ]
}
