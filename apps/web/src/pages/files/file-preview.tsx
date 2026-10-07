import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import {
  Check,
  Code2,
  Copy,
  Download,
  ExternalLink,
  FileIcon,
  FileSpreadsheet,
  FileText,
  Grid,
  Loader2,
  Music,
  RotateCw,
  Table as TableIcon,
  VideoIcon,
  WrapText,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import http from '@/lib/http'
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

export const textExtensions = [
  'txt',
  'md',
  'markdown',
  'json',
  'csv',
  'tsv',
  'xml',
  'html',
  'htm',
  'css',
  'js',
  'ts',
  'jsx',
  'tsx',
  'sql',
  'log',
  'env',
  'yml',
  'yaml',
  'sh',
  'bash',
  'ini',
  'conf',
  'py',
  'java',
  'c',
  'cpp',
  'go',
  'rs',
  'php',
]

export function isTextDocument(file: FileSchema, ext?: string): boolean {
  const fileExt =
    ext ?? getFileExtension(file.original_name || file.url).toLowerCase()
  return (
    textExtensions.includes(fileExt) ||
    file.mime.startsWith('text/') ||
    file.mime === 'application/json' ||
    file.mime === 'application/xml' ||
    file.mime === 'application/javascript'
  )
}

export function isDocxDocument(file: FileSchema, ext?: string): boolean {
  const fileExt =
    ext ?? getFileExtension(file.original_name || file.url).toLowerCase()
  return (
    fileExt === 'docx' ||
    file.mime ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  )
}

export function isPdfDocument(file: FileSchema, ext?: string): boolean {
  const fileExt =
    ext ?? getFileExtension(file.original_name || file.url).toLowerCase()
  return fileExt === 'pdf' || file.mime === 'application/pdf'
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

export function DocxPreviewViewer({
  file,
  url,
  className,
}: {
  file: FileSchema
  url: string
  className?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isCancelled = false
    setIsLoading(true)
    setError(null)

    async function loadDocx() {
      try {
        const response = await http.get(url, { responseType: 'blob' })
        if (isCancelled) return

        if (containerRef.current) {
          containerRef.current.innerHTML = ''
          const { renderAsync } = await import('docx-preview')
          await renderAsync(response.data, containerRef.current, undefined, {
            inWrapper: true,
            ignoreWidth: false,
            ignoreHeight: false,
            breakPages: true,
          })
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          const message =
            err instanceof Error ? err.message : 'Failed to render DOCX file'
          setError(message)
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadDocx()

    return () => {
      isCancelled = true
    }
  }, [url])

  return (
    <div
      className={cn(
        'bg-muted/10 relative flex size-full min-h-[520px] flex-col overflow-hidden rounded-xl border',
        className
      )}
    >
      <div className='bg-muted/40 flex items-center justify-between border-b px-4 py-2 text-xs'>
        <div className='flex max-w-sm items-center gap-2 truncate'>
          <FileText className='size-4 text-blue-500' />
          <span className='text-foreground truncate font-medium'>
            {file.original_name}
          </span>
          <span className='rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400'>
            DOCX
          </span>
        </div>
        <div className='flex items-center gap-2'>
          <Button
            size='sm'
            variant='outline'
            className='h-7 gap-1 text-xs'
            asChild
          >
            <a href={url} download={file.original_name}>
              <Download className='size-3.5' />
              Download
            </a>
          </Button>
          <Button
            size='sm'
            variant='ghost'
            className='h-7 gap-1 text-xs'
            asChild
          >
            <a href={url} target='_blank' rel='noreferrer'>
              <ExternalLink className='size-3.5' />
              Open tab
            </a>
          </Button>
        </div>
      </div>

      <div className='relative flex-1 overflow-auto bg-neutral-200/50 p-4 dark:bg-neutral-900/70'>
        {isLoading && (
          <div className='text-muted-foreground flex h-80 items-center justify-center gap-2 text-sm'>
            <Loader2 className='text-primary size-5 animate-spin' />
            <span>Loading Word document...</span>
          </div>
        )}
        {error && (
          <div className='flex h-80 flex-col items-center justify-center gap-3 p-4 text-center'>
            <p className='text-destructive text-sm font-medium'>{error}</p>
            <Button size='sm' variant='outline' asChild>
              <a href={url} download={file.original_name}>
                <Download className='mr-1.5 size-3.5' />
                Download file to view locally
              </a>
            </Button>
          </div>
        )}
        <div
          ref={containerRef}
          className={cn(
            'docx-preview-wrapper mx-auto max-w-4xl rounded-sm bg-white p-6 text-black shadow-lg dark:bg-neutral-100',
            isLoading || error ? 'hidden' : 'block'
          )}
        />
      </div>
    </div>
  )
}

export function TextPreviewViewer({
  file,
  url,
  ext,
  className,
}: {
  file: FileSchema
  url: string
  ext: string
  className?: string
}) {
  const [content, setContent] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [wrapLines, setWrapLines] = useState(true)
  const [copied, setCopied] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'raw'>('table')
  const isTabular = ext === 'csv' || ext === 'tsv'

  useEffect(() => {
    let isCancelled = false
    setIsLoading(true)
    setError(null)

    async function loadText() {
      try {
        const response = await http.get<string>(url, { responseType: 'text' })
        if (isCancelled) return
        const raw =
          typeof response.data === 'string'
            ? response.data
            : JSON.stringify(response.data, null, 2)
        setContent(raw)
      } catch (err: unknown) {
        if (!isCancelled) {
          const message =
            err instanceof Error ? err.message : 'Failed to load file content'
          setError(message)
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadText()

    return () => {
      isCancelled = true
    }
  }, [url])

  const lines = useMemo(() => {
    if (!content) return []
    return content.split(/\r?\n/)
  }, [content])

  const parsedTable = useMemo(() => {
    if (!isTabular || !content) return null
    const delimiter = ext === 'tsv' ? '\t' : ','
    const rawRows = lines.filter((l) => l.trim().length > 0)
    if (rawRows.length === 0) return null

    const splitRow = (rowStr: string) => {
      const result: string[] = []
      let insideQuote = false
      let current = ''
      for (let i = 0; i < rowStr.length; i++) {
        const char = rowStr[i]
        if (char === '"' || char === "'") {
          insideQuote = !insideQuote
        } else if (char === delimiter && !insideQuote) {
          result.push(current.trim().replace(/^["']|["']$/g, ''))
          current = ''
          continue
        }
        current += char
      }
      result.push(current.trim().replace(/^["']|["']$/g, ''))
      return result
    }

    const headers = splitRow(rawRows[0])
    const rows = rawRows.slice(1, 500).map(splitRow)
    return { headers, rows, totalRows: rawRows.length - 1 }
  }, [isTabular, content, lines, ext])

  const handleCopy = async () => {
    if (!content) return
    await navigator.clipboard.writeText(content)
    setCopied(true)
    toast.success('File content copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  const formatBadge = ext.toUpperCase() || 'TXT'

  return (
    <div
      className={cn(
        'bg-muted/10 relative flex size-full min-h-[520px] flex-col overflow-hidden rounded-xl border',
        className
      )}
    >
      <div className='bg-muted/40 flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2 text-xs'>
        <div className='flex max-w-sm items-center gap-2 truncate'>
          {isTabular ? (
            <FileSpreadsheet className='size-4 text-emerald-500' />
          ) : (
            <Code2 className='size-4 text-amber-500' />
          )}
          <span className='text-foreground truncate font-medium'>
            {file.original_name}
          </span>
          <span className='bg-muted text-foreground/80 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold'>
            {formatBadge}
          </span>
          {content !== null && (
            <span className='text-muted-foreground hidden text-[11px] sm:inline'>
              {lines.length} lines
            </span>
          )}
        </div>

        <div className='flex items-center gap-1.5'>
          {isTabular && (
            <div className='bg-muted/70 border-border/60 flex rounded-md border p-0.5'>
              <Button
                type='button'
                variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                size='sm'
                className='h-6 gap-1 px-2 text-[11px]'
                onClick={() => setViewMode('table')}
              >
                <TableIcon className='size-3' />
                Table
              </Button>
              <Button
                type='button'
                variant={viewMode === 'raw' ? 'secondary' : 'ghost'}
                size='sm'
                className='h-6 gap-1 px-2 text-[11px]'
                onClick={() => setViewMode('raw')}
              >
                <Code2 className='size-3' />
                Raw
              </Button>
            </div>
          )}

          {(!isTabular || viewMode === 'raw') && (
            <Button
              type='button'
              size='sm'
              variant={wrapLines ? 'secondary' : 'outline'}
              className='h-7 gap-1 px-2 text-xs'
              onClick={() => setWrapLines((w) => !w)}
              title='Toggle wrap lines'
            >
              <WrapText className='size-3.5' />
              <span className='hidden sm:inline'>Wrap</span>
            </Button>
          )}

          <Button
            type='button'
            size='sm'
            variant='outline'
            className='h-7 gap-1 px-2 text-xs'
            onClick={handleCopy}
            disabled={!content}
            title='Copy all content'
          >
            {copied ? (
              <Check className='size-3.5 text-emerald-500' />
            ) : (
              <Copy className='size-3.5' />
            )}
            <span className='hidden sm:inline'>Copy</span>
          </Button>

          <Button
            size='sm'
            variant='outline'
            className='h-7 gap-1 px-2 text-xs'
            asChild
          >
            <a href={url} download={file.original_name}>
              <Download className='size-3.5' />
              <span className='hidden sm:inline'>Download</span>
            </a>
          </Button>

          <Button
            size='sm'
            variant='ghost'
            className='h-7 gap-1 px-2 text-xs'
            asChild
          >
            <a href={url} target='_blank' rel='noreferrer'>
              <ExternalLink className='size-3.5' />
            </a>
          </Button>
        </div>
      </div>

      <div className='bg-card/50 relative flex-1 overflow-auto'>
        {isLoading && (
          <div className='text-muted-foreground flex h-80 items-center justify-center gap-2 text-sm'>
            <Loader2 className='text-primary size-5 animate-spin' />
            <span>Loading content...</span>
          </div>
        )}
        {error && (
          <div className='flex h-80 flex-col items-center justify-center gap-3 p-4 text-center'>
            <p className='text-destructive text-sm font-medium'>{error}</p>
            <Button size='sm' variant='outline' asChild>
              <a href={url} download={file.original_name}>
                <Download className='mr-1.5 size-3.5' />
                Download file to view locally
              </a>
            </Button>
          </div>
        )}

        {content !== null &&
          isTabular &&
          viewMode === 'table' &&
          parsedTable && (
            <div className='size-full overflow-auto p-2'>
              <div className='border-border/80 overflow-hidden rounded-lg border'>
                <table className='w-full text-left text-xs'>
                  <thead className='bg-muted/70 text-muted-foreground sticky top-0 border-b font-semibold'>
                    <tr>
                      <th className='text-muted-foreground/60 w-12 px-2.5 py-2 text-center'>
                        #
                      </th>
                      {parsedTable.headers.map((h, i) => (
                        <th
                          key={i}
                          className='border-r px-3 py-2 whitespace-nowrap last:border-r-0'
                        >
                          {h || `Col ${i + 1}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className='divide-border/60 bg-card divide-y font-mono'>
                    {parsedTable.rows.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        className='hover:bg-muted/40 transition-colors'
                      >
                        <td className='text-muted-foreground/60 px-2.5 py-1.5 text-center text-[10px] select-none'>
                          {rIdx + 1}
                        </td>
                        {parsedTable.headers.map((_, cIdx) => (
                          <td
                            key={cIdx}
                            className='text-foreground border-r px-3 py-1.5 whitespace-nowrap last:border-r-0'
                          >
                            {row[cIdx] ?? ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedTable.totalRows > 500 && (
                <p className='text-muted-foreground mt-2 text-center text-[11px]'>
                  Showing first 500 of {parsedTable.totalRows} rows
                </p>
              )}
            </div>
          )}

        {content !== null && (!isTabular || viewMode === 'raw') && (
          <div className='flex min-h-full font-mono text-xs'>
            <div className='bg-muted/30 border-border/50 text-muted-foreground/50 border-r py-3 pr-3 pl-2.5 text-right select-none'>
              {lines.map((_, i) => (
                <div key={i} className='leading-5'>
                  {i + 1}
                </div>
              ))}
            </div>

            <pre
              className={cn(
                'text-foreground flex-1 p-3 font-mono leading-5',
                wrapLines
                  ? 'break-words whitespace-pre-wrap'
                  : 'overflow-x-auto whitespace-pre'
              )}
            >
              <code>{content}</code>
            </pre>
          </div>
        )}
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
  const { t } = useTranslation()
  const previewUrl = url ?? file.url
  const ext = getFileExtension(file.original_name || file.url).toLowerCase()

  if (isPdfDocument(file, ext)) {
    return (
      <div
        className={cn(
          'bg-muted/10 relative flex size-full min-h-[500px] flex-col overflow-hidden rounded-xl border',
          className
        )}
      >
        <div className='bg-muted/40 flex items-center justify-between border-b px-4 py-2 text-xs'>
          <span className='text-foreground max-w-sm truncate font-medium'>
            {file.original_name}
          </span>
          <div className='flex items-center gap-2'>
            <Button
              size='sm'
              variant='outline'
              className='h-7 gap-1 text-xs'
              asChild
            >
              <a href={previewUrl} download={file.original_name}>
                <Download className='size-3.5' />
                Download
              </a>
            </Button>
            <Button
              size='sm'
              variant='ghost'
              className='h-7 gap-1 text-xs'
              asChild
            >
              <a href={previewUrl} target='_blank' rel='noreferrer'>
                <ExternalLink className='size-3.5' />
                Open tab
              </a>
            </Button>
          </div>
        </div>
        <iframe
          src={`${previewUrl}#toolbar=1`}
          className='size-full min-h-[500px] flex-1 border-0'
          title={file.original_name}
        />
      </div>
    )
  }

  if (isDocxDocument(file, ext)) {
    return (
      <DocxPreviewViewer file={file} url={previewUrl} className={className} />
    )
  }

  const isLegacyDoc = ext === 'doc' || file.mime === 'application/msword'
  if (isLegacyDoc) {
    return (
      <div
        className={cn(
          'border-border/80 bg-muted/20 flex size-full min-h-[380px] flex-col items-center justify-center rounded-2xl border border-dashed p-8 text-center',
          className
        )}
      >
        <div className='mb-4 flex size-20 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 shadow-sm ring-1 ring-amber-500/20 dark:text-amber-400'>
          <FileText className='size-10' />
        </div>
        <div className='mb-2 flex items-center gap-2'>
          <h4 className='text-foreground max-w-md truncate text-base font-semibold'>
            {file.original_name}
          </h4>
          <span className='rounded bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400'>
            Word 97-2003 (.doc)
          </span>
        </div>
        <div className='mb-6 max-w-md rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-left text-xs leading-relaxed text-amber-800 dark:text-amber-200'>
          <p className='mb-1 font-semibold'>
            {t(
              'files.preview.docNotSupportedTitle',
              'Định dạng Word cũ (.doc) không hỗ trợ xem trước trực tiếp'
            )}
          </p>
          <p className='text-muted-foreground dark:text-amber-200/80'>
            {t(
              'files.preview.docNotSupportedDesc',
              'Trình xem trước trên trình duyệt chỉ hỗ trợ định dạng Word hiện đại (.docx). Vui lòng tải về để mở trong Microsoft Word hoặc lưu lại sang định dạng .docx.'
            )}
          </p>
        </div>
        <div className='flex items-center gap-3'>
          <Button size='sm' asChild>
            <a href={previewUrl} download={file.original_name}>
              <Download className='mr-1.5 size-4' />
              {t('files.actions.download', 'Download')}
            </a>
          </Button>
          <Button size='sm' variant='outline' asChild>
            <a href={previewUrl} target='_blank' rel='noreferrer'>
              <ExternalLink className='mr-1.5 size-4' />
              {t('files.actions.open', 'Open file')}
            </a>
          </Button>
        </div>
      </div>
    )
  }

  if (isTextDocument(file, ext)) {
    return (
      <TextPreviewViewer
        file={file}
        url={previewUrl}
        ext={ext}
        className={className}
      />
    )
  }

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
