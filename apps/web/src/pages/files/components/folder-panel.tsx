import { useState } from 'react'
import {
  FileText,
  Folder,
  FolderPlus,
  HardDrive,
  Image as ImageIcon,
  Music,
  Pencil,
  Search,
  Trash2,
  Video,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { formatBytes } from '../columns'
import { type FolderSchema } from '../schema'

export interface FolderPanelProps {
  folders: FolderSchema[]
  activeFolder: string | null
  totalFiles: number
  activeCategory?: string | null
  onSelectCategory?: (category: string | null) => void
  onSelect: (folder: string | null) => void
  onCreateFolder?: () => void
  onRename: () => void
  onDelete: () => void
  canUpdate: boolean
  canDelete: boolean
  canCreate?: boolean
}

export function FolderPanel({
  folders,
  activeFolder,
  totalFiles,
  activeCategory,
  onSelectCategory,
  onSelect,
  onCreateFolder,
  onRename,
  onDelete,
  canUpdate,
  canDelete,
  canCreate,
}: FolderPanelProps) {
  const { t } = useTranslation()
  const [folderFilter, setFolderFilter] = useState('')

  const selectedFolder = folders.find(
    (folder) => folder.folder === activeFolder
  )

  const totalStorageBytes = folders.reduce((sum, f) => sum + f.size, 0)
  // Simulated visual quota benchmark (1 GB) for progress percentage calculation
  const quotaBytes = 1024 * 1024 * 1024
  const storagePercentage = Math.min(
    100,
    Math.round((totalStorageBytes / quotaBytes) * 100)
  )

  const filteredFolders = folders.filter((f) =>
    f.folder.toLowerCase().includes(folderFilter.toLowerCase())
  )

  const categories = [
    { id: null, label: t('files.categories.all'), icon: HardDrive },
    { id: 'image', label: t('files.categories.images'), icon: ImageIcon },
    { id: 'file', label: t('files.categories.documents'), icon: FileText },
    { id: 'video', label: t('files.categories.videos'), icon: Video },
    { id: 'audio', label: t('files.categories.audio'), icon: Music },
  ]

  return (
    <aside className='border-border bg-card/60 flex h-fit flex-col gap-4 rounded-xl border p-3.5 shadow-xs'>
      {/* Categories Navigation */}
      {onSelectCategory && (
        <div className='flex flex-col gap-1'>
          <span className='text-muted-foreground px-2 text-[11px] font-semibold tracking-wider uppercase'>
            {t('files.categories.title')}
          </span>
          <div className='mt-1 flex flex-col gap-0.5'>
            {categories.map((cat) => {
              const Icon = cat.icon
              const isSelected = activeCategory === cat.id

              return (
                <Button
                  key={cat.label}
                  variant={isSelected ? 'secondary' : 'ghost'}
                  size='sm'
                  className={cn(
                    'h-8 justify-start gap-2.5 px-2 text-xs font-medium',
                    isSelected && 'text-primary font-semibold'
                  )}
                  onClick={() => onSelectCategory(cat.id)}
                >
                  <Icon className='size-3.5' />
                  <span className='truncate'>{cat.label}</span>
                </Button>
              )
            })}
          </div>
        </div>
      )}

      <Separator />

      {/* Folders Section */}
      <div className='flex flex-col gap-2'>
        <div className='flex items-center justify-between px-1'>
          <span className='text-muted-foreground text-[11px] font-semibold tracking-wider uppercase'>
            {t('files.folders.title')}
          </span>
          <div className='flex items-center gap-1.5'>
            <Badge variant='secondary' className='px-1.5 py-0 text-[11px]'>
              {folders.length}
            </Badge>
            {canCreate && onCreateFolder && (
              <Button
                variant='ghost'
                size='icon'
                className='text-muted-foreground hover:text-foreground size-6'
                onClick={onCreateFolder}
                title={t('files.actions.createFolder')}
              >
                <FolderPlus className='size-3.5' />
              </Button>
            )}
          </div>
        </div>

        {/* All Files Root Item */}
        <Button
          variant={activeFolder === null ? 'secondary' : 'ghost'}
          size='sm'
          className={cn(
            'h-8 justify-start gap-2 px-2 text-xs font-medium',
            activeFolder === null && 'text-primary font-semibold'
          )}
          onClick={() => onSelect(null)}
        >
          <Folder className='size-3.5' />
          <span className='min-w-0 flex-1 truncate text-left'>
            {t('files.folders.all')}
          </span>
          <span className='text-muted-foreground text-[11px] font-normal'>
            {totalFiles}
          </span>
        </Button>

        {/* Search folders if count > 4 */}
        {folders.length > 4 && (
          <div className='relative my-0.5'>
            <Search className='text-muted-foreground absolute top-2 left-2 size-3' />
            <Input
              value={folderFilter}
              onChange={(e) => setFolderFilter(e.target.value)}
              placeholder='Filter folders...'
              className='h-7 pl-7 text-xs'
            />
          </div>
        )}

        {/* Folder list */}
        <div className='flex max-h-56 flex-col gap-0.5 overflow-auto pr-0.5'>
          {filteredFolders.map((folder) => (
            <Button
              key={folder.folder}
              variant={activeFolder === folder.folder ? 'secondary' : 'ghost'}
              size='sm'
              className={cn(
                'group h-8 justify-start gap-2 px-2 text-xs font-medium',
                activeFolder === folder.folder && 'text-primary font-semibold'
              )}
              onClick={() => onSelect(folder.folder)}
            >
              <Folder className='size-3.5 fill-amber-500/20 text-amber-500/80' />
              <span className='min-w-0 flex-1 truncate text-left'>
                {folder.folder}
              </span>
              <span className='text-muted-foreground text-[11px] font-normal'>
                {folder.count}
              </span>
            </Button>
          ))}
        </div>
      </div>

      {/* Selected Folder Actions */}
      {selectedFolder && (
        <div className='border-border flex flex-col gap-2 border-t pt-2.5'>
          <div className='text-muted-foreground flex items-center justify-between px-1 text-[11px]'>
            <span>{formatBytes(selectedFolder.size)}</span>
            <span>{selectedFolder.count} files</span>
          </div>
          <div className='flex gap-1.5'>
            {canUpdate && (
              <Button
                variant='outline'
                size='sm'
                className='h-7 flex-1 gap-1.5 text-xs'
                onClick={onRename}
              >
                <Pencil className='size-3' />
                {t('buttons.edit')}
              </Button>
            )}
            {canDelete && (
              <Button
                variant='outline'
                size='sm'
                className='text-destructive hover:text-destructive hover:bg-destructive/10 h-7 flex-1 gap-1.5 text-xs'
                onClick={onDelete}
              >
                <Trash2 className='size-3' />
                {t('buttons.delete')}
              </Button>
            )}
          </div>
        </div>
      )}

      <Separator />

      {/* Storage Indicator */}
      <div className='flex flex-col gap-2 px-1'>
        <div className='flex items-center justify-between text-[11px]'>
          <span className='text-muted-foreground font-semibold'>
            {t('files.storage.title')}
          </span>
          <span className='text-muted-foreground font-medium'>
            {formatBytes(totalStorageBytes)}
          </span>
        </div>
        <div className='bg-muted h-1.5 w-full overflow-hidden rounded-full'>
          <div
            className='bg-primary h-full rounded-full transition-all duration-500'
            style={{ width: `${Math.max(storagePercentage, 3)}%` }}
          />
        </div>
        <span className='text-muted-foreground text-[10px]'>
          {t('files.storage.used', { used: formatBytes(totalStorageBytes) })}
        </span>
      </div>
    </aside>
  )
}
