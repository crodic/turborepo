import { useEffect, useState } from 'react'
import type { Table } from '@tanstack/react-table'
import {
  ArrowDownUp,
  Check,
  FileText,
  Files,
  Film,
  ImageIcon,
  Music,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useDebouncedCallback } from '@/hooks/use-debounced-callback'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { FileSchema } from '../schema'

export interface FileGridToolbarProps {
  table: Table<FileSchema>
  activeCategory?: string | null
  onSelectCategory?: (category: string | null) => void
  className?: string
}

const CATEGORY_CHIPS = [
  {
    id: 'all',
    labelKey: 'files.categories.all',
    fallback: 'All Files',
    icon: Files,
  },
  {
    id: 'image',
    labelKey: 'files.categories.images',
    fallback: 'Images',
    icon: ImageIcon,
  },
  {
    id: 'video',
    labelKey: 'files.categories.videos',
    fallback: 'Videos',
    icon: Film,
  },
  {
    id: 'audio',
    labelKey: 'files.categories.audio',
    fallback: 'Audio',
    icon: Music,
  },
  {
    id: 'raw',
    labelKey: 'files.categories.documents',
    fallback: 'Documents',
    icon: FileText,
  },
]

export function FileGridToolbar({
  table,
  activeCategory,
  onSelectCategory,
  className,
}: FileGridToolbarProps) {
  const { t } = useTranslation()

  // Name Search Column
  const nameColumn = table.getColumn('original_name')
  const nameValue = (nameColumn?.getFilterValue() as string) ?? ''
  const [localSearch, setLocalSearch] = useState(nameValue)

  useEffect(() => {
    setLocalSearch(nameValue)
  }, [nameValue])

  const debouncedSetName = useDebouncedCallback((value: string) => {
    nameColumn?.setFilterValue(value ? value.trim() : undefined)
  }, 300)

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setLocalSearch(val)
    debouncedSetName(val)
  }

  const handleClearSearch = () => {
    setLocalSearch('')
    nameColumn?.setFilterValue(undefined)
  }

  // Resource Type / Category Selection
  // activeCategory is the source of truth, driven by URL state via parent
  const currentCategory = activeCategory ?? 'all'

  const handleSelectType = (type: string) => {
    onSelectCategory?.(type === 'all' || currentCategory === type ? null : type)
  }

  // Status Filter
  const statusColumn = table.getColumn('status')
  const rawStatus = statusColumn?.getFilterValue()
  const currentStatus = Array.isArray(rawStatus)
    ? ((rawStatus[0] as string) ?? 'all')
    : typeof rawStatus === 'string' && rawStatus
      ? rawStatus
      : 'all'

  const handleSelectStatus = (status: string) => {
    if (status === 'all') {
      statusColumn?.setFilterValue(undefined)
    } else {
      statusColumn?.setFilterValue([status])
    }
  }

  // Sorting
  const sorting = table.getState().sorting
  const currentSort = sorting[0]

  const sortOptions = [
    {
      id: 'createdAt-desc',
      label: t('files.sort.newest', 'Newest added'),
      columnId: 'createdAt',
      desc: true,
    },
    {
      id: 'createdAt-asc',
      label: t('files.sort.oldest', 'Oldest added'),
      columnId: 'createdAt',
      desc: false,
    },
    {
      id: 'name-asc',
      label: t('files.sort.nameAsc', 'Name (A → Z)'),
      columnId: 'original_name',
      desc: false,
    },
    {
      id: 'name-desc',
      label: t('files.sort.nameDesc', 'Name (Z → A)'),
      columnId: 'original_name',
      desc: true,
    },
    {
      id: 'size-desc',
      label: t('files.sort.sizeDesc', 'Size (Largest)'),
      columnId: 'size',
      desc: true,
    },
    {
      id: 'size-asc',
      label: t('files.sort.sizeAsc', 'Size (Smallest)'),
      columnId: 'size',
      desc: false,
    },
  ]

  const activeSortOption = sortOptions.find(
    (opt) => opt.columnId === currentSort?.id && opt.desc === currentSort?.desc
  )

  const handleApplySort = (columnId: string, desc: boolean) => {
    table.setSorting([{ id: columnId, desc }])
  }

  // Advanced Filters Check
  const hasStatusFilter = currentStatus !== 'all'
  const advancedFilterCount = hasStatusFilter ? 1 : 0
  const isFiltered = table.getState().columnFilters.length > 0

  const handleClearAllFilters = () => {
    table.resetColumnFilters()
    setLocalSearch('')
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Top Controls Row */}
      <div className='flex flex-wrap items-center justify-between gap-2.5'>
        {/* Unified Search Input */}
        <div className='relative max-w-md min-w-55 flex-1'>
          <Search className='text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2' />
          <Input
            type='text'
            value={localSearch}
            onChange={handleSearchChange}
            placeholder={t(
              'files.table.searchByName',
              'Search files by name...'
            )}
            className='bg-muted/30 focus-visible:bg-background border-border/80 h-9 rounded-xl pr-8 pl-9 text-xs transition-colors'
          />
          {localSearch && (
            <button
              type='button'
              onClick={handleClearSearch}
              className='text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 size-4 -translate-y-1/2 transition-colors'
              title='Clear search'
            >
              <X className='size-3.5' />
            </button>
          )}
        </div>

        {/* Right Action Controls */}
        <div className='flex items-center gap-2'>
          {/* Sort Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant='outline'
                size='sm'
                className='border-border/80 bg-background hover:bg-muted/40 h-9 gap-1.5 rounded-xl text-xs font-medium'
              >
                <ArrowDownUp className='text-muted-foreground size-3.5' />
                <span className='text-muted-foreground hidden sm:inline'>
                  {t('dataTable.sort.sortBy', 'Sort')}:
                </span>
                <span className='font-semibold'>
                  {activeSortOption?.label ??
                    t('files.sort.default', 'Date added')}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-48'>
              <DropdownMenuLabel className='text-muted-foreground text-xs font-normal'>
                {t('files.sort.title', 'Sort files by')}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {sortOptions.map((opt) => {
                const isSelected =
                  opt.columnId === currentSort?.id &&
                  opt.desc === currentSort?.desc
                return (
                  <DropdownMenuItem
                    key={opt.id}
                    onClick={() => handleApplySort(opt.columnId, opt.desc)}
                    className='flex cursor-pointer items-center justify-between text-xs'
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check className='text-primary size-3.5' />}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Advanced Filters Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant='outline'
                size='sm'
                className={cn(
                  'border-border/80 bg-background hover:bg-muted/40 h-9 gap-1.5 rounded-xl text-xs font-medium',
                  advancedFilterCount > 0 &&
                    'border-primary/50 text-primary bg-primary/5'
                )}
              >
                <SlidersHorizontal className='size-3.5' />
                <span className='hidden sm:inline'>
                  {t('dataTable.filter.title', 'Filter')}
                </span>
                {advancedFilterCount > 0 && (
                  <Badge
                    variant='default'
                    className='flex size-4.5 items-center justify-center rounded-full p-0 text-[10px] font-bold'
                  >
                    {advancedFilterCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align='end'
              className='w-64 space-y-4 rounded-xl p-4 shadow-xl'
            >
              <div className='border-border/60 flex items-center justify-between border-b pb-1'>
                <span className='text-foreground text-xs font-semibold'>
                  {t('dataTable.filter.advancedFilters', 'File Filters')}
                </span>
                {advancedFilterCount > 0 && (
                  <button
                    type='button'
                    onClick={() => statusColumn?.setFilterValue(undefined)}
                    className='text-muted-foreground hover:text-foreground text-[11px] transition-colors'
                  >
                    {t('dataTable.columnHeader.reset', 'Reset')}
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <div className='space-y-1.5'>
                <label className='text-muted-foreground text-xs font-medium'>
                  {t('files.table.status', 'Status')}
                </label>
                <Select
                  value={currentStatus}
                  onValueChange={handleSelectStatus}
                >
                  <SelectTrigger className='h-8 w-full text-xs'>
                    <SelectValue placeholder='All Statuses' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all' className='text-xs'>
                      All Statuses
                    </SelectItem>
                    <SelectItem value='active' className='text-xs'>
                      Active
                    </SelectItem>
                    <SelectItem value='archived' className='text-xs'>
                      Archived
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </PopoverContent>
          </Popover>

          {/* Reset All Filters Button */}
          {isFiltered && (
            <Button
              variant='ghost'
              size='sm'
              onClick={handleClearAllFilters}
              className='text-muted-foreground hover:text-foreground h-9 px-2 text-xs'
              title={t('dataTable.columnHeader.reset', 'Reset all filters')}
            >
              <RotateCcw className='size-3.5 sm:mr-1' />
              <span className='hidden sm:inline'>
                {t('dataTable.columnHeader.reset', 'Reset')}
              </span>
            </Button>
          )}
        </div>
      </div>

      {/* Category Pills Row */}
      <div className='flex flex-wrap items-center gap-1.5 pt-0.5'>
        {CATEGORY_CHIPS.map((chip) => {
          const isSelected =
            chip.id === 'all'
              ? currentCategory === 'all' || currentCategory === null
              : currentCategory === chip.id
          const ChipIcon = chip.icon

          return (
            <button
              key={chip.id}
              type='button'
              onClick={() => handleSelectType(chip.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all select-none',
                isSelected
                  ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                  : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border/60 border'
              )}
            >
              <ChipIcon className='size-3.5' />
              <span>{t(chip.labelKey, chip.fallback)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
