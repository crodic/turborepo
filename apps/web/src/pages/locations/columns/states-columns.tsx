import type { ColumnDef } from '@tanstack/react-table'
import i18n from '@/i18n'
import {
  Building2Icon,
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
import { fetchCountryFilterOptions } from '../queries'
import { StateColumnKey, type StateSchema } from '../schema'

interface GetStatesColumnsProps {
  onEdit: (state: StateSchema) => void
  onDelete: (state: StateSchema) => void
}

export function getStatesTableColumns({
  onEdit,
  onDelete,
}: GetStatesColumnsProps): ColumnDef<StateSchema>[] {
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
      id: StateColumnKey.name,
      accessorFn: (row) => row.name,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          label={i18n.t('locations.fields.name', 'State / Province')}
        />
      ),
      cell: ({ row }) => (
        <span className='font-medium'>{row.original.name}</span>
      ),
      meta: {
        variant: 'text',
        placeholder: i18n.t('locations.fields.name', 'State / Province'),
        label: i18n.t('locations.fields.name', 'State / Province'),
        icon: Building2Icon,
      },
      enableColumnFilter: true,
      enableSorting: true,
    },
    {
      id: StateColumnKey.countryCode,
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
      id: StateColumnKey.iso2,
      accessorFn: (row) => row.iso2,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          label={i18n.t('locations.fields.code', 'Code / ISO2')}
        />
      ),
      cell: ({ row }) =>
        row.original.iso2 ? (
          <Badge variant='outline' className='font-mono font-semibold'>
            {row.original.iso2}
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
      enableColumnFilter: true,
      enableSorting: true,
    },
    {
      id: StateColumnKey.type,
      accessorFn: (row) => row.type,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          label={i18n.t('locations.fields.type', 'Type')}
        />
      ),
      cell: ({ row }) =>
        row.original.type ? (
          <Badge variant='secondary' className='text-xs font-normal capitalize'>
            {row.original.type}
          </Badge>
        ) : (
          '—'
        ),
      enableSorting: true,
    },
    {
      id: StateColumnKey.timezone,
      accessorFn: (row) => row.timezone,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          label={i18n.t('locations.fields.timezone', 'Timezone')}
        />
      ),
      cell: ({ row }) => (
        <span className='text-muted-foreground font-mono text-xs'>
          {row.original.timezone || '—'}
        </span>
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
