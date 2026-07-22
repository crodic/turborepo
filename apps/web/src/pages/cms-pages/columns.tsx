import { format } from 'date-fns'
import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { DataTableExpandingCell } from '@/components/data-table/data-table'
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
        <DataTableExpandingCell row={row}>
          <div>
            <p className='font-medium'>{row.original.title}</p>
            <p className='text-muted-foreground text-xs'>
              /{row.original.slug}
            </p>
          </div>
        </DataTableExpandingCell>
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
      id: ColumnKey.locale,
      accessorFn: (row) => row.locale,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Locale' />
      ),
      cell: ({ row }) => {
        const hasSubRows = row.subRows && row.subRows.length > 0
        const locales = hasSubRows
          ? row.subRows.map((subRow) => subRow.original.locale)
          : [row.original.locale]

        // Ensure unique locales just in case
        const uniqueLocales = Array.from(new Set(locales))

        return (
          <div className='flex gap-1'>
            {uniqueLocales.map((loc) => (
              <Badge key={loc} variant='outline'>
                {loc}
              </Badge>
            ))}
          </div>
        )
      },
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
