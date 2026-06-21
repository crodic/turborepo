'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { ImageIcon, XIcon } from 'lucide-react'
import Cropper from 'react-easy-crop'
import { cn } from '@/lib/utils'

type ImageCropFieldProps = {
  field?: {
    value?: File | null
    onChange: (file: File | null) => void
    onBlur?: () => void
    ref?: (instance: HTMLInputElement | null) => void
    name?: string
  }
  value?: File | null
  onChange?: (file: File | null) => void

  aspect?: number // e.g. 1 for square, 4/5 for portrait (overridden by output)
  cropShape?: 'round' | 'rect'
  accept?: string // e.g. "image/*"
  maxFileSizeBytes?: number // simple guard
  label?: string
  instruction?: string
  viewportWidth?: number
  viewportHeight?: number
  minZoom?: number
  maxZoom?: number
  initialZoom?: number
  showGrid?: boolean
  className?: string
  style?: React.CSSProperties
  isAvatar?: boolean
  previewUri?: string

  // When provided, the output file will be scaled to exactly this size
  output?: {
    width: number
    height: number
    mime?: string // defaults to image/jpeg
    quality?: number // 0..1, defaults to 0.92
    fileName?: string // defaults to image.jpg
  }
}

// Util helpers
function getRadianAngle(degreeValue: number): number {
  return (degreeValue * Math.PI) / 180
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
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

// async function getCroppedImageBlob(
//     imageSrc: string,
//     pixelCrop: { x: number; y: number; width: number; height: number },
//     rotation = 0,
//     options?: { width?: number; height?: number; mime?: string; quality?: number }
// ): Promise<Blob> {
//     const image = await createImage(imageSrc);
//     const mime = options?.mime || 'image/jpeg';
//     const quality = options?.quality ?? 0.92;

//     // First canvas: draw the rotated image into a large safe area
//     const safeArea = Math.max(image.width, image.height) * 2;
//     const rotatedCanvas = document.createElement('canvas');
//     rotatedCanvas.width = safeArea;
//     rotatedCanvas.height = safeArea;
//     const rctx = rotatedCanvas.getContext('2d');
//     if (!rctx) throw new Error('Canvas 2D context not available');
//     rctx.translate(safeArea / 2, safeArea / 2);
//     rctx.rotate(getRadianAngle(rotation));
//     rctx.translate(-safeArea / 2, -safeArea / 2);
//     rctx.drawImage(image, (safeArea - image.width) / 2, (safeArea - image.height) / 2);

//     // Crop canvas to extract the right pixels (no scaling yet)
//     const cropCanvas = document.createElement('canvas');
//     cropCanvas.width = Math.round(pixelCrop.width);
//     cropCanvas.height = Math.round(pixelCrop.height);
//     const cropCtx = cropCanvas.getContext('2d');
//     if (!cropCtx) throw new Error('Canvas 2D context not available');

//     // Compute offsets to align the selected area from the rotated canvas
//     const offsetX = Math.round(-safeArea / 2 + image.width / 2 - pixelCrop.x);
//     const offsetY = Math.round(-safeArea / 2 + image.height / 2 - pixelCrop.y);
//     const imgData = rctx.getImageData(0, 0, safeArea, safeArea);
//     cropCtx.putImageData(imgData, offsetX, offsetY);

//     // If an exact output size is requested, scale the cropped result
//     const outW = options?.width ?? pixelCrop.width;
//     const outH = options?.height ?? pixelCrop.height;
//     let outputCanvas = cropCanvas;
//     if (Math.round(outW) !== Math.round(pixelCrop.width) || Math.round(outH) !== Math.round(pixelCrop.height)) {
//         const scaled = document.createElement('canvas');
//         scaled.width = Math.round(outW);
//         scaled.height = Math.round(outH);
//         const sctx = scaled.getContext('2d');
//         if (!sctx) throw new Error('Canvas 2D context not available');
//         sctx.imageSmoothingEnabled = true;
//         sctx.imageSmoothingQuality = 'high' as ImageSmoothingQuality;
//         sctx.drawImage(cropCanvas, 0, 0, cropCanvas.width, cropCanvas.height, 0, 0, scaled.width, scaled.height);
//         outputCanvas = scaled;
//     }

//     return new Promise((resolve) => {
//         outputCanvas.toBlob((blob) => resolve(blob as Blob), mime, quality);
//     });
// }
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

  // Make sure the area is large enough to accommodate the rotated image.
  const rotRad = getRadianAngle(rotation)
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
    image.width,
    image.height,
    rotation
  )

  canvas.width = bBoxWidth
  canvas.height = bBoxHeight

  // Move the origin to the center of the canvas to rotate the image around the center.
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2)
  ctx.rotate(rotRad)
  ctx.drawImage(image, -image.width / 2, -image.height / 2)
  ctx.rotate(-rotRad)
  ctx.translate(-bBoxWidth / 2, -bBoxHeight / 2)

  // Get the exact crop area
  const data = ctx.getImageData(
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height
  )

  // Create output canvas
  const outputCanvas = document.createElement('canvas')
  outputCanvas.width = options?.width ?? pixelCrop.width
  outputCanvas.height = options?.height ?? pixelCrop.height

  const outCtx = outputCanvas.getContext('2d')
  if (!outCtx) throw new Error('Canvas 2D context not available')
  outCtx.putImageData(data, 0, 0)

  // Export blob
  return new Promise((resolve) => {
    outputCanvas.toBlob((blob) => resolve(blob as Blob), mime, quality)
  })
}

