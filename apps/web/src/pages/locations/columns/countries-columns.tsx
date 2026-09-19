import type { ColumnDef } from '@tanstack/react-table'
import i18n from '@/i18n'
import {
  Edit2Icon,
  GlobeIcon,
  MoreHorizontalIcon,
  TextIcon,
  Trash2Icon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { CountryFlag } from '../components/country-flag'
import {
  CountryColumnKey,
  type CountrySchema,
  type RegionSchema,
} from '../schema'

interface GetCountriesColumnsProps {
  regions?: RegionSchema[]
  onEdit: (country: CountrySchema) => void
  onDelete: (country: CountrySchema) => void
}

export function getCountriesTableColumns({
  regions = [],
  onEdit,
  onDelete,
}: GetCountriesColumnsProps): ColumnDef<CountrySchema>[] {
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
      id: CountryColumnKey.name,
      accessorFn: (row) => row.name,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          label={i18n.t('locations.fields.name', 'Country')}
        />
      ),
      cell: ({ row }) => (
        <div className='flex items-center gap-2.5 font-medium'>
          <CountryFlag
            iso2={row.original.iso2}
            className='size-4.5 rounded-xs'
          />
          <span>{row.original.name}</span>
          {row.original.native && row.original.native !== row.original.name && (
            <span className='text-muted-foreground text-xs'>
              ({row.original.native})
            </span>
          )}
        </div>
      ),
      meta: {
        variant: 'text',
        placeholder: i18n.t('locations.fields.name', 'Country'),
        label: i18n.t('locations.fields.name', 'Country'),
        icon: GlobeIcon,
      },
      enableColumnFilter: true,
      enableSorting: true,
    },
    {
      id: CountryColumnKey.iso2,
      accessorFn: (row) => row.iso2,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='ISO' />
      ),
      cell: ({ row }) => (
        <div className='flex items-center gap-1.5'>
          {row.original.iso2 && (
            <Badge variant='outline' className='font-mono font-semibold'>
              {row.original.iso2}
            </Badge>
          )}
          {row.original.iso3 && (
            <span className='text-muted-foreground font-mono text-xs'>
              {row.original.iso3}
            </span>
          )}
        </div>
      ),
      meta: {
        variant: 'text',
        placeholder: 'ISO code...',
        label: 'ISO',
        icon: TextIcon,
      },
      enableColumnFilter: true,
      enableSorting: true,
    },
    {
      id: CountryColumnKey.capital,
      accessorFn: (row) => row.capital,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          label={i18n.t('locations.fields.capital', 'Capital')}
        />
      ),
      cell: ({ row }) => row.original.capital || '—',
      enableSorting: true,
    },
    {
      id: CountryColumnKey.phonecode,
      accessorFn: (row) => row.phonecode,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          label={i18n.t('locations.fields.phonecode', 'Phone')}
        />
      ),
      cell: ({ row }) =>
        row.original.phonecode ? `+${row.original.phonecode}` : '—',
      enableSorting: true,
    },
    {
      id: CountryColumnKey.currency,
      accessorFn: (row) => row.currency,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          label={i18n.t('locations.fields.currency', 'Currency')}
        />
      ),
      cell: ({ row }) => (
        <div className='flex items-center gap-1'>
          <span>{row.original.currency || '—'}</span>
          {row.original.currencySymbol && (
            <Badge variant='secondary' className='px-1 py-0 font-mono text-xs'>
              {row.original.currencySymbol}
            </Badge>
          )}
        </div>
      ),
      enableSorting: true,
    },
    {
      id: CountryColumnKey.regionId,
      accessorFn: (row) => row.regionId,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          label={i18n.t('locations.fields.region', 'Region')}
        />
      ),
      cell: ({ row }) =>
        row.original.region?.name ? (
          <Badge variant='outline' className='bg-muted/40 font-normal'>
            {row.original.region.name}
          </Badge>
        ) : (
          '—'
        ),
      meta: {
        variant: 'select',
        label: i18n.t('locations.fields.region', 'Region'),
        options: regions.map((r) => ({ label: r.name, value: r.id })),
      },
      enableColumnFilter: true,
      enableSorting: false,
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
