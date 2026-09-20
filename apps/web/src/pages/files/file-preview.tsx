import { useState, useRef, type MouseEvent } from 'react'
import {
  FileIcon,
  VideoIcon,
  Music,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Grid,
  Download,
  ExternalLink,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  MediaPlayer,
  MediaPlayerAudio,
  MediaPlayerControls,
  MediaPlayerControlsOverlay,
  MediaPlayerError,
  MediaPlayerFullscreen,
  MediaPlayerLoading,
  MediaPlayerPiP,
  MediaPlayerPlay,
  MediaPlayerPlaybackSpeed,
  MediaPlayerSeek,
  MediaPlayerSeekBackward,
  MediaPlayerSeekForward,
  MediaPlayerTime,
  MediaPlayerVideo,
  MediaPlayerVolume,
  MediaPlayerVolumeIndicator,
} from '@/components/ui/media-player'
import { formatBytes } from './columns'
import type { FileSchema } from './schema'

const imageExtensions = [
  'avif',
  'bmp',
  'gif',
  'ico',
  'jpeg',
  'jpg',
  'png',
  'svg',
  'webp',
]

const videoExtensions = [
  'm4v',
  'mov',
  'mp4',
  'mpeg',
  'ogv',
  'webm',
  'mkv',
  'avi',
]
const audioExtensions = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'weba']

export function isPreviewableImage(file: FileSchema) {
  const ext = getFileExtension(file.original_name || file.url)

  return (
    file.resource_type === 'image' ||
    file.mime.startsWith('image/') ||
    imageExtensions.includes(ext)
  )
}

export function isPreviewableVideo(file: FileSchema) {
  const ext = getFileExtension(file.original_name || file.url)

  return (
    file.resource_type === 'video' ||
    file.mime.startsWith('video/') ||
    videoExtensions.includes(ext)
  )
}

export function isPreviewableAudio(file: FileSchema) {
  const ext = getFileExtension(file.original_name || file.url)

  return (
    file.resource_type === 'audio' ||
    file.mime.startsWith('audio/') ||
    audioExtensions.includes(ext)
  )
}

export function VideoMediaPlayer({
  src,
  className,
}: {
  src: string
  className?: string
}) {
  return (
    <MediaPlayer
      key={src}
      className={cn(
        'relative flex size-full max-h-[min(650px,72dvh)] max-w-full items-center justify-center overflow-hidden rounded-xl bg-black text-white shadow-2xl',
        className
      )}
    >
      <MediaPlayerVideo
        src={src}
        className='size-full max-h-full max-w-full object-contain'
        playsInline
        preload='metadata'
      />
      <MediaPlayerLoading />
      <MediaPlayerError />
      <MediaPlayerVolumeIndicator />
      <MediaPlayerControls className='flex-col items-start gap-2.5'>
        <MediaPlayerControlsOverlay />
        <MediaPlayerSeek />
        <div className='flex w-full items-center justify-between gap-2'>
          <div className='flex items-center gap-1 sm:gap-2'>
            <MediaPlayerPlay />
            <MediaPlayerSeekBackward />
            <MediaPlayerSeekForward />
            <MediaPlayerVolume />
            <MediaPlayerTime />
          </div>
          <div className='flex items-center gap-1 sm:gap-2'>
            <MediaPlayerPlaybackSpeed />
            <MediaPlayerPiP />
            <MediaPlayerFullscreen />
          </div>
        </div>
      </MediaPlayerControls>
    </MediaPlayer>
  )
}

export function AudioMediaPlayer({
  src,
  title,
  className,
}: {
  src: string
  title?: string
  className?: string
}) {
  return (
    <MediaPlayer
      key={src}
      className={cn(
        'border-border/60 from-card/80 to-background/90 relative flex w-full max-w-xl flex-col items-center justify-center overflow-hidden rounded-2xl border bg-gradient-to-b p-8 shadow-2xl backdrop-blur-md',
        className
      )}
    >
      <MediaPlayerAudio src={src} preload='metadata' />
      <div className='bg-primary/10 text-primary ring-primary/20 mb-6 flex size-28 items-center justify-center rounded-3xl shadow-inner ring-1'>
        <Music className='size-14 animate-pulse' />
      </div>
      {title && (
        <h4 className='text-foreground mb-4 max-w-md truncate text-center text-base font-semibold'>
          {title}
        </h4>
      )}
      <MediaPlayerLoading />
      <MediaPlayerError />
      <MediaPlayerVolumeIndicator />
      <div className='flex w-full flex-col gap-3'>
        <MediaPlayerSeek />
        <div className='flex w-full items-center justify-between gap-2 pt-1'>
          <div className='flex items-center gap-1 sm:gap-2'>
            <MediaPlayerPlay />
            <MediaPlayerSeekBackward />
            <MediaPlayerSeekForward />
            <MediaPlayerVolume />
            <MediaPlayerTime />
          </div>
          <div className='flex items-center gap-1'>
            <MediaPlayerPlaybackSpeed />
          </div>
        </div>
      </div>
    </MediaPlayer>
  )
}