/**
 * Componente de upload e recorte de imagens com interface intuitiva
 *
 * Este componente permite que o usuário selecione uma imagem do seu dispositivo,
 * visualize uma prévia e faça recortes personalizados com controles de zoom e rotação.
 * É totalmente compatível com React Hook Form e pode ser usado como um campo controlado.
 *
 * ## Funcionalidades Principais:
 *
 * 1. **Upload de Imagem**: Interface de seleção de arquivos com validação de tamanho
 * 2. **Editor de Recorte**: Modal com controles interativos para recortar a imagem
 * 3. **Controles Avançados**: Zoom (1x a 3x) e rotação (-45° a +45°)
 * 4. **Formatos de Saída**: Suporte a JPEG e PNG com qualidade configurável
 * 5. **Integração com Formulários**: Compatível com React Hook Form
 * 6. **Responsivo**: Adapta-se a diferentes tamanhos de tela
 *
 * ## Como Funciona:
 *
 * 1. O usuário clica no botão de upload ou na área de preview
 * 2. Seleciona uma imagem do dispositivo (com validação de tamanho)
 * 3. A imagem é carregada no editor modal com controles de recorte
 * 4. O usuário ajusta a posição, zoom e rotação conforme necessário
 * 5. Ao confirmar, a imagem é processada e retornada como File object
 * 6. Uma prévia da imagem recortada é exibida na interface
 *
 * @param {ImageCropFieldProps} props - Propriedades do componente
 * @param {object} [props.field] - Campo do React Hook Form (obtido via Controller)
 * @param {File|null} [props.value] - Valor controlado da imagem (alternativa ao field)
 * @param {function} [props.onChange] - Callback de mudança (alternativa ao field)
 * @param {number} [props.aspect=1] - Proporção do recorte (1 = quadrado, 16/9 = widescreen)
 * @param {"round"|"rect"} [props.cropShape="round"] - Formato do recorte (circular ou retangular)
 * @param {string} [props.accept="image/*"] - Tipos de arquivo aceitos
 * @param {number} [props.maxFileSizeBytes=5MB] - Tamanho máximo do arquivo em bytes
 * @param {string} [props.label="Selecionar imagem"] - Texto do botão de upload
 * @param {string} [props.instruction="Arraste para reposicionar"] - Instrução no editor
 * @param {number} [props.viewportWidth=420] - Largura da área de preview
 * @param {number} [props.viewportHeight=320] - Altura da área de preview
 * @param {number} [props.minZoom=1] - Zoom mínimo permitido
 * @param {number} [props.maxZoom=3] - Zoom máximo permitido
 * @param {number} [props.initialZoom=1] - Zoom inicial do editor
 * @param {boolean} [props.showGrid=true] - Exibir grade no editor
 * @param {string} [props.className] - Classes CSS adicionais
 * @param {React.CSSProperties} [props.style] - Estilos CSS inline
 * @param {boolean} [props.isAvatar=false] - Indica se a imagem é um avatar
 * @param {object} [props.output] - Configurações de saída da imagem
 * @param {number} props.output.width - Largura da imagem final
 * @param {number} props.output.height - Altura da imagem final
 * @param {string} [props.output.mime="image/jpeg"] - Tipo MIME da saída
 * @param {number} [props.output.quality=0.92] - Qualidade da compressão (0-1)
 * @param {string} [props.output.fileName] - Nome do arquivo gerado
 *
 * @returns {JSX.Element} Componente de upload e recorte de imagens
 *
 * @example
 * // Uso básico com React Hook Form
 * import { Controller, useForm } from "react-hook-form";
 * import ImageCropField from "./ImageCropField";
 *
 * function MeuFormulario() {
 *   const { control, handleSubmit } = useForm();
 *
 *   const onSubmit = (data) => {
 *     console.log("Imagem recortada:", data.avatar);
 *   };
 *
 *   return (
 *     <form onSubmit={handleSubmit(onSubmit)}>
 *       <Controller
 *         name="avatar"
 *         control={control}
 *         render={({ field }) => (
 *           <ImageCropField
 *             field={field}
 *             aspect={1}
 *             cropShape="round"
 *             label="Foto do Perfil"
 *             output={{
 *               width: 200,
 *               height: 200,
 *               quality: 0.8
 *             }}
 *           />
 *         )}
 *       />
 *       <button type="submit">Salvar</button>
 *     </form>
 *   );
 * }
 *
 * @example
 * // Uso como componente controlado
 * import { useState } from "react";
 * import ImageCropField from "./ImageCropField";
 *
 * function MinhaImagem() {
 *   const [imagem, setImagem] = useState(null);
 *
 *   return (
 *     <ImageCropField
 *       value={imagem}
 *       onChange={setImagem}
 *       aspect={16/9}
 *       cropShape="rect"
 *       label="Banner da Página"
 *       viewportWidth={600}
 *       viewportHeight={300}
 *       output={{
 *         width: 1200,
 *         height: 675,
 *         mime: "image/png"
 *       }}
 *     />
 *   );
 * }
 *
 * @example
 * // Configuração avançada para avatares
 * <ImageCropField
 *   field={field}
 *   aspect={1}
 *   cropShape="round"
 *   maxFileSizeBytes={2 * 1024 * 1024} // 2MB
 *   label="Foto do Perfil"
 *   instruction="Posicione seu rosto no centro"
 *   minZoom={0.5}
 *   maxZoom={5}
 *   initialZoom={1.2}
 *   output={{
 *     width: 400,
 *     height: 400,
 *     quality: 0.9,
 *     fileName: "avatar.jpg"
 *   }}
 * />
 *
 * ---
 * [FullStack Software Engineer - Jonatas Silva](github.com/JsCodeDevlopment)
 */
