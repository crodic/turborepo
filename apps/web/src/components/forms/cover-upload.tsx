/* eslint-disable @next/next/no-img-element */
'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CloudUpload,
  ImageIcon,
  Move,
  TriangleAlert,
  Upload,
  XIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFileUpload, type FileWithPreview } from '@/hooks/use-file-upload'
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertIcon,
  AlertTitle,
} from '@/components/radix-ui/alert'
import { Button } from '@/components/radix-ui/button'

/* eslint-disable @next/next/no-img-element */

/* eslint-disable @next/next/no-img-element */

/* eslint-disable @next/next/no-img-element */

/* eslint-disable @next/next/no-img-element */

/* eslint-disable @next/next/no-img-element */

/* eslint-disable @next/next/no-img-element */

/* eslint-disable @next/next/no-img-element */

type CoverPosition = {
  x: number
  y: number
}

export interface CoverUploadProps {
  maxSize?: number
  accept?: string
  className?: string
  value?: File | null
  defaultUri?: string
  onChange?: (value: File | null) => void
  disabled?: boolean
  name?: string
}

const DEFAULT_POSITION: CoverPosition = { x: 50, y: 50 }
const COVER_ASPECT_RATIO = 21 / 9
const OUTPUT_WIDTH = 1200
const OUTPUT_HEIGHT = Math.round(OUTPUT_WIDTH / COVER_ASPECT_RATIO)

function clampPosition(value: number) {
  return Math.min(100, Math.max(0, value))
}

function normalizePosition(position: Partial<CoverPosition>) {
  return {
    x: clampPosition(position.x ?? DEFAULT_POSITION.x),
    y: clampPosition(position.y ?? DEFAULT_POSITION.y),
  }
}

function createObjectUrl(file: File) {
  return URL.createObjectURL(file)
}

async function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not load image'))
    image.src = url
  })
}

