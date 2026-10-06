import { FileImage, Film, FileText, Music, LayoutGrid } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export interface QuickFilterChipsProps {
  activeType: string | null
  onSelectType: (type: string | null) => void
  className?: string
}

export function QuickFilterChips({
  activeType,
  onSelectType,
  className,
}: QuickFilterChipsProps) {
  const { t } = useTranslation()

  const chips = [
    {
      id: 'all',
      value: null,
      label: t('files.filter.all', 'All'),
      icon: LayoutGrid,
    },
    {
      id: 'image',
      value: 'image',
      label: t('files.filter.images', 'Images'),
      icon: FileImage,
    },
    {
      id: 'video',
      value: 'video',
      label: t('files.filter.videos', 'Videos'),
      icon: Film,
    },
    {
      id: 'raw',
      value: 'raw',
      label: t('files.filter.documents', 'Documents'),
      icon: FileText,
    },
    {
      id: 'audio',
      value: 'audio',
      label: t('files.filter.audio', 'Audio'),
      icon: Music,
    },
  ]

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {chips.map((chip) => {
        const Icon = chip.icon
        const isSelected =
          chip.value === null
            ? !activeType || activeType === ''
            : activeType === chip.value

        return (
          <Button
            key={chip.id}
            variant={isSelected ? 'secondary' : 'ghost'}
            size='sm'
            onClick={() => onSelectType(chip.value)}
            className={cn(
              'h-7 gap-1.5 rounded-full px-2.5 text-xs font-medium transition-all',
              isSelected
                ? 'bg-primary/10 text-primary hover:bg-primary/15 dark:bg-primary/20 dark:text-primary-foreground font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            )}
          >
            <Icon className='size-3.5' />
            <span>{chip.label}</span>
          </Button>
        )
      })}
    </div>
  )
}
