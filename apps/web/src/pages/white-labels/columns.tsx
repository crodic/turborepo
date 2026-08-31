import type { ColumnDef } from '@tanstack/react-table'
import { SparklesIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import ComponentTableRowActions from './component-table-row-action'
import { ColumnKey, type WhiteLabelSchema } from './schema'

export const columns: ColumnDef<WhiteLabelSchema>[] = [
  {
    accessorKey: ColumnKey.name,
    header: 'Profile Name',
    cell: ({ row }) => {
      const item = row.original

      return (
        <div className='flex items-center gap-3'>
          {item.siteLogo ? (
            <img
              src={item.siteLogo}
              alt={item.name}
              className='bg-background size-8 shrink-0 rounded border object-contain p-0.5'
            />
          ) : (
            <div className='bg-muted flex size-8 shrink-0 items-center justify-center rounded border text-xs font-bold'>
              {item.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className='flex flex-col'>
            <span className='text-sm font-medium'>{item.name}</span>
            <span className='text-muted-foreground line-clamp-1 text-xs'>
              {item.description || item.slug}
            </span>
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: ColumnKey.brandName,
    header: 'Brand Identity',
    cell: ({ row }) => {
      const item = row.original

      return (
        <div className='flex flex-col'>
          <span className='text-xs font-medium'>{item.brandName || '—'}</span>
          <span className='text-muted-foreground line-clamp-1 text-[11px]'>
            {item.siteTitle || item.siteTagline || ''}
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: ColumnKey.target,
    header: 'Target',
    cell: ({ row }) => {
      const target = row.original.target

      return (
        <Badge
          variant={target === 'admin' ? 'default' : 'secondary'}
          className='text-xs capitalize'
        >
          {target}
        </Badge>
      )
    },
  },
  {
    accessorKey: ColumnKey.colors,
    header: 'Color Palette',
    cell: ({ row }) => {
      const styles = row.original.styles?.light

      if (!styles) {
        return <span className='text-muted-foreground text-xs'>—</span>
      }

      const previewKeys = [
        'primary',
        'background',
        'secondary',
        'accent',
        'sidebar',
      ] as const

      return (
        <div className='flex items-center gap-1.5'>
          {previewKeys.map((key) => (
            <div
              key={key}
              className='size-4 rounded-full border border-black/10 shadow-2xs dark:border-white/10'
              style={{ backgroundColor: styles[key] }}
              title={`--${key}: ${styles[key]}`}
            />
          ))}
        </div>
      )
    },
  },
  {
    accessorKey: ColumnKey.isActive,
    header: 'Status',
    cell: ({ row }) => {
      const isActive = row.original.isActive

      return isActive ? (
        <Badge className='gap-1 bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600'>
          <SparklesIcon className='size-3' />
          Active
        </Badge>
      ) : (
        <Badge variant='outline' className='text-muted-foreground'>
          Preset
        </Badge>
      )
    },
  },
  {
    accessorKey: ColumnKey.updatedAt,
    header: 'Updated At',
    cell: ({ row }) => {
      const dateStr = row.original.updatedAt
      if (!dateStr) return null

      return (
        <span className='text-muted-foreground text-xs'>
          {new Date(dateStr).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </span>
      )
    },
  },
  {
    id: ColumnKey.actions,
    cell: ({ row }) => <ComponentTableRowActions row={row} />,
  },
]
