'use client'

import React from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  type DragStartEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import {
  ChevronLeft,
  ChevronRight,
  CircleX,
  CloudUpload,
  GripVertical,
  ImageIcon,
  Plus,
  Star,
  TriangleAlert,
  XIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Sortable,
  SortableContent,
  SortableItem,
  SortableOverlay,
} from '@/components/ui/sortable'
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertIcon,
  AlertTitle,
} from '@/components/radix-ui/alert'
import { Button } from '@/components/radix-ui/button'
import { Card, CardContent } from '@/components/radix-ui/card'
import { Progress } from '@/components/radix-ui/progress'
import type { ExistingImage, ImagePayload, UIImage } from './types'

// Upload progress tracking (UI-only, not part of form state)
interface UploadProgress {
  tempId: string
  fileName: string
  fileSize: number
  progress: number
  status: 'uploading' | 'completed' | 'error'
  error?: string
}

type OverlaySize = {
  width: number
  height: number
}

export interface SortableImageUploadProps {
  // Existing images from server (initial data for edit flow)
  existingImages?: ExistingImage[]
  // Controlled form value
  value?: ImagePayload[]
  // Callback when form value changes
  onChange?: (value: ImagePayload[]) => void
  // Configuration
  maxFiles?: number
  maxSize?: number
  accept?: string
  className?: string
  gridClassName?: string
  disabled?: boolean
  loading?: boolean
  coverIndex?: number | null
  onCoverIndexChange?: (index: number | null) => void
}

