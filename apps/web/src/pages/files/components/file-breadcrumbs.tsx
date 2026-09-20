import { ChevronRight, Folder, HardDrive } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface FileBreadcrumbsProps {
  activeFolder: string | null
  onSelectFolder: (folder: string | null) => void
  itemCount?: number
  isFetching?: boolean
}

export function FileBreadcrumbs({
  activeFolder,
  onSelectFolder,
  itemCount,
  isFetching,
}: FileBreadcrumbsProps) {
  const { t } = useTranslation()

  return (
    <nav
      aria-label='Breadcrumb'
      className='flex flex-wrap items-center gap-1.5 text-sm'
    >
      <Button
        variant='ghost'
        size='sm'
        className='text-muted-foreground hover:text-foreground h-8 gap-1.5 px-2'
        onClick={() => onSelectFolder(null)}
      >
        <HardDrive className='size-4' />
        <span>{t('files.breadcrumbs.allFiles')}</span>
      </Button>

      {activeFolder && (
        <>
          <ChevronRight className='text-muted-foreground size-3.5 shrink-0' />
          <div className='text-foreground bg-muted/40 flex items-center gap-1.5 rounded-md px-2 py-1 font-semibold'>
            <Folder className='text-primary fill-primary/20 size-4' />
            <span className='max-w-50 truncate sm:max-w-xs'>
              {activeFolder}
            </span>
          </div>
        </>
      )}

      {typeof itemCount === 'number' && (
        <Badge
          variant='secondary'
          className='text-muted-foreground ml-2 text-xs font-normal'
        >
          {isFetching ? '...' : `${itemCount} items`}
        </Badge>
      )}
    </nav>
  )
}
