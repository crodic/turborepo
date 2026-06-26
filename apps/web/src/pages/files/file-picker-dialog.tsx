import { useMemo, useState } from 'react'
import { Check, SearchIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PaginateQueryBuilder } from '@/lib/query-builder'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatBytes } from './columns'
import { FilePreviewThumbnail } from './file-preview'
import { useDataFileOverview } from './queries'
import type { FileSchema } from './schema'

type FilePickerBaseProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  resourceType?: string
  multiple?: boolean
}

type FilePickerDialogProps =
  | (FilePickerBaseProps & {
      mode: 'file'
      multiple?: false
      value?: FileSchema | null
      onValueChange: (value: FileSchema | null) => void
    })
  | (FilePickerBaseProps & {
      mode: 'file'
      multiple: true
      value?: FileSchema[]
      onValueChange: (value: FileSchema[]) => void
    })
  | (FilePickerBaseProps & {
      mode: 'url'
      multiple?: false
      value?: string | null
      onValueChange: (value: string | null, file?: FileSchema) => void
    })
  | (FilePickerBaseProps & {
      mode: 'url'
      multiple: true
      value?: string[]
      onValueChange: (value: string[], files: FileSchema[]) => void
    })

export function FilePickerDialog(props: FilePickerDialogProps) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<FileSchema[]>([])
  const multiple = props.multiple === true

  const params = useMemo(() => {
    const builder = new PaginateQueryBuilder()
      .page(1)
      .limit(24)
      .sortBy('createdAt', 'DESC')
      .search(search)

    if (props.resourceType) {
      builder.eq('resource_type', props.resourceType)
    }

    return builder.build()
  }, [props.resourceType, search])

  const { data, isFetching } = useDataFileOverview(params)
  const files = data?.data ?? []

  const toggleFile = (file: FileSchema) => {
    setSelectedFiles((current) => {
      const exists = current.some((item) => item.public_id === file.public_id)

      if (!multiple) {
        return exists ? [] : [file]
      }

      if (exists) {
        return current.filter((item) => item.public_id !== file.public_id)
      }

      return [...current, file]
    })
  }

  const handleConfirm = () => {
    if (selectedFiles.length === 0) return

    if (props.mode === 'url' && props.multiple === true) {
      props.onValueChange(
        selectedFiles.map((file) => file.url),
        selectedFiles
      )
    } else if (props.mode === 'url') {
      const [file] = selectedFiles
      props.onValueChange(file?.url ?? null, file)
    } else if (props.multiple === true) {
      props.onValueChange(selectedFiles)
    } else {
      props.onValueChange(selectedFiles[0] ?? null)
    }

    setSelectedFiles([])
    props.onOpenChange(false)
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className='flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden sm:max-w-4xl'>
        <DialogHeader>
          <DialogTitle>{props.title ?? t('files.picker.title')}</DialogTitle>
          <DialogDescription>
            {props.description ?? t('files.picker.description')}
          </DialogDescription>
        </DialogHeader>

        <div className='relative'>
          <SearchIcon className='text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2' />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('files.picker.search')}
            className='pl-9'
          />
        </div>

        <ScrollArea className='min-h-0 flex-1 overflow-scroll rounded-md border'>
          <div className='grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3'>
            {files.map((file) => {
              const selected = selectedFiles.some(
                (item) => item.public_id === file.public_id
              )
              return (
                <button
                  key={file.public_id}
                  type='button'
                  className={[
                    'hover:bg-muted/60 flex min-w-0 gap-3 rounded-md border p-2 text-left transition-colors',
                    selected ? 'border-primary bg-primary/5' : 'border-border',
                  ].join(' ')}
                  onClick={() => toggleFile(file)}
                >
                  <div className='bg-muted relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded border'>
                    <FilePreviewThumbnail file={file} />
                    {selected && (
                      <span className='bg-primary text-primary-foreground absolute top-1 right-1 flex size-5 items-center justify-center rounded-full'>
                        <Check className='size-3' />
                      </span>
                    )}
                  </div>
                  <div className='min-w-0 flex-1'>
                    <p className='truncate text-sm font-medium'>
                      {file.original_name}
                    </p>
                    <p className='text-muted-foreground truncate text-xs'>
                      {file.folder ?? t('files.folders.root')}
                    </p>
                    <p className='text-muted-foreground text-xs'>
                      {formatBytes(file.size)}
                    </p>
                  </div>
                </button>
              )
            })}
            {!isFetching && files.length === 0 && (
              <div className='text-muted-foreground col-span-full py-10 text-center text-sm'>
                {t('files.picker.empty')}
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant='outline' onClick={() => props.onOpenChange(false)}>
            {t('buttons.cancel')}
          </Button>
          <Button disabled={selectedFiles.length === 0} onClick={handleConfirm}>
            {multiple
              ? t('files.picker.selectCount', { count: selectedFiles.length })
              : t('files.picker.select')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
