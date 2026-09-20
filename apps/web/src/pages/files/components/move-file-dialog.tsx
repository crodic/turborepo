import { useEffect, useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { type FileSchema, type FolderSchema } from '../schema'
import { FolderCreatableField } from './folder-creatable-field'

export interface MoveFileDialogProps {
  file: FileSchema | null
  folders: FolderSchema[]
  onOpenChange: (open: boolean) => void
  onMoved: (folder: string | null) => Promise<void>
}

export function MoveFileDialog({
  file,
  folders,
  onOpenChange,
  onMoved,
}: MoveFileDialogProps) {
  const { t } = useTranslation()
  const [folder, setFolder] = useState(file?.folder ?? '')
  const mutation = useMutation({
    mutationFn: () => onMoved(folder.trim() || null),
  })

  useEffect(() => {
    setFolder(file?.folder ?? '')
  }, [file])

  const displayName = useMemo(() => {
    if (!file?.original_name) return ''
    try {
      return decodeURIComponent(file.original_name)
    } catch {
      return file.original_name
    }
  }, [file?.original_name])

  return (
    <Dialog open={Boolean(file)} onOpenChange={onOpenChange}>
      <DialogContent className='w-[92vw] sm:max-w-md'>
        <DialogHeader className='max-w-full min-w-0'>
          <DialogTitle>{t('files.move.title')}</DialogTitle>
          <DialogDescription
            className='max-w-full truncate font-mono text-xs'
            title={displayName}
          >
            {displayName}
          </DialogDescription>
        </DialogHeader>
        <FolderCreatableField
          label={t('files.table.folder')}
          value={folder}
          folders={folders}
          onChange={setFolder}
        />
        <DialogFooter className='gap-2 sm:gap-0'>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            {t('buttons.cancel')}
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {t('buttons.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
