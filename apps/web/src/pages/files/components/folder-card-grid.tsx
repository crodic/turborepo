import { Folder, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatBytes } from '../columns'
import type { FolderSchema } from '../schema'

interface FolderCardGridProps {
  folders: FolderSchema[]
  activeFolder: string | null
  onSelectFolder: (folder: string | null) => void
  onRenameFolder?: (folder: string) => void
  onDeleteFolder?: (folder: string) => void
  canUpdate?: boolean
  canDelete?: boolean
}

export function FolderCardGrid({
  folders,
  activeFolder,
  onSelectFolder,
  onRenameFolder,
  onDeleteFolder,
  canUpdate,
  canDelete,
}: FolderCardGridProps) {
  const { t } = useTranslation()

  if (folders.length === 0) {
    return null
  }

  return (
    <div className='flex flex-col gap-2.5'>
      <div className='flex items-center justify-between'>
        <h3 className='text-muted-foreground text-xs font-semibold tracking-wider uppercase'>
          {t('files.quickFolders.title')} ({folders.length})
        </h3>
      </div>

      <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-6'>
        {folders.map((folder) => {
          const isActive = activeFolder === folder.folder

          return (
            <div
              key={folder.folder}
              role='button'
              tabIndex={0}
              onClick={() => onSelectFolder(folder.folder)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelectFolder(folder.folder)
                }
              }}
              className={cn(
                'group relative flex cursor-pointer flex-col justify-between rounded-xl border p-3.5 text-left transition-all duration-200 select-none',
                'hover:border-primary/50 hover:bg-accent/40 hover:shadow-sm',
                isActive
                  ? 'border-primary/60 bg-primary/5 ring-primary/30 shadow-xs ring-1'
                  : 'border-border/70 bg-card/60'
              )}
            >
              <div className='flex items-start justify-between gap-2'>
                <div className='flex size-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 dark:bg-amber-400/15 dark:text-amber-400'>
                  <Folder className='size-5 fill-current' />
                </div>

                {(canUpdate || canDelete) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='text-muted-foreground hover:text-foreground size-7 opacity-0 transition-opacity group-hover:opacity-100'
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className='size-3.5' />
                        <span className='sr-only'>Folder options</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='end' className='w-36'>
                      {canUpdate && onRenameFolder && (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            onRenameFolder(folder.folder)
                          }}
                        >
                          <Pencil className='mr-2 size-3.5' />
                          {t('buttons.edit')}
                        </DropdownMenuItem>
                      )}
                      {canDelete && onDeleteFolder && (
                        <DropdownMenuItem
                          variant='destructive'
                          onClick={(e) => {
                            e.stopPropagation()
                            onDeleteFolder(folder.folder)
                          }}
                        >
                          <Trash2 className='mr-2 size-3.5' />
                          {t('buttons.delete')}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              <div className='mt-3 min-w-0'>
                <p className='text-foreground group-hover:text-primary truncate text-sm font-medium transition-colors'>
                  {folder.folder}
                </p>
                <p className='text-muted-foreground mt-0.5 text-xs'>
                  {folder.count} files &bull; {formatBytes(folder.size)}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