const ImageCropField = ({
  field,
  value,
  onChange,
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
  isAvatar = false,
  output,
  previewUri,
}: ImageCropFieldProps) => {
  const controlledOnChange = field?.onChange || onChange || (() => {})
  const controlledValue = field?.value ?? value ?? null

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
    previewUri ?? null
  )
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setError(null)
      const file = e.target.files && e.target.files[0]
      if (!file) return
      if (maxFileSizeBytes && file.size > maxFileSizeBytes) {
        setError('Arquivo muito grande')
        return
      }
      const localUrl = URL.createObjectURL(file)
      setImageSrc(localUrl)
      setZoom(initialZoom)
      setRotation(0)
      setPreviewUrl(null)
      setIsEditorOpen(true)
    },
    [initialZoom, maxFileSizeBytes]
  )

  const onCropComplete = useCallback(
    (
      _area: { x: number; y: number; width: number; height: number },
      areaPixels: { x: number; y: number; width: number; height: number }
    ) => {
      setCroppedAreaPixels(areaPixels)
    },
    []
  )

  const computedAspect = useMemo(() => {
    if (output && output.width && output.height)
      return output.width / output.height
    return aspect
  }, [output, aspect])

  const confirmCrop = useCallback(async () => {
    if (!imageSrc || !croppedAreaPixels) return
    const opts = {
      width: output?.width,
      height: output?.height,
      mime: output?.mime || 'image/jpeg',
      quality: output?.quality ?? 0.92,
    } as const
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

  const clearSelection = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation()

      setImageSrc(null)
      setPreviewUrl(null)
      setZoom(1)
      setRotation(0)
      setCroppedAreaPixels(null)
      controlledOnChange(null)
      if (inputRef.current) inputRef.current.value = ''
    },
    [controlledOnChange]
  )

  const hasValue = useMemo(
    () => !!controlledValue || !!previewUrl,
    [controlledValue, previewUrl]
  )
  const cancelEdit = useCallback(() => {
    setIsEditorOpen(false)
    if (!previewUrl) {
      setImageSrc(null)
    }
  }, [previewUrl])

  return (
    <div className={className} style={{ display: 'grid', gap: 12, ...style }}>
      <div>
        <input
          ref={(node) => {
            inputRef.current = node
            if (field?.ref) field.ref(node)
          }}
          name={field?.name}
          type='file'
          accept={accept}
          onChange={handleFileChange}
          onBlur={field?.onBlur}
          className='sr-only'
        />
      </div>

      {/* Canvas / placeholder */}
      <div
        className={cn(
          'relative grid w-full cursor-pointer place-items-center overflow-hidden border-2 border-dashed bg-[#eceffd] text-[#6b7280] hover:border-4 hover:border-gray-400',
          isAvatar ? 'rounded-full' : 'rounded-lg'
        )}
        style={{
          maxWidth: viewportWidth,
          height: viewportHeight,
        }}
        onClick={() => inputRef.current?.click()}
      >
        {!hasValue && (
          <button
            type='button'
            style={{ background: 'transparent', color: 'inherit' }}
          >
            <ImageIcon size={32} />
          </button>
        )}
        {hasValue && (
          <div className='group relative h-full w-full'>
            <img
              src={
                previewUrl ||
                (controlledValue ? URL.createObjectURL(controlledValue) : '')
              }
              alt='preview'
              className='absolute inset-0 h-full w-full rounded-lg object-cover'
            />

            <button
              type='button'
              onClick={clearSelection}
              title='Remove image'
              aria-label='Remove image'
              className='absolute top-1/2 right-1/2 hidden h-7 w-7 translate-x-1/2 -translate-y-1/2 cursor-pointer place-items-center rounded-full border border-black/30 bg-black/60 text-white transition-all group-hover:grid'
            >
              <XIcon size={18} />
            </button>
          </div>
        )}
      </div>

      {error && <p className='text-destructive'>{error}</p>}

      {/* Modal editor */}
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
                    textShadow: '0 1px 2px rgba(0,0,0,.6)',
                    fontSize: 12,
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
                  step={0.01}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                />
              </label>
              <label style={{ display: 'grid', gap: 4 }}>
                <span>Rotation</span>
                <input
                  type='range'
                  min={-45}
                  max={45}
                  step={1}
                  value={rotation}
                  onChange={(e) => setRotation(Number(e.target.value))}
                />
              </label>
              <div
                style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}
              >
                <button
                  type='button'
                  onClick={cancelEdit}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    background: '#334155',
                    color: 'white',
                  }}
                >
                  Cancel
                </button>
                <button
                  type='button'
                  onClick={confirmCrop}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    background: '#0ea5e9',
                    color: 'white',
                  }}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ImageCropField
