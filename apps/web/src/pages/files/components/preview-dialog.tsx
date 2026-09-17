import { useEffect, useState, type ReactNode } from 'react'
import { format } from 'date-fns'
import { LinkIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatBytes } from '../columns'
import { FilePreviewDetail, isPreviewableImage } from '../file-preview'
import { type FileSchema } from '../schema'

export interface PreviewDialogProps {
  file: FileSchema | null
  onOpenChange: (open: boolean) => void
}

export type ImageTransformForm = {
  width: string
  height: string
  crop: string
  format: string
  quality: string
  effect: string
  raw: string
}

export function toPositiveTransform(
  prefix: string,
  value: string,
  max?: number
) {
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) return null
  return `${prefix}_${max ? Math.min(number, max) : number}`
}

export function buildImageTransformations(value: ImageTransformForm) {
  const parts = [
    toPositiveTransform('w', value.width),
    toPositiveTransform('h', value.height),
    value.crop ? `c_${value.crop}` : null,
    value.format ? `f_${value.format}` : null,
    toPositiveTransform('q', value.quality, 100),
    value.effect ? `e_${value.effect}` : null,
    value.raw.trim() || null,
  ].filter(Boolean)

  return parts.join(',')
}

export function buildFileTransformUrl(url: string, transformations: string) {
  const [baseUrl] = url.split('?')
  const match = baseUrl.match(/^(.*\/storage\/uploads\/[^/]+)\/([^/]+)$/)

  if (!match) return url

  return `${match[1]}/${transformations}/${match[2]}`
}

