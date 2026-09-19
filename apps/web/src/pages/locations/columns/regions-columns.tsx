import type { ColumnDef } from '@tanstack/react-table'
import i18n from '@/i18n'
import {
  Edit2Icon,
  GlobeIcon,
  MoreHorizontalIcon,
  Trash2Icon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { RegionColumnKey, type RegionSchema } from '../schema'

interface GetRegionsColumnsProps {
  onEdit: (region: RegionSchema) => void
  onDelete: (region: RegionSchema) => void
}

export function getRegionsTableColumns({
  onEdit,
  onDelete,
}: GetRegionsColumnsProps): ColumnDef<RegionSchema>[] {
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label='Select all'
          className='translate-y-0.5'
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label='Select row'
          className='translate-y-0.5'
        />
      ),
      size: 40,
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: RegionColumnKey.name,
      accessorFn: (row) => row.name,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          label={i18n.t('locations.fields.name', 'Region Name')}
        />
      ),
      cell: ({ row }) => (
        <div className='flex items-center gap-2 font-medium'>
          <GlobeIcon className='text-primary size-4 shrink-0' />
          <span>{row.original.name}</span>
        </div>
      ),
      meta: {
        variant: 'text',
        placeholder: i18n.t('locations.fields.name', 'Region Name'),
        label: i18n.t('locations.fields.name', 'Region Name'),
        icon: GlobeIcon,
      },
      enableColumnFilter: true,
      enableSorting: true,
    },
    {
      id: RegionColumnKey.createdAt,
      accessorFn: (row) => row.createdAt,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          label={i18n.t('locations.fields.createdAt', 'Created At')}
        />
      ),
      cell: ({ row }) => (
        <span className='text-muted-foreground text-xs'>
          {row.original.createdAt
            ? new Date(row.original.createdAt).toLocaleDateString()
            : '—'}
        </span>
      ),
      enableSorting: true,
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='ghost' size='icon' className='size-8'>
              <MoreHorizontalIcon className='size-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuItem onClick={() => onEdit(row.original)}>
              <Edit2Icon className='mr-2 size-4' />
              {i18n.t('buttons.edit', 'Edit')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(row.original)}
              className='text-destructive focus:text-destructive'
            >
              <Trash2Icon className='mr-2 size-4' />
              {i18n.t('buttons.delete', 'Delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      size: 50,
      enableSorting: false,
      enableHiding: false,
    },
  ]
}
