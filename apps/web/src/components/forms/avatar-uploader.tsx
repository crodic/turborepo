'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { EditIcon, ImageIcon } from 'lucide-react'
import Cropper from 'react-easy-crop'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useFormField } from '@/components/ui/form'
import { Button } from '../ui/button'

function getRadianAngle(degreeValue: number) {
  return (degreeValue * Math.PI) / 180
}

function createImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.setAttribute('crossOrigin', 'anonymous')
    image.src = url
  })
}

function rotateSize(width: number, height: number, rotation: number) {
  const rotRad = getRadianAngle(rotation)
  return {
    width:
      Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height:
      Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  }
}

async function getCroppedImageBlob(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  rotation = 0,
  options?: { width?: number; height?: number; mime?: string; quality?: number }
): Promise<Blob> {
  const image = await createImage(imageSrc)
  const mime = options?.mime || 'image/jpeg'
  const quality = options?.quality ?? 0.92

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context not available')

  const rotRad = getRadianAngle(rotation)
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
    image.width,
    image.height,
    rotation
  )

  canvas.width = bBoxWidth
  canvas.height = bBoxHeight

  ctx.translate(bBoxWidth / 2, bBoxHeight / 2)
  ctx.rotate(rotRad)
  ctx.drawImage(image, -image.width / 2, -image.height / 2)
  ctx.rotate(-rotRad)
  ctx.translate(-bBoxWidth / 2, -bBoxHeight / 2)

  const data = ctx.getImageData(
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height
  )

  const outputCanvas = document.createElement('canvas')
  outputCanvas.width = options?.width ?? pixelCrop.width
  outputCanvas.height = options?.height ?? pixelCrop.height

  const outCtx = outputCanvas.getContext('2d')
  if (!outCtx) throw new Error('Canvas 2D context not available')
  outCtx.putImageData(data, 0, 0)

  return new Promise((resolve) => {
    outputCanvas.toBlob((blob) => resolve(blob as Blob), mime, quality)
  })
}

/* ---------------------- Props ---------------------- */

type ImageCropFieldProps = {
  field: {
    value?: File | null
    onChange: (file?: File | null) => void
    onBlur?: () => void
    ref?: (instance: HTMLInputElement | null) => void
    name?: string
  }

  aspect?: number
  cropShape?: 'round' | 'rect'
  accept?: string
  maxFileSizeBytes?: number
  instruction?: string
  viewportWidth?: number
  viewportHeight?: number
  minZoom?: number
  maxZoom?: number
  initialZoom?: number
  showGrid?: boolean
  className?: string
  style?: React.CSSProperties
  defaultUri?: string

  output?: {
    width: number
    height: number
    mime?: string
    quality?: number
    fileName?: string
  }
}

/* ---------------------- Component ---------------------- */

