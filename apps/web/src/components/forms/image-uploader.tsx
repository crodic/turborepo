import React, { useCallback } from 'react'
import { useFormContext } from 'react-hook-form'
import { Cross2Icon } from '@radix-ui/react-icons'
import { ImagePlus } from 'lucide-react'
import { useDropzone, type DropzoneProps } from 'react-dropzone'
import { cn } from '@/lib/utils'
import { Button } from '../ui/button'
import { useFormField } from '../ui/form'
import { Input } from '../ui/input'

type ImageUploaderOptions = DropzoneProps & {
  maxSizeMb?: number
}

export type ImageUploaderProps = React.InputHTMLAttributes<HTMLInputElement> & {
  uploadOptions?: ImageUploaderOptions
  defaultUri: string | File | undefined
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  uploadOptions,
  defaultUri,
  ...props
}: ImageUploaderProps) => {
  const [preview, setPreview] = React.useState<string | ArrayBuffer | null>(
    defaultUri as string
  )
  const [_fileName, setFileName] = React.useState<string | null>()
  const formField = useFormField()
  const form = useFormContext()

  const setFieldError = useCallback(
    (message: string) => {
      form.setError(formField.name, {
        type: 'custom',
        message: message,
      })
    },
    [form, formField.name]
  )

  const onDropAccepted = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length == 0) {
        return
      }

      const file = acceptedFiles[0]
      setFileName(file.name)

      const reader = new FileReader()
      try {
        form.clearErrors(formField.name)
        reader.onload = () => {
          setPreview(reader.result)
        }
        reader.readAsDataURL(file)
        form.setValue(formField.name, file)
      } catch (error) {
        setPreview(null)
        form.resetField(formField.name)
        if (error instanceof Error) {
          setFieldError(error.message)
        }
      }
    },
    [form, formField.name, setFieldError]
  )

  /**
   * Conver maxsize from MB to bytes instead
   */
  const _uploadOptions: DropzoneProps = { ...uploadOptions }
  if (uploadOptions?.maxSizeMb) {
    _uploadOptions.maxSize = uploadOptions.maxSizeMb * 1024 * 1024
  }

  const { getRootProps, getInputProps } = useDropzone({
    onDropAccepted,
    onDropRejected: (fileRejections) => {
      if (fileRejections.length <= 0) return
      const errMessage = fileRejections[0].errors
        .map((error) => error.message)
        .join(', ')

      setFieldError(errMessage)
    },
    ..._uploadOptions,
  })

  const onClear = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation()
      form.resetField(formField.name, { defaultValue: '' })
      setPreview(null)
    },
    [form, formField.name]
  )

  return (
    <div
      {...getRootProps()}
      className={cn(
        'group border-input shadow-input relative mx-auto flex cursor-pointer flex-col items-center justify-center gap-y-2 rounded-lg border p-2 shadow-sm',
        props.className
      )}
    >
      {preview && (
        <div>
          {/* <div className="mb-2 text-xs text-gray-600">{fileName}</div> */}
          <img
            src={preview as string}
            alt='Uploaded image'
            className='max-h-[200px] rounded-lg'
          />
          <div className='absolute top-0 left-0 h-full w-full transform opacity-0 backdrop-brightness-50 transition-opacity duration-300 group-hover:opacity-100'>
            <Button
              className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
              onClick={onClear}
              type='button'
              variant='destructive'
              size='sm'
            >
              <Cross2Icon />
            </Button>
          </div>
        </div>
      )}
      <ImagePlus className={`size-10 ${preview ? 'hidden' : 'block'}`} />
      <Input {...getInputProps()} type='file' />
    </div>
  )
}

ImageUploader.displayName = 'ImageUploader'

export default ImageUploader
