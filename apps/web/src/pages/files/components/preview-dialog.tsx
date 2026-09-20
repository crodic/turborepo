import { useEffect, useState } from 'react'
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Film,
  ImageIcon,
  Link2,
  Loader2,
  Music,
  Tag,
  Wand2,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatBytes } from '../columns'
import {
  FilePreviewDetail,
  isPreviewableAudio,
  isPreviewableImage,
  isPreviewableVideo,
} from '../file-preview'
import { type FileSchema } from '../schema'
import { FileMetadataView } from './file-metadata-view'
import {
  ImageTransformView,
  type ImageTransformForm,
  buildFileTransformUrl,
  buildImageTransformations,
  toPositiveTransform,
  TransformSelect,
} from './image-transform-view'
import { TransformGuidelinePopover } from './transform-guideline-popover'

export type { ImageTransformForm }
export {
  buildFileTransformUrl,
  buildImageTransformations,
  toPositiveTransform,
  TransformSelect,
  FileMetadataView,
  ImageTransformView,
  TransformGuidelinePopover,
}

export interface PreviewDialogProps {
  file: FileSchema | null
  onOpenChange: (open: boolean) => void
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
    toast.success(t('files.transform.appliedToast', 'Applied transformations'))
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
                  title={t('files.actions.download', 'Download')}
                >
                  <Download className='size-3.5' />
                  <span className='hidden md:inline'>
                    {t('files.actions.download', 'Download')}
                  </span>
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
