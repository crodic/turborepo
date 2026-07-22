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
      accessorFn: (row) => row.translations?.[0]?.title ?? 'Untitled',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Title' />
      ),
      cell: ({ row }) => {
        const title = row.original.translations?.[0]?.title ?? 'Untitled'
        const slug = row.original.translations?.[0]?.slug ?? ''

        return (
          <DataTableExpandingCell row={row}>
            <div>
              <p className='font-medium'>{title}</p>
              <p className='text-muted-foreground text-xs'>/{slug}</p>
            </div>
          </DataTableExpandingCell>
        )
      },
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
      id: 'locales',
      accessorFn: (row) => row.translations?.map((t) => t.locale).join(', '),
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Locales' />
      ),
      cell: ({ row }) => {
        const locales = row.original.translations?.map((t) => t.locale) || []
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
    },
    {
      id: ColumnKey.updatedAt,
      accessorFn: (row) => row.updatedAt,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Updated At' />
      ),
      cell: ({ row }) => (
        <p>{format(new Date(row.original.updatedAt), 'dd/MM/yyyy HH:mm aa')}</p>
      ),
    },
  ]
}