export function ImagePreviewViewer({
  src,
  alt,
  className,
}: {
  src: string
  alt?: string
  className?: string
}) {
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [isCheckerboard, setIsCheckerboard] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const dragStartRef = useRef({ x: 0, y: 0 })

  const handleZoomIn = () =>
    setScale((s) => Math.min(Number((s + 0.25).toFixed(2)), 4))
  const handleZoomOut = () =>
    setScale((s) => Math.max(Number((s - 0.25).toFixed(2)), 0.25))
  const handleReset = () => {
    setScale(1)
    setRotation(0)
    setPosition({ x: 0, y: 0 })
  }
  const handleRotate = () => setRotation((r) => (r + 90) % 360)

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (scale <= 1) return
    setIsDragging(true)
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    }
  }

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return
    setPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    })
  }

  const handleMouseUp = () => setIsDragging(false)

  return (
    <div
      className={cn(
        'relative flex size-full max-h-[min(650px,72dvh)] min-h-[360px] items-center justify-center overflow-hidden rounded-xl select-none',
        isCheckerboard
          ? 'bg-neutral-900 bg-[linear-gradient(45deg,#262626_25%,transparent_25%),linear-gradient(-45deg,#262626_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#262626_75%),linear-gradient(-45deg,transparent_75%,#262626_75%)] bg-[size:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0px]'
          : 'bg-black/50',
        scale > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-default',
        className
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDoubleClick={handleReset}
    >
      <div
        className='flex items-center justify-center transition-transform duration-150 ease-out'
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
        }}
      >
        <img
          src={src}
          alt={alt}
          className='pointer-events-none max-h-[min(580px,65dvh)] max-w-full rounded-md object-contain shadow-2xl'
          draggable={false}
          decoding='async'
        />
      </div>

      {/* Floating Toolbar */}
      <div className='absolute bottom-3 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/15 bg-black/80 px-3 py-1.5 shadow-2xl backdrop-blur-md'>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='size-7 rounded-full text-white/80 hover:bg-white/20 hover:text-white'
          onClick={handleZoomOut}
          disabled={scale <= 0.25}
          title='Zoom out'
        >
          <ZoomOut className='size-3.5' />
        </Button>
        <button
          type='button'
          onClick={handleReset}
          className='min-w-12 px-1.5 text-center text-xs font-semibold text-white/90 tabular-nums transition-colors hover:text-white'
          title='Reset zoom'
        >
          {Math.round(scale * 100)}%
        </button>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='size-7 rounded-full text-white/80 hover:bg-white/20 hover:text-white'
          onClick={handleZoomIn}
          disabled={scale >= 4}
          title='Zoom in'
        >
          <ZoomIn className='size-3.5' />
        </Button>
        <div className='mx-1 h-4 w-px bg-white/20' />
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='size-7 rounded-full text-white/80 hover:bg-white/20 hover:text-white'
          onClick={handleRotate}
          title='Rotate 90°'
        >
          <RotateCw className='size-3.5' />
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className={cn(
            'size-7 rounded-full text-white/80 hover:bg-white/20 hover:text-white',
            isCheckerboard && 'bg-white/25 text-white'
          )}
          onClick={() => setIsCheckerboard((c) => !c)}
          title='Toggle transparency pattern'
        >
          <Grid className='size-3.5' />
        </Button>
      </div>
    </div>
  )
}

export function DocumentPreviewViewer({
  file,
  url,
  className,
}: {
  file: FileSchema
  url?: string
  className?: string
}) {
  const previewUrl = url ?? file.url

  return (
    <div
      className={cn(
        'border-border/80 bg-muted/20 flex size-full min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed p-8 text-center',
        className
      )}
    >
      <div className='bg-primary/10 text-primary ring-primary/20 mb-4 flex size-20 items-center justify-center rounded-2xl shadow-sm ring-1'>
        <FileText className='size-10' />
      </div>
      <h4 className='text-foreground mb-1 max-w-md truncate text-base font-semibold'>
        {file.original_name}
      </h4>
      <p className='text-muted-foreground mb-6 text-xs tracking-wider uppercase'>
        {file.mime} • {formatBytes(file.size)}
      </p>
      <div className='flex items-center gap-3'>
        <Button size='sm' asChild>
          <a href={previewUrl} download={file.original_name}>
            <Download className='mr-1.5 size-4' />
            Download file
          </a>
        </Button>
        <Button size='sm' variant='outline' asChild>
          <a href={previewUrl} target='_blank' rel='noreferrer'>
            <ExternalLink className='mr-1.5 size-4' />
            Open in browser
          </a>
        </Button>
      </div>
    </div>
  )
}

