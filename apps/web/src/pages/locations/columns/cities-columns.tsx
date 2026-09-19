import type { ColumnDef } from '@tanstack/react-table'
import i18n from '@/i18n'
import {
  Building2Icon,
  Edit2Icon,
  GlobeIcon,
  MapPinIcon,
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
import { fetchCountryFilterOptions, fetchStateFilterOptions } from '../queries'
import { CityColumnKey, type CitySchema } from '../schema'

interface GetCitiesColumnsProps {
  onEdit: (city: CitySchema) => void
  onDelete: (city: CitySchema) => void
}

export function getCitiesTableColumns({
  onEdit,
  onDelete,
}: GetCitiesColumnsProps): ColumnDef<CitySchema>[] {
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
      id: CityColumnKey.name,
      accessorFn: (row) => row.name,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          label={i18n.t('locations.fields.name', 'City / District')}
        />
      ),
      cell: ({ row }) => (
        <span className='font-medium'>{row.original.name}</span>
      ),
      meta: {
        variant: 'text',
        placeholder: i18n.t('locations.fields.name', 'City / District'),
        label: i18n.t('locations.fields.name', 'City / District'),
        icon: MapPinIcon,
      },
      enableColumnFilter: true,
      enableSorting: true,
    },
    {
      id: CityColumnKey.stateCode,
      accessorFn: (row) => row.state?.name || row.stateCode,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          label={i18n.t('locations.fields.state', 'State / Province')}
        />
      ),
      cell: ({ row }) =>
        row.original.state?.name || row.original.stateCode || '—',
      meta: {
        variant: 'multiAsyncSelect',
        label: i18n.t('locations.fields.state', 'State / Province'),
        icon: Building2Icon,
        fetchOptions: fetchStateFilterOptions,
        searchKey: 'search',
      },
      enableColumnFilter: true,
      enableSorting: true,
    },
    {
      id: CityColumnKey.countryCode,
      accessorFn: (row) => row.country?.name || row.countryCode,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          label={i18n.t('locations.fields.country', 'Country')}
        />
      ),
      cell: ({ row }) => (
        <div className='flex items-center gap-2'>
          <CountryFlag
            iso2={row.original.country?.iso2 || row.original.countryCode}
            className='size-4 rounded-xs'
          />
          <span>
            {row.original.country?.name || row.original.countryCode || '—'}
          </span>
        </div>
      ),
      meta: {
        variant: 'multiAsyncSelect',
        label: i18n.t('locations.fields.country', 'Country'),
        icon: GlobeIcon,
        fetchOptions: fetchCountryFilterOptions,
        searchKey: 'search',
      },
      enableColumnFilter: true,
      enableSorting: true,
    },
    {
      id: CityColumnKey.code,
      accessorFn: (row) => row.stateCode,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          label={i18n.t('locations.fields.code', 'Code')}
        />
      ),
      cell: ({ row }) =>
        row.original.stateCode ? (
          <Badge variant='outline' className='font-mono text-xs font-semibold'>
            {row.original.stateCode}
          </Badge>
        ) : (
          '—'
        ),
      meta: {
        variant: 'text',
        placeholder: 'Code...',
        label: i18n.t('locations.fields.code', 'Code'),
        icon: TextIcon,
      },
      enableColumnFilter: false,
      enableSorting: true,
    },
    {
      id: 'coordinates',
      accessorFn: (row) =>
        row.latitude && row.longitude
          ? `${row.latitude.toFixed(4)}, ${row.longitude.toFixed(4)}`
          : '—',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          label={i18n.t('locations.fields.coordinates', 'Coordinates')}
        />
      ),
      cell: ({ row }) =>
        row.original.latitude && row.original.longitude ? (
          <span className='text-muted-foreground font-mono text-xs'>
            {row.original.latitude.toFixed(4)},{' '}
            {row.original.longitude.toFixed(4)}
          </span>
        ) : (
          '—'
        ),
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