async function cropCoverFile(file: File, position: CoverPosition) {
  const url = createObjectUrl(file)

  try {
    const image = await loadImage(url)
    const sourceWidth = image.naturalWidth
    const sourceHeight = image.naturalHeight
    const sourceAspectRatio = sourceWidth / sourceHeight

    let cropX = 0
    let cropY = 0
    let cropWidth = sourceWidth
    let cropHeight = sourceHeight

    if (sourceAspectRatio > COVER_ASPECT_RATIO) {
      cropWidth = sourceHeight * COVER_ASPECT_RATIO
    } else if (sourceAspectRatio < COVER_ASPECT_RATIO) {
      cropHeight = sourceWidth / COVER_ASPECT_RATIO
    }

    cropX = (sourceWidth - cropWidth) * (position.x / 100)
    cropY = (sourceHeight - cropHeight) * (position.y / 100)

    const canvas = document.createElement('canvas')
    canvas.width = OUTPUT_WIDTH
    canvas.height = OUTPUT_HEIGHT

    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Canvas is not supported')
    }

    context.drawImage(
      image,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      OUTPUT_WIDTH,
      OUTPUT_HEIGHT
    )

    const mimeType = file.type || 'image/jpeg'
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (nextBlob) => {
          if (nextBlob) {
            resolve(nextBlob)
          } else {
            reject(new Error('Could not crop image'))
          }
        },
        mimeType,
        0.92
      )
    })

    return new File([blob], file.name, {
      type: mimeType,
      lastModified: Date.now(),
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

export default function CoverUpload({
  maxSize = 5 * 1024 * 1024,
  accept = 'image/*',
  className,
  value,
  defaultUri,
  onChange,
  disabled = false,
  name,
}: CoverUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [position, setPosition] = useState<CoverPosition>(DEFAULT_POSITION)
  const [imageLoading, setImageLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [isCropping, setIsCropping] = useState(false)
  const [isCleared, setIsCleared] = useState(false)
  const [isRepositioning, setIsRepositioning] = useState(false)
  const [canReposition, setCanReposition] = useState(false)
  const [cropError, setCropError] = useState<string | null>(null)
  const sourceFileRef = useRef<File | null>(null)
  const emittedCroppedFileRef = useRef<File | null>(null)
  const previewObjectUrlRef = useRef<string | null>(null)
  const positionRef = useRef<CoverPosition>(DEFAULT_POSITION)
  const dragStateRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    startPosition: CoverPosition
  } | null>(null)

  const setPreviewFromFile = useCallback((file: File) => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current)
    }

    const url = createObjectUrl(file)
    previewObjectUrlRef.current = url
    setPreviewUrl(url)
  }, [])

  useEffect(() => {
    return () => {
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!value) {
      sourceFileRef.current = null
      emittedCroppedFileRef.current = null
      positionRef.current = DEFAULT_POSITION

      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current)
        previewObjectUrlRef.current = null
      }

      setPreviewUrl(!isCleared ? (defaultUri ?? null) : null)
      setPosition(DEFAULT_POSITION)
      setCanReposition(false)
      return
    }

    if (value === emittedCroppedFileRef.current) {
      return
    }

    sourceFileRef.current = value
    setPreviewFromFile(value)
    setImageLoading(true)
    setIsCleared(false)
    setCanReposition(true)
    setPosition(DEFAULT_POSITION)
    positionRef.current = DEFAULT_POSITION
  }, [defaultUri, isCleared, setPreviewFromFile, value])

  const hasImage = Boolean(previewUrl)

  const updatePosition = useCallback((nextPosition: CoverPosition) => {
    const normalizedPosition = normalizePosition(nextPosition)
    positionRef.current = normalizedPosition
    setPosition(normalizedPosition)
  }, [])

  const simulateUpload = useCallback(() => {
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsUploading(false)
          return 100
        }

        return Math.min(prev + Math.random() * 10 + 5, 100)
      })
    }, 200)
  }, [])

  const handleFilesAdded = useCallback(
    (addedFiles: FileWithPreview[]) => {
      if (disabled) return

      const nextFile = addedFiles[0]?.file
      if (!(nextFile instanceof File)) return

      sourceFileRef.current = nextFile
      emittedCroppedFileRef.current = null
      setPreviewFromFile(nextFile)
      updatePosition(DEFAULT_POSITION)
      setImageLoading(true)
      setIsUploading(true)
      setUploadProgress(0)
      setIsCleared(false)
      setCanReposition(true)
      setCropError(null)
      onChange?.(nextFile)
      simulateUpload()
    },
    [disabled, onChange, setPreviewFromFile, simulateUpload, updatePosition]
  )

  const [
    { isDragging, errors },
    {
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog,
      getInputProps,
    },
  ] = useFileUpload({
    maxFiles: 1,
    maxSize,
    accept,
    multiple: false,
    onFilesAdded: handleFilesAdded,
  })

  const handleOpenFileDialog = useCallback(() => {
    if (!disabled) {
      openFileDialog()
    }
  }, [disabled, openFileDialog])

  const removeCoverImage = useCallback(() => {
    if (disabled) return

    sourceFileRef.current = null
    emittedCroppedFileRef.current = null
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current)
      previewObjectUrlRef.current = null
    }
    updatePosition(DEFAULT_POSITION)
    setImageLoading(false)
    setIsUploading(false)
    setIsCropping(false)
    setUploadProgress(0)
    setIsCleared(true)
    setCanReposition(false)
    setPreviewUrl(null)
    setCropError(null)
    onChange?.(null)
  }, [disabled, onChange, updatePosition])

  const commitCrop = useCallback(async () => {
    const sourceFile = sourceFileRef.current
    if (!sourceFile) return

    setIsCropping(true)
    setCropError(null)

    try {
      const croppedFile = await cropCoverFile(sourceFile, positionRef.current)
      emittedCroppedFileRef.current = croppedFile
      onChange?.(croppedFile)
    } catch (error) {
      console.error(error)
      setCropError('Could not crop cover image')
    } finally {
      setIsCropping(false)
    }
  }, [onChange])

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (disabled || !hasImage || !sourceFileRef.current) return

      event.currentTarget.setPointerCapture(event.pointerId)
      dragStateRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startPosition: positionRef.current,
      }
      setIsRepositioning(true)
    },
    [disabled, hasImage]
  )

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const dragState = dragStateRef.current
      if (!dragState || dragState.pointerId !== event.pointerId) return

      const rect = event.currentTarget.getBoundingClientRect()
      updatePosition({
        x:
          dragState.startPosition.x +
          ((event.clientX - dragState.startX) / rect.width) * 100,
        y:
          dragState.startPosition.y +
          ((event.clientY - dragState.startY) / rect.height) * 100,
      })
    },
    [updatePosition]
  )

  const stopRepositioning = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const dragState = dragStateRef.current
      if (dragState?.pointerId !== event.pointerId) return

      dragStateRef.current = null
      setIsRepositioning(false)
      commitCrop()
    },
    [commitCrop]
  )

  const displaySize = useMemo(() => {
    return `${(maxSize / 1024 / 1024).toFixed(0)}MB`
  }, [maxSize])

  return (
    <div className={cn('w-full space-y-4', className)}>
      <div
        className={cn(
          'group border-border relative overflow-hidden rounded-xl border transition-all duration-200',
          disabled && 'cursor-not-allowed opacity-50',
          isDragging && !disabled
            ? 'border-primary bg-primary/5 border-dashed'
            : hasImage
              ? 'border-border bg-background hover:border-primary/50'
              : 'border-muted-foreground/25 bg-muted/30 hover:border-primary hover:bg-primary/5 border-dashed',
          disabled && 'hover:border-muted-foreground/25 hover:bg-muted/30'
        )}
        onDragEnter={disabled ? undefined : handleDragEnter}
        onDragLeave={disabled ? undefined : handleDragLeave}
        onDragOver={disabled ? undefined : handleDragOver}
        onDrop={disabled ? undefined : handleDrop}
      >
        <input {...getInputProps({ disabled, name })} className='sr-only' />

        {hasImage ? (
          <div
            className={cn(
              'relative aspect-21/9 w-full touch-none overflow-hidden',
              !disabled && canReposition && 'cursor-move',
              isRepositioning && 'cursor-grabbing'
            )}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={stopRepositioning}
            onPointerCancel={stopRepositioning}
          >
            {imageLoading && (
              <div className='bg-muted absolute inset-0 flex animate-pulse items-center justify-center'>
                <div className='text-muted-foreground flex flex-col items-center gap-2'>
                  <ImageIcon className='size-5' />
                  <span className='text-sm'>Loading image...</span>
                </div>
              </div>
            )}

            <img
              src={previewUrl || '/placeholder.svg'}
              alt='Cover'
              className={cn(
                'h-full w-full object-cover transition-opacity duration-300 select-none',
                imageLoading ? 'opacity-0' : 'opacity-100'
              )}
              draggable={false}
              style={{
                objectPosition: `${position.x}% ${position.y}%`,
              }}
              onLoad={() => setImageLoading(false)}
              onError={() => setImageLoading(false)}
            />

            {!disabled && (
              <div className='pointer-events-none absolute inset-0 bg-black/0 transition-all duration-200 group-hover:bg-black/35' />
            )}

            {!disabled && canReposition && (
              <div className='pointer-events-none absolute start-3 bottom-3 flex items-center gap-1 rounded-full bg-black/65 px-2.5 py-1 text-xs font-medium text-white opacity-100 shadow-sm select-none sm:opacity-0 sm:group-hover:opacity-100'>
                <Move className='size-3.5' />
                Drag to crop
              </div>
            )}

            {!disabled && !isRepositioning && (
              <div className='pointer-events-none absolute inset-x-3 top-3 flex justify-end opacity-100 transition-opacity duration-200 sm:inset-0 sm:items-center sm:justify-center sm:opacity-0 sm:group-hover:opacity-100'>
                <div className='flex gap-2'>
                  <Button
                    type='button'
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={handleOpenFileDialog}
                    variant='secondary'
                    size='sm'
                    className='pointer-events-auto bg-white/90 text-gray-900 hover:bg-white'
                  >
                    <Upload />
                    <span className='hidden sm:inline'>Change Cover</span>
                  </Button>
                  <Button
                    type='button'
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={removeCoverImage}
                    variant='destructive'
                    size='sm'
                    className='pointer-events-auto'
                  >
                    <XIcon />
                    <span className='hidden sm:inline'>Remove</span>
                  </Button>
                </div>
              </div>
            )}

            {(isUploading || isCropping) && (
              <div className='absolute inset-0 flex items-center justify-center bg-black/40'>
                <div className='relative'>
                  <svg className='size-16 -rotate-90' viewBox='0 0 64 64'>
                    <circle
                      cx='32'
                      cy='32'
                      r='28'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='4'
                      className='text-white/20'
                    />
                    <circle
                      cx='32'
                      cy='32'
                      r='28'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='4'
                      strokeDasharray={`${2 * Math.PI * 28}`}
                      strokeDashoffset={`${2 * Math.PI * 28 * (1 - uploadProgress / 100)}`}
                      className='text-white transition-all duration-300'
                      strokeLinecap='round'
                    />
                  </svg>
                  <div className='absolute inset-0 flex items-center justify-center'>
                    <span className='text-sm font-medium text-white select-none'>
                      {isCropping ? 'Crop' : `${Math.round(uploadProgress)}%`}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            role='button'
            tabIndex={disabled ? -1 : 0}
            aria-disabled={disabled}
            className={cn(
              'flex aspect-21/9 w-full flex-col items-center justify-center gap-4 p-8 text-center',
              !disabled && 'cursor-pointer',
              disabled && 'cursor-not-allowed'
            )}
            onClick={handleOpenFileDialog}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                handleOpenFileDialog()
              }
            }}
          >
            <div className='bg-primary/10 rounded-full p-4'>
              <CloudUpload className='text-primary size-8' />
            </div>

            <div className='space-y-2'>
              <h3 className='text-lg font-semibold'>Upload Cover Image</h3>
              <p className='text-muted-foreground text-sm'>
                {disabled
                  ? 'Upload is disabled'
                  : 'Drag and drop an image here, or click to browse'}
              </p>
              <p className='text-muted-foreground text-xs'>
                Recommended size: 1200x514px - Max size: {displaySize}
              </p>
            </div>

            {!disabled && (
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='bg-transparent'
              >
                <ImageIcon />
                Browse Files
              </Button>
            )}
          </div>
        )}
      </div>

      {errors.length > 0 && (
        <Alert variant='destructive' appearance='light' className='mt-5'>
          <AlertIcon>
            <TriangleAlert />
          </AlertIcon>
          <AlertContent>
            <AlertTitle>File upload error(s)</AlertTitle>
            <AlertDescription>
              {errors.map((error, index) => (
                <p key={index} className='last:mb-0'>
                  {error}
                </p>
              ))}
            </AlertDescription>
          </AlertContent>
        </Alert>
      )}

      {cropError && (
        <Alert variant='destructive' appearance='light' className='mt-5'>
          <AlertIcon>
            <TriangleAlert />
          </AlertIcon>
          <AlertContent>
            <AlertTitle>Crop failed</AlertTitle>
            <AlertDescription>{cropError}</AlertDescription>
          </AlertContent>
        </Alert>
      )}

      <div className='bg-muted/50 rounded-lg p-4'>
        <h4 className='mb-2 text-sm font-medium'>Cover Image Guidelines</h4>
        <ul className='text-muted-foreground space-y-1 text-xs'>
          <li>Use high-quality images with good lighting and composition</li>
          <li>Recommended aspect ratio: 21:9 for best results</li>
          <li>Drag the image inside the frame to crop before submit</li>
          <li>Supported formats: JPG, PNG, WebP</li>
        </ul>
      </div>
    </div>
  )
}