export function getImageThumbnailUrl(
  file: FileSchema,
  transformations = 'w_360,h_225,c_fill,q_75'
): string {
  if (file.resource_type !== 'image') return file.url

  const ext = getFileExtension(file.original_name || file.url).toLowerCase()
  if (['svg', 'gif', 'ico'].includes(ext)) {
    return file.url
  }

  const targetPrefix = `/storage/uploads/${file.resource_type}/`
  if (file.url.includes(targetPrefix)) {
    return file.url.replace(targetPrefix, `${targetPrefix}${transformations}/`)
  }

  return file.url
}

function VideoThumbnail({
  file,
  className,
  hoverToPlay = true,
}: {
  file: FileSchema
  className?: string
  hoverToPlay?: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const handleMouseEnter = () => {
    if (!hoverToPlay) return
    hoverTimeoutRef.current = setTimeout(() => {
      if (videoRef.current) {
        videoRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => {
            // Autoplay could be prevented by browser policy
          })
      }
    }, 150)
  }

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0.5
      setIsPlaying(false)
    }
  }

  return (
    <div
      className={cn(
        'group/video relative size-full overflow-hidden',
        className
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <video
        ref={videoRef}
        src={`${file.url}#t=0.5`}
        className='size-full object-cover'
        muted
        loop
        playsInline
        preload='metadata'
      />
      <span
        className={cn(
          'absolute right-1.5 bottom-1.5 flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium shadow-sm transition-all',
          isPlaying
            ? 'bg-primary text-primary-foreground animate-pulse'
            : 'bg-background/85 text-foreground backdrop-blur-xs'
        )}
      >
        <VideoIcon className='size-3' />
        {isPlaying && (
          <span className='text-[10px] font-semibold'>Playing</span>
        )}
      </span>
    </div>
  )
}

export function FilePreviewThumbnail({
  file,
  className,
  transformations = 'w_360,h_225,c_fill,q_75',
  useOriginal = false,
  hoverToPlay = true,
}: {
  file: FileSchema
  className?: string
  transformations?: string
  useOriginal?: boolean
  hoverToPlay?: boolean
}) {
  if (isPreviewableVideo(file)) {
    return (
      <VideoThumbnail
        file={file}
        className={className}
        hoverToPlay={hoverToPlay}
      />
    )
  }

  if (isPreviewableImage(file)) {
    const imageUrl = useOriginal
      ? file.url
      : getImageThumbnailUrl(file, transformations)

    return (
      <img
        src={imageUrl}
        alt={file.original_name}
        className={cn('size-full object-cover', className)}
        loading='lazy'
        decoding='async'
        onError={(e) => {
          if (e.currentTarget.src !== file.url) {
            e.currentTarget.src = file.url
          }
        }}
      />
    )
  }

  if (isPreviewableAudio(file)) {
    return (
      <div
        className={cn(
          'bg-muted/50 text-muted-foreground relative flex size-full items-center justify-center',
          className
        )}
      >
        <Music className='text-primary/80 size-6' />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'text-muted-foreground flex size-full items-center justify-center',
        className
      )}
    >
      <FileIcon className='size-5' />
    </div>
  )
}

export function FilePreviewDetail({
  file,
  url,
  className,
}: {
  file: FileSchema
  url?: string
  className?: string
}) {
  const previewUrl = url ?? file.url

  if (isPreviewableVideo(file)) {
    return <VideoMediaPlayer src={previewUrl} className={className} />
  }

  if (isPreviewableAudio(file)) {
    return (
      <AudioMediaPlayer
        src={previewUrl}
        title={file.original_name}
        className={className}
      />
    )
  }

  if (isPreviewableImage(file)) {
    return (
      <ImagePreviewViewer
        src={previewUrl}
        alt={file.original_name}
        className={className}
      />
    )
  }

  return (
    <DocumentPreviewViewer file={file} url={previewUrl} className={className} />
  )
}

function getFileExtension(value: string) {
  return value.split('?')[0]?.split('.').pop()?.toLowerCase() ?? ''
}