const AvatarUploader = ({
  field,
  aspect = 1,
  cropShape = 'round',
  accept = 'image/*',
  maxFileSizeBytes = 5 * 1024 * 1024,
  instruction = 'Drag and drop or select a file',
  viewportWidth = 420,
  viewportHeight = 320,
  minZoom = 1,
  maxZoom = 3,
  initialZoom = 1,
  showGrid = true,
  className,
  style,
  output,
  defaultUri,
}: ImageCropFieldProps) => {
  const { error } = useFormField()
  const { t } = useTranslation()

  const controlledOnChange = field.onChange
  const controlledValue = field.value || undefined

  const inputRef = useRef<HTMLInputElement | null>(null)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [zoom, setZoom] = useState(initialZoom)
  const [rotation, setRotation] = useState(0)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{
    x: number
    y: number
    width: number
    height: number
  } | null>(null)

  const [previewUrl, setPreviewUrl] = useState<string | null>(
    defaultUri ?? null
  )

  /* ---------------------- File select ---------------------- */
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file || file.size > maxFileSizeBytes) return

      const localUrl = URL.createObjectURL(file)

      setImageSrc(localUrl)
      setZoom(initialZoom)
      setRotation(0)
      //   setPreviewUrl(null)
      setIsEditorOpen(true)
    },
    [initialZoom, maxFileSizeBytes]
  )

  /* ---------------------- Crop complete ---------------------- */
  const onCropComplete = useCallback(
    (
      _area: { x: number; y: number; width: number; height: number },
      areaPixels: { x: number; y: number; width: number; height: number }
    ) => {
      setCroppedAreaPixels(areaPixels)
    },
    []
  )

  /* ---------------------- Aspect ---------------------- */
  const computedAspect = useMemo(() => {
    if (output?.width && output?.height) {
      return output.width / output.height
    }
    return aspect
  }, [output, aspect])

  /* ---------------------- Confirm crop ---------------------- */
  const confirmCrop = useCallback(async () => {
    if (!imageSrc || !croppedAreaPixels) return

    const opts = {
      width: output?.width,
      height: output?.height,
      mime: output?.mime || 'image/jpeg',
      quality: output?.quality ?? 0.92,
    }

    const blob = await getCroppedImageBlob(
      imageSrc,
      croppedAreaPixels,
      rotation,
      opts
    )

    const fileName =
      output?.fileName ||
      (opts.mime === 'image/png' ? 'image.png' : 'image.jpg')

    const file = new File([blob], fileName, { type: opts.mime })

    controlledOnChange(file)

    const url = URL.createObjectURL(blob)
    setPreviewUrl(url)
    setImageSrc(null)
    setIsEditorOpen(false)
  }, [controlledOnChange, croppedAreaPixels, imageSrc, rotation, output])

  /* ---------------------- Clear selection ---------------------- */
  const clearSelection = useCallback(() => {
    setImageSrc(null)
    setPreviewUrl(null)
    setZoom(1)
    setRotation(0)
    setCroppedAreaPixels(null)

    controlledOnChange(null)

    if (inputRef.current) inputRef.current.value = ''
  }, [controlledOnChange])

  const hasValue = useMemo(
    () => !!controlledValue || !!previewUrl,
    [controlledValue, previewUrl]
  )

  const cancelEdit = useCallback(() => {
    setIsEditorOpen(false)
    if (!previewUrl) setImageSrc(null)
  }, [previewUrl])

  /* ---------------------- UI ---------------------- */
  return (
    <div className={className} style={{ display: 'grid', gap: 12, ...style }}>
      {/* Hidden input */}
      <input
        ref={(node) => {
          inputRef.current = node
          field?.ref?.(node)
        }}
        name={field?.name}
        type='file'
        accept={accept}
        onChange={handleFileChange}
        onBlur={field?.onBlur}
        className='sr-only'
      />

      {/* Avatar preview */}
      <div className='flex items-end gap-4'>
        <div
          className={cn(
            'relative grid w-full place-items-center rounded-full border text-[#6b7280]',
            error ? 'border border-red-500 bg-red-50' : 'bg-[#eceffd]'
          )}
          style={{ maxWidth: viewportWidth, height: viewportHeight }}
        >
          {!hasValue && <ImageIcon size={32} />}
          {(previewUrl || controlledValue) && (
            <img
              src={
                previewUrl ||
                (controlledValue ? URL.createObjectURL(controlledValue) : '')
              }
              alt='preview'
              className='absolute inset-0 h-full w-full rounded-full object-cover'
            />
          )}
          <Button
            variant='secondary'
            size='icon-sm'
            type='button'
            className='absolute right-0 bottom-0 z-10'
            onClick={() => inputRef.current?.click()}
          >
            <EditIcon className='text-primary' />
          </Button>
        </div>

        <div className='flex flex-col gap-2'>
          {previewUrl && (
            <Button
              type='button'
              size='sm'
              variant='destructive'
              onClick={clearSelection}
            >
              {t('buttons.remove')}
            </Button>
          )}
        </div>
      </div>

      {/* Modal Cropper */}
      {isEditorOpen && imageSrc && (
        <div
          role='dialog'
          aria-modal='true'
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 50,
          }}
        >
          <div
            style={{
              width: Math.max(520, viewportWidth),
              maxWidth: '95vw',
              background: '#0f172a',
              color: 'white',
              borderRadius: 12,
              padding: 16,
            }}
          >
            <div
              style={{
                width: '100%',
                height: Math.max(360, viewportHeight),
                position: 'relative',
                background: '#111',
                borderRadius: 8,
                overflow: 'hidden',
              }}
            >
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={computedAspect}
                cropShape={cropShape}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onRotationChange={setRotation}
                onCropComplete={onCropComplete}
                showGrid={showGrid}
              />

              {instruction && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 8,
                    left: 0,
                    right: 0,
                    textAlign: 'center',
                    color: 'white',
                    fontSize: 12,
                    textShadow: '0 1px 2px rgba(0,0,0,.6)',
                  }}
                >
                  {instruction}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
              <label style={{ display: 'grid', gap: 4 }}>
                <span>Zoom</span>
                <input
                  type='range'
                  min={minZoom}
                  max={maxZoom}
                  value={zoom}
                  step={0.01}
                  onChange={(e) => setZoom(Number(e.target.value))}
                />
              </label>

              <label style={{ display: 'grid', gap: 4 }}>
                <span>Rotation</span>
                <input
                  type='range'
                  min={-45}
                  max={45}
                  value={rotation}
                  step={1}
                  onChange={(e) => setRotation(Number(e.target.value))}
                />
              </label>

              <div
                style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}
              >
                <Button type='button' variant='secondary' onClick={cancelEdit}>
                  Cancel
                </Button>

                <Button type='button' onClick={confirmCrop}>
                  Confirm
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AvatarUploader
