import { Folder, Pencil, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatBytes } from '../columns'
import { type FolderSchema } from '../schema'

export interface FolderPanelProps {
  folders: FolderSchema[]
  activeFolder: string | null
  totalFiles: number
  onSelect: (folder: string | null) => void
  onRename: () => void
  onDelete: () => void
  canUpdate: boolean
  canDelete: boolean
}

export function FolderPanel({
  folders,
  activeFolder,
  totalFiles,
  onSelect,
  onRename,
  onDelete,
  canUpdate,
  canDelete,
}: FolderPanelProps) {
  const { t } = useTranslation()
  const selectedFolder = folders.find(
    (folder) => folder.folder === activeFolder
  )

  return (
    <aside className='border-border flex h-fit flex-col gap-3 rounded-md border p-3'>
      <div className='flex items-center justify-between'>
        <h3 className='text-sm font-medium'>{t('files.folders.title')}</h3>
        <Badge variant='secondary'>{folders.length}</Badge>
      </div>
      <Button
        variant={activeFolder === null ? 'secondary' : 'ghost'}
        className='h-auto justify-start gap-2 px-2 py-2'
        onClick={() => onSelect(null)}
      >
        <Folder className='size-4' />
        <span className='min-w-0 flex-1 truncate text-left'>
          {t('files.folders.all')}
        </span>
        <span className='text-muted-foreground text-xs'>{totalFiles}</span>
      </Button>
      <div className='flex max-h-[420px] flex-col gap-1 overflow-auto'>
        {folders.map((folder) => (
          <Button
            key={folder.folder}
            variant={activeFolder === folder.folder ? 'secondary' : 'ghost'}
            className='h-auto justify-start gap-2 px-2 py-2'
            onClick={() => onSelect(folder.folder)}
          >
            <Folder className='size-4' />
            <span className='min-w-0 flex-1 truncate text-left'>
              {folder.folder}
            </span>
            <span className='text-muted-foreground text-xs'>
              {folder.count}
            </span>
          </Button>
        ))}
      </div>
      {selectedFolder && (
        <div className='border-border flex flex-col gap-2 border-t pt-3'>
          <div className='text-muted-foreground flex items-center justify-between text-xs'>
            <span>{formatBytes(selectedFolder.size)}</span>
            <span>{selectedFolder.count} files</span>
          </div>
          <div className='flex gap-2'>
            {canUpdate && (
              <Button
                variant='outline'
                size='sm'
                className='flex-1'
                onClick={onRename}
              >
                <Pencil className='size-4' />
                {t('buttons.edit')}
              </Button>
            )}
            {canDelete && (
              <Button
                variant='outline'
                size='sm'
                className='flex-1'
                onClick={onDelete}
              >
                <Trash2 className='size-4' />
                {t('buttons.delete')}
              </Button>
            )}
          </div>
        </div>
      )}
    </aside>
  )
}