export default function SortableImageUpload({
  existingImages = [],
  value,
  onChange,
  maxFiles = 5,
  maxSize = 10 * 1024 * 1024, // 10MB
  accept = 'image/*',
  className,
  gridClassName,
  disabled = false,
  loading = false,
  coverIndex,
  onCoverIndexChange,
}: SortableImageUploadProps) {
  // UI state for display and drag/drop - contains ALL visible images
  const [uiImages, setUiImages] = useState<UIImage[]>([])

  // Track upload progress (UI-only state)
  const [uploadProgress, setUploadProgress] = useState<
    Map<string, UploadProgress>
  >(new Map())

  // Drag state for drop zone styling
  const [isDragging, setIsDragging] = useState(false)

  // Validation errors (UI-only)
  const [errors, setErrors] = useState<string[]>([])

  // Fullscreen image preview state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  // Keep the drag preview the same size as the grid cell being dragged.
  const [overlaySize, setOverlaySize] = useState<OverlaySize | null>(null)

  // Track files for new images (needed for preview URLs)
  const fileMapRef = useRef<Map<string, File>>(new Map())

  // Track preview URLs for cleanup
  const previewUrlsRef = useRef<Map<string, string>>(new Map())

  // Initialize UI state from props and form value
  useEffect(() => {
    const newUiImages: UIImage[] = []
    const deletedIds = new Set(
      (value ?? []).filter((p) => p.type === 'deleted').map((p) => p.id)
    )

    // Get active payloads sorted by order
    const activePayloads = (value ?? [])
      .filter(
        (p): p is ImagePayload & { type: 'existing' | 'new' } =>
          p.type === 'existing' || p.type === 'new'
      )
      .sort((a, b) => a.order - b.order)

    // Check if value only contains existing images (reset scenario)
    const hasOnlyExistingPayloads = activePayloads.every(
      (p) => p.type === 'existing'
    )
    const newPayloadsInValue = activePayloads.filter((p) => p.type === 'new')

    // Clear upload progress and file refs for items no longer in value
    if (hasOnlyExistingPayloads && activePayloads.length > 0) {
      // Form was reset - clear all new image state
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
      previewUrlsRef.current.clear()
      fileMapRef.current.clear()
      setUploadProgress(new Map())
      setErrors([])
    } else {
      // Clean up any orphaned entries not in new value
      const newTempIds = new Set(newPayloadsInValue.map((p) => p.tempId))

      // Remove orphaned preview URLs
      for (const [tempId, url] of previewUrlsRef.current.entries()) {
        if (!newTempIds.has(tempId)) {
          URL.revokeObjectURL(url)
          previewUrlsRef.current.delete(tempId)
        }
      }

      // Remove orphaned file refs
      for (const tempId of fileMapRef.current.keys()) {
        if (!newTempIds.has(tempId)) {
          fileMapRef.current.delete(tempId)
        }
      }

      // Remove orphaned upload progress entries
      setUploadProgress((prev) => {
        const updated = new Map(prev)
        for (const tempId of updated.keys()) {
          if (!newTempIds.has(tempId)) {
            updated.delete(tempId)
          }
        }
        return updated
      })
    }

    // If we have payloads with order, use that order
    if (activePayloads.length > 0) {
      for (const payload of activePayloads) {
        if (payload.type === 'existing') {
          const existing = existingImages.find((e) => e.id === payload.id)
          if (existing && !deletedIds.has(existing.id)) {
            newUiImages.push({
              id: existing.id,
              src: existing.src,
              alt: existing.alt ?? 'Image',
              source: 'existing',
            })
          }
        } else if (payload.type === 'new') {
          const file = fileMapRef.current.get(payload.tempId)
          if (file) {
            let previewUrl = previewUrlsRef.current.get(payload.tempId)
            if (!previewUrl) {
              previewUrl = URL.createObjectURL(file)
              previewUrlsRef.current.set(payload.tempId, previewUrl)
            }
            newUiImages.push({
              id: payload.tempId,
              src: previewUrl,
              alt: file.name,
              source: 'new',
              file,
            })
          }
        }
      }
    } else {
      // No payloads yet - initialize from existing images
      for (const existing of existingImages) {
        if (!deletedIds.has(existing.id)) {
          newUiImages.push({
            id: existing.id,
            src: existing.src,
            alt: existing.alt ?? 'Image',
            source: 'existing',
          })
        }
      }
    }

    setUiImages(newUiImages)
  }, [existingImages, value])

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

  // Build ImagePayload[] from current UI state and deleted items
  const buildPayload = useCallback(
    (currentUiImages: UIImage[], deletedIds: string[]): ImagePayload[] => {
      const payloads: ImagePayload[] = []

      // Add active images with their order
      currentUiImages.forEach((img, index) => {
        if (img.source === 'existing') {
          payloads.push({
            type: 'existing',
            id: img.id,
            order: index,
          })
        } else {
          const file = fileMapRef.current.get(img.id)
          if (file) {
            payloads.push({
              type: 'new',
              file,
              tempId: img.id,
              order: index,
            })
          }
        }
      })

      // Add deleted items
      for (const id of deletedIds) {
        payloads.push({
          type: 'deleted',
          id,
        })
      }

      return payloads
    },
    []
  )

  // Get current deleted IDs from form value
  const deletedIds = useMemo(
    () => (value ?? []).filter((p) => p.type === 'deleted').map((p) => p.id),
    [value]
  )

  // Validate a file before adding
  const validateFile = useCallback(
    (file: File): string | null => {
      if (!file.type.startsWith('image/')) {
        return 'File must be an image'
      }
      if (file.size > maxSize) {
        return `File size must be less than ${(maxSize / 1024 / 1024).toFixed(1)}MB`
      }
      if (uiImages.length >= maxFiles) {
        return `Maximum ${maxFiles} files allowed`
      }
      return null
    },
    [maxSize, maxFiles, uiImages.length]
  )

  // Simulate upload progress (in real app, this would be actual upload)
  const simulateUpload = useCallback((tempId: string) => {
    let progress = 0
    const interval = setInterval(() => {
      progress += Math.random() * 20
      if (progress >= 100) {
        progress = 100
        clearInterval(interval)
        setUploadProgress((prev) => {
          const updated = new Map(prev)
          const current = updated.get(tempId)
          if (current) {
            updated.set(tempId, {
              ...current,
              progress: 100,
              status: 'completed',
            })
          }
          return updated
        })
      } else {
        setUploadProgress((prev) => {
          const updated = new Map(prev)
          const current = updated.get(tempId)
          if (current) {
            updated.set(tempId, { ...current, progress })
          }
          return updated
        })
      }
    }, 100)
  }, [])

  // Add new images
  const addImages = useCallback(
    (files: FileList | File[]) => {
      const newUiImages: UIImage[] = []
      const newProgress: UploadProgress[] = []
      const newErrors: string[] = []
      const remainingSlots = maxFiles - uiImages.length

      Array.from(files)
        .slice(0, Math.max(remainingSlots, 0))
        .forEach((file) => {
          const error = validateFile(file)
          if (error) {
            newErrors.push(`${file.name}: ${error}`)
            return
          }

          const tempId = `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          const previewUrl = URL.createObjectURL(file)

          // Store file and preview URL references
          fileMapRef.current.set(tempId, file)
          previewUrlsRef.current.set(tempId, previewUrl)

          newUiImages.push({
            id: tempId,
            src: previewUrl,
            alt: file.name,
            source: 'new',
            file,
          })

          newProgress.push({
            tempId,
            fileName: file.name,
            fileSize: file.size,
            progress: 0,
            status: 'uploading',
          })
        })

      if (Array.from(files).length > remainingSlots) {
        newErrors.push(`Maximum ${maxFiles} files allowed`)
      }

      if (newErrors.length > 0) {
        setErrors((prev) => [...prev, ...newErrors])
      }

      if (newUiImages.length > 0) {
        const updatedUiImages = [...uiImages, ...newUiImages]
        setUiImages(updatedUiImages)

        // Update progress tracking
        setUploadProgress((prev) => {
          const updated = new Map(prev)
          newProgress.forEach((p) => updated.set(p.tempId, p))
          return updated
        })

        // Sync to form
        const payload = buildPayload(updatedUiImages, deletedIds)
        onChange?.(payload)

        if (
          onCoverIndexChange &&
          updatedUiImages.length > 0 &&
          (coverIndex === null ||
            coverIndex === undefined ||
            coverIndex >= updatedUiImages.length)
        ) {
          onCoverIndexChange(0)
        }

        // Simulate upload progress for each new image
        newProgress.forEach((p) => simulateUpload(p.tempId))
      }
    },
    [
      uiImages,
      maxFiles,
      validateFile,
      buildPayload,
      deletedIds,
      onChange,
      coverIndex,
      onCoverIndexChange,
      simulateUpload,
    ]
  )

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null)
  }, [])

  // Remove an image
  const removeImage = useCallback(
    (id: string) => {
      const removedIndex = uiImages.findIndex((img) => img.id === id)
      const imageToRemove = uiImages[removedIndex]
      if (!imageToRemove) return

      // Update UI state
      const updatedUiImages = uiImages.filter((img) => img.id !== id)
      setUiImages(updatedUiImages)

      // Update deleted IDs based on image source
      const updatedDeletedIds = [...deletedIds]
      if (imageToRemove.source === 'existing') {
        // Existing image: add to deleted list
        updatedDeletedIds.push(id)
      } else {
        // New image: cleanup file references and preview URL
        const previewUrl = previewUrlsRef.current.get(id)
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl)
          previewUrlsRef.current.delete(id)
        }
        fileMapRef.current.delete(id)
        setUploadProgress((prev) => {
          const updated = new Map(prev)
          updated.delete(id)
          return updated
        })
      }

      // Sync to form
      const payload = buildPayload(updatedUiImages, updatedDeletedIds)
      onChange?.(payload)

      if (onCoverIndexChange && typeof coverIndex === 'number') {
        if (updatedUiImages.length === 0) {
          onCoverIndexChange(null)
        } else if (removedIndex === coverIndex) {
          onCoverIndexChange(0)
        } else if (removedIndex < coverIndex) {
          onCoverIndexChange(coverIndex - 1)
        } else if (coverIndex >= updatedUiImages.length) {
          onCoverIndexChange(updatedUiImages.length - 1)
        }
      }

      if (updatedUiImages.length === 0) {
        closeLightbox()
      }
    },
    [
      uiImages,
      deletedIds,
      buildPayload,
      onChange,
      coverIndex,
      onCoverIndexChange,
      closeLightbox,
    ]
  )

  // Handle reorder after drag/drop
  const handleReorder = useCallback(
    (newOrder: string[]) => {
      const coverImageId =
        typeof coverIndex === 'number' ? uiImages[coverIndex]?.id : undefined

      // Reconstruct UI images in new order
      const reorderedUiImages = newOrder
        .map((id) => uiImages.find((img) => img.id === id))
        .filter((img): img is UIImage => img !== undefined)

      setUiImages(reorderedUiImages)

      // Sync to form with updated order
      const payload = buildPayload(reorderedUiImages, deletedIds)
      onChange?.(payload)

      if (coverImageId && onCoverIndexChange) {
        const nextCoverIndex = reorderedUiImages.findIndex(
          (image) => image.id === coverImageId
        )
        if (nextCoverIndex >= 0) {
          onCoverIndexChange(nextCoverIndex)
        }
      }
    },
    [
      uiImages,
      deletedIds,
      buildPayload,
      onChange,
      coverIndex,
      onCoverIndexChange,
    ]
  )

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index)
  }, [])

  const showPreviousImage = useCallback(() => {
    setLightboxIndex((current) => {
      if (current === null || uiImages.length === 0) return current
      const normalizedIndex = Math.min(current, uiImages.length - 1)
      return (normalizedIndex - 1 + uiImages.length) % uiImages.length
    })
  }, [uiImages.length])

  const showNextImage = useCallback(() => {
    setLightboxIndex((current) => {
      if (current === null || uiImages.length === 0) return current
      const normalizedIndex = Math.min(current, uiImages.length - 1)
      return (normalizedIndex + 1) % uiImages.length
    })
  }, [uiImages.length])

  useEffect(() => {
    if (lightboxIndex === null || uiImages.length === 0) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeLightbox()
      }

      if (event.key === 'ArrowLeft') {
        showPreviousImage()
      }

      if (event.key === 'ArrowRight') {
        showNextImage()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = originalOverflow
    }
  }, [
    closeLightbox,
    lightboxIndex,
    showNextImage,
    showPreviousImage,
    uiImages.length,
  ])

  // Drag and drop handlers for upload zone
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      if (disabled || loading) return

      const files = e.dataTransfer.files
      if (files.length > 0) {
        addImages(files)
      }
    },
    [addImages, disabled, loading]
  )

  // Open file dialog
  const openFileDialog = useCallback(() => {
    if (disabled || loading) return

    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = accept
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement
      if (target.files) {
        addImages(target.files)
      }
    }
    input.click()
  }, [accept, addImages, disabled, loading])

  // Format bytes helper
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  // Get upload progress entries as array
  const progressEntries = useMemo(
    () => Array.from(uploadProgress.values()),
    [uploadProgress]
  )

  const isDisabled = disabled || loading
  const canAddMore = uiImages.length < maxFiles
  const canSelectCover = Boolean(onCoverIndexChange)
  const normalizedCoverIndex =
    typeof coverIndex === 'number' &&
    coverIndex >= 0 &&
    coverIndex < uiImages.length
      ? coverIndex
      : null
  const safeLightboxIndex =
    lightboxIndex !== null && uiImages.length > 0
      ? Math.min(lightboxIndex, uiImages.length - 1)
      : null
  const lightboxImage =
    safeLightboxIndex !== null ? uiImages[safeLightboxIndex] : undefined
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const rect = event.active.rect.current.initial

    setOverlaySize(
      rect
        ? {
            width: rect.width,
            height: rect.height,
          }
        : null
    )
  }, [])
  const renderImageTile = useCallback(
    (item: UIImage, index: number, isOverlay = false) => {
      const isCover = canSelectCover && index === normalizedCoverIndex

      return (
        <div
          className={cn(
            'bg-accent/50 group border-border hover:bg-accent/70 relative flex aspect-square shrink-0 items-center justify-center overflow-hidden rounded-md border shadow-none transition-all duration-200 hover:z-10 data-[dragging=true]:z-50',
            isOverlay && 'z-50 shadow-lg'
          )}
          style={
            isOverlay && overlaySize
              ? {
                  width: overlaySize.width,
                  height: overlaySize.height,
                }
              : undefined
          }
          onClick={isOverlay ? undefined : () => openLightbox(index)}
        >
          <img
            src={item.src || '/placeholder.svg'}
            className='pointer-events-none h-full w-full rounded-md object-cover'
            alt={item.alt}
          />

          {/* Source indicator badge */}
          <span
            className={cn(
              'absolute start-2 bottom-2 rounded-sm px-1.5 py-0.5 text-[10px] font-medium',
              item.source === 'existing'
                ? 'bg-background/80 text-foreground'
                : 'bg-primary/80 text-primary-foreground'
            )}
          >
            {item.source === 'existing' ? 'Saved' : 'New'}
          </span>

          <div className='bg-background/80 text-muted-foreground pointer-events-none absolute start-2 top-2 flex size-8 items-center justify-center rounded-full opacity-100 shadow-sm sm:size-6 sm:opacity-0 sm:group-hover:opacity-100'>
            <GripVertical className='size-4 sm:size-3.5' />
          </div>

          {canSelectCover && !isOverlay && (
            <Button
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation()
                onCoverIndexChange?.(index)
              }}
              variant={isCover ? 'primary' : 'outline'}
              size='icon'
              type='button'
              disabled={isDisabled}
              aria-label={
                isCover ? 'Current cover image' : 'Set as cover image'
              }
              className={cn(
                'absolute end-2 top-2 size-8 rounded-full shadow-sm sm:size-6',
                !isCover &&
                  'bg-background/80 opacity-100 sm:opacity-0 sm:group-hover:opacity-100'
              )}
            >
              <Star
                className={cn('size-4 sm:size-3.5', isCover && 'fill-current')}
              />
            </Button>
          )}

          {/* Remove Button */}
          {!isDisabled && !isOverlay && (
            <Button
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation()
                removeImage(item.id)
              }}
              variant='outline'
              size='icon'
              type='button'
              className={cn(
                'bg-background/80 absolute size-8 rounded-full opacity-100 shadow-sm sm:size-6 sm:opacity-0 sm:group-hover:opacity-100',
                canSelectCover ? 'end-2 bottom-2' : 'end-2 top-2'
              )}
            >
              <XIcon className='size-4 sm:size-3.5' />
            </Button>
          )}
        </div>
      )
    },
    [
      canSelectCover,
      isDisabled,
      normalizedCoverIndex,
      onCoverIndexChange,
      openLightbox,
      overlaySize,
      removeImage,
    ]
  )

  return (
    <div className={cn('w-full max-w-4xl', className)}>
      {loading && (
        <div className='border-border bg-muted/20 mb-4 rounded-md border p-4'>
          <div className='mb-3 flex items-center justify-between gap-3'>
            <div className='space-y-2'>
              <div className='bg-muted h-4 w-40 animate-pulse rounded' />
              <div className='bg-muted h-3 w-64 max-w-full animate-pulse rounded' />
            </div>
            <div className='bg-muted size-9 animate-pulse rounded-md' />
          </div>
          <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-2.5 lg:grid-cols-5'>
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className='bg-muted aspect-square animate-pulse rounded-md'
              />
            ))}
          </div>
        </div>
      )}

      {!loading && (
        <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <p className='text-muted-foreground text-sm'>
            {uiImages.length > 0
              ? `${uiImages.length}/${maxFiles} images. Drag images to reorder.`
              : `Upload up to ${maxFiles} images (JPG, PNG, GIF, WebP, max ${formatBytes(maxSize)} each).`}
          </p>

          {uiImages.length > 0 && canAddMore && (
            <Button
              size='sm'
              variant='outline'
              onClick={openFileDialog}
              disabled={isDisabled}
              type='button'
              className='w-full sm:w-auto'
            >
              <Plus className='size-4' />
              Add image
            </Button>
          )}
        </div>
      )}

      {/* Image Grid with Sortable */}
      {!loading && uiImages.length > 0 && (
        <div className='mb-6'>
          <Sortable
            value={uiImages.map((item) => item.id)}
            onValueChange={handleReorder}
            getItemValue={(item) => item}
            orientation='mixed'
            strategy={rectSortingStrategy}
            modifiers={[]}
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragCancel={() => setOverlaySize(null)}
            onDragEnd={() => setOverlaySize(null)}
          >
            <SortableContent
              className={cn(
                'grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-2.5 lg:grid-cols-5',
                gridClassName
              )}
            >
              {uiImages.map((item, index) => {
                return (
                  <SortableItem
                    key={item.id}
                    value={item.id}
                    disabled={isDisabled}
                    asHandle
                  >
                    {renderImageTile(item, index)}
                  </SortableItem>
                )
              })}
            </SortableContent>
            <SortableOverlay>
              {({ value }) => {
                const index = uiImages.findIndex((image) => image.id === value)
                const item = index >= 0 ? uiImages[index] : undefined

                return item ? renderImageTile(item, index, true) : null
              }}
            </SortableOverlay>
          </Sortable>
        </div>
      )}

      {/* Upload Area */}
      {!loading && uiImages.length === 0 && (
        <Card
          className={cn(
            'rounded-md border-dashed shadow-none transition-colors',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-muted-foreground/50',
            isDisabled && 'pointer-events-none opacity-50'
          )}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <CardContent className='text-center'>
            <div className='border-border mx-auto mb-3 flex size-[32px] items-center justify-center rounded-full border'>
              <CloudUpload className='size-4' />
            </div>
            <h3 className='text-2sm text-foreground mb-0.5 font-semibold'>
              Choose a file or drag & drop here.
            </h3>
            <span className='text-secondary-foreground mb-3 block text-xs font-normal'>
              JPEG, PNG, up to {formatBytes(maxSize)}.
            </span>
            <Button
              size='sm'
              variant='outline'
              onClick={openFileDialog}
              disabled={isDisabled}
              type='button'
            >
              Browse File
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Upload Progress Cards */}
      {progressEntries.length > 0 && (
        <div className='mt-6 space-y-3'>
          {progressEntries.map((item) => (
            <Card key={item.tempId} className='rounded-md shadow-none'>
              <CardContent className='flex items-center gap-2 p-3'>
                <div className='border-border flex size-[32px] shrink-0 items-center justify-center rounded-md border'>
                  <ImageIcon className='text-muted-foreground size-4' />
                </div>
                <div className='flex w-full flex-col gap-1.5'>
                  <div className='-mt-2 flex w-full items-center justify-between gap-2.5'>
                    <div className='flex items-center gap-2.5'>
                      <span className='text-foreground text-xs leading-none font-medium'>
                        {item.fileName}
                      </span>
                      <span className='text-muted-foreground text-xs leading-none font-normal'>
                        {formatBytes(item.fileSize)}
                      </span>
                      {item.status === 'uploading' && (
                        <p className='text-muted-foreground text-xs'>
                          Uploading... {Math.round(item.progress)}%
                        </p>
                      )}
                      {item.status === 'completed' && (
                        <p className='text-xs text-green-600'>Completed</p>
                      )}
                    </div>
                    <Button
                      onClick={() => removeImage(item.tempId)}
                      variant='ghost'
                      size='icon'
                      className='size-6'
                      disabled={isDisabled}
                    >
                      <CircleX className='size-3.5' />
                    </Button>
                  </div>

                  <Progress
                    value={item.progress}
                    className={cn(
                      'h-1 transition-all duration-300',
                      '[&>div]:bg-zinc-950 dark:[&>div]:bg-zinc-50'
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Error Messages */}
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

      {lightboxImage && safeLightboxIndex !== null && (
        <div
          role='dialog'
          aria-modal='true'
          aria-label='Image preview'
          className='fixed inset-0 z-[100] flex items-center justify-center bg-black/95'
          onClick={closeLightbox}
        >
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='absolute end-4 top-4 z-10 size-10 rounded-full text-white hover:bg-white/15 hover:text-white'
            onClick={(event) => {
              event.stopPropagation()
              closeLightbox()
            }}
            aria-label='Close image preview'
          >
            <XIcon className='size-5' />
          </Button>

          {uiImages.length > 1 && (
            <>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                className='absolute start-4 top-1/2 z-10 size-12 -translate-y-1/2 rounded-full bg-white/10 text-white hover:bg-white/20 hover:text-white sm:start-6 sm:size-14'
                onClick={(event) => {
                  event.stopPropagation()
                  showPreviousImage()
                }}
                aria-label='Previous image'
              >
                <ChevronLeft className='size-7' />
              </Button>

              <Button
                type='button'
                variant='ghost'
                size='icon'
                className='absolute end-4 top-1/2 z-10 size-12 -translate-y-1/2 rounded-full bg-white/10 text-white hover:bg-white/20 hover:text-white sm:end-6 sm:size-14'
                onClick={(event) => {
                  event.stopPropagation()
                  showNextImage()
                }}
                aria-label='Next image'
              >
                <ChevronRight className='size-7' />
              </Button>
            </>
          )}

          <div
            className='flex h-full w-full items-center justify-center px-4 py-16 sm:px-20 sm:py-10'
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={lightboxImage.src || '/placeholder.svg'}
              alt={lightboxImage.alt}
              className='max-h-full max-w-full object-contain shadow-2xl'
            />
          </div>

          <div className='absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/15 px-3 py-1 text-sm font-medium text-white'>
            {safeLightboxIndex + 1}/{uiImages.length}
          </div>
        </div>
      )}
    </div>
  )
}
