import { FileIcon, VideoIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
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

const videoExtensions = ['m4v', 'mov', 'mp4', 'mpeg', 'ogv', 'webm']

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

export function FilePreviewThumbnail({
  file,
  className,
}: {
  file: FileSchema
  className?: string
}) {
  const previewUrl = useAuthenticatedFileUrl(file.url)

  if (isPreviewableVideo(file)) {
    return (
      <div className={cn('relative size-full overflow-hidden', className)}>
        <video
          src={previewUrl}
          className='size-full object-cover'
          muted
          playsInline
          preload='metadata'
        />
        <span className='bg-background/85 text-foreground absolute right-1 bottom-1 flex size-5 items-center justify-center rounded shadow-sm'>
          <VideoIcon className='size-3' />
        </span>
      </div>
    )
  }

  if (isPreviewableImage(file)) {
    return (
      <img
        src={previewUrl}
        alt={file.original_name}
        className={cn('size-full object-cover', className)}
        loading='lazy'
      />
    )
  }

  return <FileIcon className='text-muted-foreground size-5' />
}

export function FilePreviewDetail({
  file,
  url,
}: {
  file: FileSchema
  url?: string
}) {
  const previewUrl = useAuthenticatedFileUrl(url ?? file.url)

  if (isPreviewableVideo(file)) {
    return (
      <video
        src={previewUrl}
        className='max-h-[min(520px,60dvh)] max-w-full rounded object-contain'
        controls
        playsInline
        preload='metadata'
      />
    )
  }

  if (isPreviewableImage(file)) {
    return (
      <img
        src={previewUrl}
        alt={file.original_name}
        className='max-h-[min(520px,60dvh)] max-w-full rounded object-contain'
      />
    )
  }

  return <FileIcon className='text-muted-foreground size-12' />
}

function getFileExtension(value: string) {
  return value.split('?')[0]?.split('.').pop()?.toLowerCase() ?? ''
}

export function getAuthenticatedFileUrl(url: string, token?: string) {
  void token
  return url
}

function useAuthenticatedFileUrl(url: string) {
  return getAuthenticatedFileUrl(url)
}