export function PreviewDialog({ file, onOpenChange }: PreviewDialogProps) {
  const { t } = useTranslation()
  const openUrl = file?.url
  const [transform, setTransform] = useState<ImageTransformForm>({
    width: '',
    height: '',
    crop: '',
    format: '',
    quality: '',
    effect: '',
    raw: '',
  })
  const [transformations, setTransformations] = useState('')
  const transformedUrl =
    file && transformations
      ? buildFileTransformUrl(file.url, transformations)
      : null
  const previewUrl = transformedUrl ?? undefined
  const previewOpenUrl = transformedUrl ?? openUrl

  useEffect(() => {
    setTransform({
      width: '',
      height: '',
      crop: '',
      format: '',
      quality: '',
      effect: '',
      raw: '',
    })
    setTransformations('')
  }, [file?.public_id])

  const handleViewTransform = () => {
    const nextTransformations = buildImageTransformations(transform)

    if (!nextTransformations) {
      setTransformations('')
      return
    }

    setTransformations(nextTransformations)
  }

  return (
    <Dialog open={Boolean(file)} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden sm:max-w-6xl'>
        <DialogHeader>
          <DialogTitle className='pr-6 break-words'>
            {file?.original_name}
          </DialogTitle>
          <DialogDescription className='break-all'>
            {file?.public_id}
          </DialogDescription>
        </DialogHeader>
        {file && (
          <div className='grid min-h-0 gap-4 overflow-y-auto pr-1 md:grid-cols-[minmax(0,1fr)_minmax(0,240px)]'>
            <div className='bg-muted flex min-h-[220px] min-w-0 items-center justify-center overflow-hidden rounded-md border'>
              <FilePreviewDetail file={file} url={previewUrl} />
            </div>
            <dl className='grid min-w-0 content-start gap-3 text-sm'>
              {isPreviewableImage(file) && (
                <ImageTransformPanel
                  value={transform}
                  activeTransformations={transformations}
                  onChange={setTransform}
                  onView={handleViewTransform}
                  onReset={() => setTransformations('')}
                />
              )}
              <Metadata label={t('files.table.folder')}>
                {file.folder ?? t('files.folders.root')}
              </Metadata>
              <Metadata label={t('files.table.mime')}>{file.mime}</Metadata>
              <Metadata label={t('files.table.size')}>
                {formatBytes(file.size)}
              </Metadata>
              <Metadata label={t('files.table.dimensions')}>
                {file.width && file.height
                  ? `${file.width} x ${file.height}`
                  : '-'}
              </Metadata>
              <Metadata label={t('files.table.status')}>{file.status}</Metadata>
              <Metadata label={t('files.table.createdAt')}>
                {format(file.createdAt, 'dd/MM/yyyy HH:mm')}
              </Metadata>
              <Button variant='outline' className='min-w-0' asChild>
                <a href={previewOpenUrl} target='_blank' rel='noreferrer'>
                  <LinkIcon className='size-4' />
                  <span className='truncate'>{t('files.actions.open')}</span>
                </a>
              </Button>
            </dl>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function Metadata({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div>
      <dt className='text-muted-foreground text-xs'>{label}</dt>
      <dd className='min-w-0 font-medium break-all'>{children}</dd>
    </div>
  )
}

export function ImageTransformPanel({
  value,
  activeTransformations,
  onChange,
  onView,
  onReset,
}: {
  value: ImageTransformForm
  activeTransformations: string
  onChange: (value: ImageTransformForm) => void
  onView: () => void
  onReset: () => void
}) {
  const { t } = useTranslation()
  const update = (key: keyof ImageTransformForm, nextValue: string) => {
    onChange({ ...value, [key]: nextValue })
  }

  return (
    <div className='grid gap-2 rounded-md border p-3'>
      <div>
        <p className='text-sm font-medium'>{t('files.transform.title')}</p>
        {activeTransformations && (
          <p className='text-muted-foreground mt-1 text-xs break-all'>
            {activeTransformations}
          </p>
        )}
      </div>
      <div className='grid grid-cols-2 gap-2'>
        <Input
          type='number'
          min={1}
          value={value.width}
          onChange={(event) => update('width', event.target.value)}
          placeholder={t('files.transform.width')}
        />
        <Input
          type='number'
          min={1}
          value={value.height}
          onChange={(event) => update('height', event.target.value)}
          placeholder={t('files.transform.height')}
        />
      </div>
      <div className='grid grid-cols-2 gap-2'>
        <TransformSelect
          value={value.crop}
          placeholder={t('files.transform.crop')}
          options={['fill', 'cover', 'fit', 'limit', 'pad', 'thumb']}
          onValueChange={(nextValue) => update('crop', nextValue)}
        />
        <TransformSelect
          value={value.format}
          placeholder={t('files.transform.format')}
          options={['jpg', 'png', 'webp']}
          onValueChange={(nextValue) => update('format', nextValue)}
        />
      </div>
      <div className='grid grid-cols-2 gap-2'>
        <Input
          type='number'
          min={1}
          max={100}
          value={value.quality}
          onChange={(event) => update('quality', event.target.value)}
          placeholder={t('files.transform.quality')}
        />
        <TransformSelect
          value={value.effect}
          placeholder={t('files.transform.effect')}
          options={['grayscale', 'blur:8', 'sharpen:4']}
          onValueChange={(nextValue) => update('effect', nextValue)}
        />
      </div>
      <Input
        value={value.raw}
        onChange={(event) => update('raw', event.target.value)}
        placeholder={t('files.transform.raw')}
      />
      <div className='flex gap-2'>
        <Button size='sm' className='flex-1' onClick={onView}>
          {t('files.transform.view')}
        </Button>
        <Button size='sm' variant='outline' onClick={onReset}>
          {t('files.transform.reset')}
        </Button>
      </div>
    </div>
  )
}

export function TransformSelect({
  value,
  placeholder,
  options,
  onValueChange,
}: {
  value: string
  placeholder: string
  options: string[]
  onValueChange: (value: string) => void
}) {
  return (
    <Select
      value={value || 'none'}
      onValueChange={(nextValue) =>
        onValueChange(nextValue === 'none' ? '' : nextValue)
      }
    >
      <SelectTrigger className='w-full'>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value='none'>{placeholder}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
