import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import {
  Calendar,
  Check,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Film,
  Folder,
  HardDrive,
  ImageIcon,
  Link2,
  Loader2,
  Maximize2,
  Music,
  RotateCcw,
  Sparkles,
  Tag,
  Wand2,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatBytes } from '../columns'
import {
  FilePreviewDetail,
  isPreviewableAudio,
  isPreviewableImage,
  isPreviewableVideo,
} from '../file-preview'
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
  const [copiedId, setCopiedId] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [isStageReady, setIsStageReady] = useState(false)

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
    setCopiedId(false)
    setCopiedLink(false)

    if (file) {
      // Defer rendering the heavy media elements slightly so the modal entrance
      // transition runs at 60fps without being blocked by media decoding
      const timer = setTimeout(() => {
        setIsStageReady(true)
      }, 50)
      return () => {
        clearTimeout(timer)
        setIsStageReady(false)
      }
    }
    setIsStageReady(false)
  }, [file])

  const handleCopyId = () => {
    if (!file?.public_id) return
    navigator.clipboard.writeText(file.public_id)
    setCopiedId(true)
    toast.success(t('files.inspector.urlCopied', 'Public ID copied'))
    setTimeout(() => setCopiedId(false), 2000)
  }

  const handleCopyLink = () => {
    if (!previewOpenUrl) return
    navigator.clipboard.writeText(previewOpenUrl)
    setCopiedLink(true)
    toast.success(t('files.inspector.urlCopied', 'Link copied to clipboard'))
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const handleViewTransform = () => {
    const nextTransformations = buildImageTransformations(transform)

    if (!nextTransformations) {
      setTransformations('')
      return
    }

    setTransformations(nextTransformations)
    toast.success('Applied transformations')
  }

  const handleApplyPreset = (preset: Partial<ImageTransformForm>) => {
    const next = { ...transform, ...preset }
    setTransform(next)
    const nextTransformations = buildImageTransformations(next)
    setTransformations(nextTransformations)
  }

  const handleReset = () => {
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
  }

  const isImage = file ? isPreviewableImage(file) : false
  const isVideo = file ? isPreviewableVideo(file) : false
  const isAudio = file ? isPreviewableAudio(file) : false

  const fileTypeIcon = isVideo ? (
    <div className='flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-500'>
      <Film className='size-5' />
    </div>
  ) : isImage ? (
    <div className='flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-500'>
      <ImageIcon className='size-5' />
    </div>
  ) : isAudio ? (
    <div className='flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500'>
      <Music className='size-5' />
    </div>
  ) : (
    <div className='flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500'>
      <Tag className='size-5' />
    </div>
  )

  return (
    <Dialog open={Boolean(file)} onOpenChange={onOpenChange}>
      <DialogContent className='border-border/80 bg-background data-[state=open]:zoom-in-100 data-[state=open]:fade-in-0 flex h-[88vh] max-h-[92vh] w-[96vw] transform-gpu flex-col overflow-hidden rounded-2xl border p-0 shadow-2xl duration-150 ease-out will-change-transform sm:w-[94vw] sm:max-w-6xl xl:max-w-7xl'>
        {/* Header */}
        <DialogHeader className='border-border/60 bg-muted/20 flex shrink-0 flex-row items-center justify-between gap-4 border-b px-6 py-3.5 pr-14'>
          <div className='flex min-w-0 flex-1 items-center gap-3'>
            {fileTypeIcon}
            <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
              <div className='flex min-w-0 flex-wrap items-center gap-2'>
                <DialogTitle className='text-foreground max-w-md truncate text-sm leading-snug font-bold sm:text-base lg:max-w-xl'>
                  {file?.original_name}
                </DialogTitle>
                {file && (
                  <Badge
                    variant='outline'
                    className='hidden shrink-0 text-[10px] font-semibold uppercase sm:inline-flex'
                  >
                    {file.resource_type}
                  </Badge>
                )}
                {file && (
                  <Badge
                    variant='secondary'
                    className='hidden shrink-0 font-mono text-[10px] sm:inline-flex'
                  >
                    {formatBytes(file.size)}
                  </Badge>
                )}
              </div>
              <DialogDescription asChild>
                <div className='text-muted-foreground flex items-center gap-1.5 text-xs'>
                  <span>ID:</span>
                  <button
                    type='button'
                    onClick={handleCopyId}
                    className='group hover:text-foreground inline-flex items-center gap-1 font-mono transition-colors'
                    title='Copy public ID'
                  >
                    <span className='max-w-50 truncate sm:max-w-xs'>
                      {file?.public_id}
                    </span>
                    {copiedId ? (
                      <Check className='size-3 text-emerald-500' />
                    ) : (
                      <Copy className='size-3 opacity-60 transition-opacity group-hover:opacity-100' />
                    )}
                  </button>
                </div>
              </DialogDescription>
            </div>
          </div>

          {/* Quick Header Actions */}
          {file && (
            <div className='flex shrink-0 items-center gap-1.5'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='h-8 gap-1.5 text-xs'
                onClick={handleCopyLink}
                title={t('files.actions.copyUrl')}
              >
                {copiedLink ? (
                  <Check className='size-3.5 text-emerald-500' />
                ) : (
                  <Link2 className='size-3.5' />
                )}
                <span className='hidden md:inline'>
                  {t('files.actions.copyUrl')}
                </span>
              </Button>

              <Button
                type='button'
                variant='outline'
                size='sm'
                className='h-8 gap-1.5 text-xs'
                asChild
              >
                <a
                  href={previewOpenUrl}
                  download={file.original_name}
                  title='Download'
                >
                  <Download className='size-3.5' />
                  <span className='hidden md:inline'>Download</span>
                </a>
              </Button>

              <Button
                type='button'
                variant='ghost'
                size='icon'
                className='text-muted-foreground hover:text-foreground size-8 rounded-lg'
                asChild
                title={t('files.actions.open')}
              >
                <a href={previewOpenUrl} target='_blank' rel='noreferrer'>
                  <ExternalLink className='size-4' />
                </a>
              </Button>
            </div>
          )}
        </DialogHeader>

        {/* Content Body */}
        {file && (
          <div className='grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_360px]'>
            {/* Left Column: Media Preview Stage */}
            <div className='relative flex min-h-80 min-w-0 flex-1 items-center justify-center overflow-hidden bg-black/50 p-4 lg:p-6'>
              {isStageReady ? (
                <FilePreviewDetail file={file} url={previewUrl} />
              ) : (
                <div className='text-muted-foreground flex animate-pulse flex-col items-center justify-center gap-3'>
                  <div className='text-muted-foreground/60 flex size-12 items-center justify-center rounded-2xl bg-white/5'>
                    <Loader2 className='size-6 animate-spin' />
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Sidebar */}
            <div className='border-border/60 bg-card/40 flex w-full min-w-0 flex-col overflow-hidden border-t lg:border-t-0 lg:border-l'>
              {isImage ? (
                <Tabs defaultValue='details' className='flex h-full flex-col'>
                  <div className='border-border/60 border-b px-4 pt-3 pb-2'>
                    <TabsList className='grid w-full grid-cols-2'>
                      <TabsTrigger value='details' className='text-xs'>
                        {t('files.inspector.information', 'Details')}
                      </TabsTrigger>
                      <TabsTrigger
                        value='transform'
                        className='gap-1.5 text-xs'
                      >
                        <Wand2 className='size-3.5' />
                        {t('files.transform.title', 'Transform')}
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent
                    value='details'
                    className='m-0 flex-1 space-y-4 overflow-y-auto p-4 outline-none'
                  >
                    <FileMetadataView
                      file={file}
                      previewOpenUrl={previewOpenUrl}
                    />
                  </TabsContent>

                  <TabsContent
                    value='transform'
                    className='m-0 flex-1 space-y-4 overflow-y-auto p-4 outline-none'
                  >
                    <ImageTransformView
                      value={transform}
                      activeTransformations={transformations}
                      onChange={setTransform}
                      onApply={handleViewTransform}
                      onReset={handleReset}
                      onPreset={handleApplyPreset}
                    />
                  </TabsContent>
                </Tabs>
              ) : (
                <div className='flex-1 space-y-4 overflow-y-auto p-4'>
                  <FileMetadataView
                    file={file}
                    previewOpenUrl={previewOpenUrl}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function FileMetadataView({
  file,
  previewOpenUrl,
}: {
  file: FileSchema
  previewOpenUrl?: string
}) {
  const { t } = useTranslation()

  return (
    <div className='flex flex-col gap-4'>
      {/* File Info Card */}
      <div className='border-border/60 bg-muted/20 space-y-3 rounded-xl border p-3.5 shadow-xs'>
        <p className='text-muted-foreground text-xs font-semibold tracking-wider uppercase'>
          {t('files.inspector.information', 'File Details')}
        </p>
        <div className='space-y-2.5 text-xs'>
          <div className='flex items-center justify-between gap-2'>
            <span className='text-muted-foreground flex items-center gap-1.5'>
              <Folder className='size-3.5' />
              {t('files.table.folder')}
            </span>
            <Badge
              variant='secondary'
              className='max-w-42.5 truncate text-[11px] font-normal'
            >
              {file.folder ?? t('files.folders.root')}
            </Badge>
          </div>

          <div className='flex items-center justify-between gap-2'>
            <span className='text-muted-foreground flex items-center gap-1.5'>
              <Tag className='size-3.5' />
              {t('files.table.mime')}
            </span>
            <code className='bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-[11px]'>
              {file.mime}
            </code>
          </div>

          <div className='flex items-center justify-between gap-2'>
            <span className='text-muted-foreground flex items-center gap-1.5'>
              <HardDrive className='size-3.5' />
              {t('files.table.size')}
            </span>
            <span className='text-foreground font-semibold'>
              {formatBytes(file.size)}
            </span>
          </div>

          {(file.width || file.height) && (
            <div className='flex items-center justify-between gap-2'>
              <span className='text-muted-foreground flex items-center gap-1.5'>
                <Maximize2 className='size-3.5' />
                {t('files.table.dimensions')}
              </span>
              <span className='text-foreground font-mono font-medium'>
                {file.width} × {file.height}
              </span>
            </div>
          )}

          {Boolean(file.duration) && (
            <div className='flex items-center justify-between gap-2'>
              <span className='text-muted-foreground flex items-center gap-1.5'>
                <Clock className='size-3.5' />
                Duration
              </span>
              <span className='text-foreground font-mono font-medium'>
                {Math.floor(file.duration! / 60)}:
                {String(Math.floor(file.duration! % 60)).padStart(2, '0')}
              </span>
            </div>
          )}

          <div className='flex items-center justify-between gap-2'>
            <span className='text-muted-foreground flex items-center gap-1.5'>
              Status
            </span>
            <div className='flex items-center gap-1.5'>
              <span
                className={cn(
                  'size-2 rounded-full',
                  file.status === 'active'
                    ? 'bg-emerald-500 ring-2 ring-emerald-500/20'
                    : 'bg-amber-500 ring-2 ring-amber-500/20'
                )}
              />
              <span className='text-foreground font-medium capitalize'>
                {file.status}
              </span>
            </div>
          </div>

          {file.disk && (
            <div className='flex items-center justify-between gap-2'>
              <span className='text-muted-foreground flex items-center gap-1.5'>
                {t('files.inspector.disk', 'Storage')}
              </span>
              <Badge
                variant='outline'
                className='font-mono text-[10px] uppercase'
              >
                {file.disk}
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* Dates Card */}
      <div className='border-border/60 bg-muted/20 space-y-2.5 rounded-xl border p-3.5 text-xs shadow-xs'>
        <div className='flex items-center justify-between gap-2'>
          <span className='text-muted-foreground flex items-center gap-1.5'>
            <Calendar className='size-3.5' />
            {t('files.table.createdAt')}
          </span>
          <span className='text-foreground font-medium'>
            {format(new Date(file.createdAt), 'dd/MM/yyyy HH:mm')}
          </span>
        </div>
        {file.updatedAt && (
          <div className='flex items-center justify-between gap-2'>
            <span className='text-muted-foreground flex items-center gap-1.5'>
              <Clock className='size-3.5' />
              Updated
            </span>
            <span className='text-foreground font-medium'>
              {format(new Date(file.updatedAt), 'dd/MM/yyyy HH:mm')}
            </span>
          </div>
        )}
      </div>

      {/* Action Links */}
      <div className='flex flex-col gap-2'>
        <Button
          variant='outline'
          size='sm'
          className='w-full justify-start text-xs'
          asChild
        >
          <a href={previewOpenUrl} target='_blank' rel='noreferrer'>
            <ExternalLink className='mr-2 size-3.5' />
            {t('files.actions.open')}
          </a>
        </Button>
      </div>
    </div>
  )
}

function ImageTransformView({
  value,
  activeTransformations,
  onChange,
  onApply,
  onReset,
  onPreset,
}: {
  value: ImageTransformForm
  activeTransformations: string
  onChange: (value: ImageTransformForm) => void
  onApply: () => void
  onReset: () => void
  onPreset: (preset: Partial<ImageTransformForm>) => void
}) {
  const { t } = useTranslation()

  const update = (key: keyof ImageTransformForm, nextValue: string) => {
    onChange({ ...value, [key]: nextValue })
  }

  return (
    <div className='flex flex-col gap-4'>
      {/* Quick Presets */}
      <div className='space-y-2'>
        <p className='text-muted-foreground text-xs font-semibold tracking-wider uppercase'>
          Presets
        </p>
        <div className='flex flex-wrap gap-1.5'>
          <Button
            type='button'
            variant='secondary'
            size='sm'
            className='h-7 rounded-lg text-[11px]'
            onClick={() =>
              onPreset({ width: '300', height: '300', crop: 'fill' })
            }
          >
            300×300 Sq
          </Button>
          <Button
            type='button'
            variant='secondary'
            size='sm'
            className='h-7 rounded-lg text-[11px]'
            onClick={() =>
              onPreset({ width: '800', height: '600', crop: 'cover' })
            }
          >
            800×600 Cover
          </Button>
          <Button
            type='button'
            variant='secondary'
            size='sm'
            className='h-7 rounded-lg text-[11px]'
            onClick={() => onPreset({ format: 'webp', quality: '85' })}
          >
            WebP 85%
          </Button>
          <Button
            type='button'
            variant='secondary'
            size='sm'
            className='h-7 rounded-lg text-[11px]'
            onClick={() => onPreset({ effect: 'grayscale' })}
          >
            B&W Filter
          </Button>
        </div>
      </div>

      {/* Form Controls */}
      <div className='border-border/60 bg-muted/20 space-y-3 rounded-xl border p-3.5 shadow-xs'>
        <p className='text-muted-foreground text-xs font-semibold tracking-wider uppercase'>
          Dimensions
        </p>
        <div className='grid grid-cols-2 gap-2'>
          <div className='space-y-1'>
            <label className='text-muted-foreground text-[10px] font-medium'>
              Width (px)
            </label>
            <Input
              type='number'
              min={1}
              value={value.width}
              onChange={(event) => update('width', event.target.value)}
              placeholder='e.g. 400'
              className='h-8 text-xs'
            />
          </div>
          <div className='space-y-1'>
            <label className='text-muted-foreground text-[10px] font-medium'>
              Height (px)
            </label>
            <Input
              type='number'
              min={1}
              value={value.height}
              onChange={(event) => update('height', event.target.value)}
              placeholder='e.g. 400'
              className='h-8 text-xs'
            />
          </div>
        </div>

        <p className='text-muted-foreground pt-1 text-xs font-semibold tracking-wider uppercase'>
          Cropping & Format
        </p>
        <div className='grid grid-cols-2 gap-2'>
          <div className='space-y-1'>
            <label className='text-muted-foreground text-[10px] font-medium'>
              Crop Mode
            </label>
            <TransformSelect
              value={value.crop}
              placeholder='Auto'
              options={['fill', 'cover', 'fit', 'limit', 'pad', 'thumb']}
              onValueChange={(nextValue) => update('crop', nextValue)}
            />
          </div>
          <div className='space-y-1'>
            <label className='text-muted-foreground text-[10px] font-medium'>
              Format
            </label>
            <TransformSelect
              value={value.format}
              placeholder='Original'
              options={['webp', 'png', 'jpg']}
              onValueChange={(nextValue) => update('format', nextValue)}
            />
          </div>
        </div>

        <p className='text-muted-foreground pt-1 text-xs font-semibold tracking-wider uppercase'>
          Quality & Effect
        </p>
        <div className='grid grid-cols-2 gap-2'>
          <div className='space-y-1'>
            <label className='text-muted-foreground text-[10px] font-medium'>
              Quality (1-100)
            </label>
            <Input
              type='number'
              min={1}
              max={100}
              value={value.quality}
              onChange={(event) => update('quality', event.target.value)}
              placeholder='e.g. 80'
              className='h-8 text-xs'
            />
          </div>
          <div className='space-y-1'>
            <label className='text-muted-foreground text-[10px] font-medium'>
              Effect
            </label>
            <TransformSelect
              value={value.effect}
              placeholder='None'
              options={['grayscale', 'blur:8', 'sharpen:4']}
              onValueChange={(nextValue) => update('effect', nextValue)}
            />
          </div>
        </div>

        <div className='space-y-1 pt-1'>
          <label className='text-muted-foreground text-[10px] font-medium'>
            Custom Raw String
          </label>
          <Input
            value={value.raw}
            onChange={(event) => update('raw', event.target.value)}
            placeholder={t('files.transform.raw')}
            className='h-8 font-mono text-xs'
          />
        </div>

        {activeTransformations && (
          <div className='border-primary/20 bg-primary/5 rounded-lg border p-2.5'>
            <div className='mb-1 flex items-center justify-between gap-1'>
              <span className='text-primary flex items-center gap-1 text-[11px] font-semibold'>
                <Sparkles className='size-3' /> Active transforms:
              </span>
            </div>
            <p className='text-foreground/90 font-mono text-[11px] break-all'>
              {activeTransformations}
            </p>
          </div>
        )}

        <div className='flex gap-2 pt-2'>
          <Button
            size='sm'
            className='h-8 flex-1 gap-1.5 text-xs'
            onClick={onApply}
          >
            <Sparkles className='size-3.5' />
            {t('files.transform.view')}
          </Button>
          <Button
            size='sm'
            variant='outline'
            className='h-8 gap-1 text-xs'
            onClick={onReset}
          >
            <RotateCcw className='size-3.5' />
            {t('files.transform.reset')}
          </Button>
        </div>
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
      <SelectTrigger className='h-8 w-full text-xs'>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value='none' className='text-xs'>
          {placeholder}
        </SelectItem>
        {options.map((option) => (
          <SelectItem key={option} value={option} className='text-xs'>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
