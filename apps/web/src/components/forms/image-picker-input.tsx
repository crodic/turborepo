import React, { useCallback, useRef, useState } from 'react'
import { FolderSearch, ImagePlus, Loader2, XIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import http from '@/lib/http'
import { cn } from '@/lib/utils'
import { FilePickerDialog } from '@/pages/files/file-picker-dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'

type Props = {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  required?: boolean
  className?: string
  placeholder?: string
}

export function ImagePickerInput({
  label,
  value,
  onChange,
  error,
  required,
  className,
  placeholder = 'https://...',
}: Props) {
  const { t } = useTranslation()
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      setIsUploading(true)
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('folder', 'cms') // you can adjust folder name if needed
        formData.append('disk', 'public')

        const res = await http.post<{ url: string }>(
          '/files/upload',
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        )

        if (res.data?.url) {
          onChange(res.data.url)
          toast.success(t('imagePicker.uploadSuccess'), {
            description: t('imagePicker.storedInLibrary', {
              defaultValue: 'File safely stored in your Media Library',
            }),
          })
        }
      } catch (err) {
        toast.error(t('imagePicker.uploadFailed'))
        // eslint-disable-next-line no-console
        console.error(err)
      } finally {
        setIsUploading(false)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
    },
    [onChange]
  )

  return (
    <div className={cn('space-y-2', className)}>
      <Label>
        {label}
        {required && <span className='text-destructive ms-1'>*</span>}
      </Label>

      <div className='flex flex-col gap-2'>
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          className={cn(
            'w-full',
            error && 'border-destructive focus-visible:ring-destructive'
          )}
        />

        <div className='flex items-center gap-2'>
          <Button
            type='button'
            variant='secondary'
            className='flex-1'
            onClick={() => setIsPickerOpen(true)}
            title={t('imagePicker.chooseFromGallery')}
          >
            <FolderSearch className='mr-2 size-4' />
            {t('imagePicker.browse')}
          </Button>

          <Button
            type='button'
            variant='outline'
            className='flex-1'
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            title={t('imagePicker.uploadImage')}
          >
            {isUploading ? (
              <Loader2 className='size-4 animate-spin' />
            ) : (
              <>
                <ImagePlus className='mr-2 size-4' />
                {t('imagePicker.upload')}
              </>
            )}
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type='file'
          accept='image/*'
          className='hidden'
          onChange={handleFileSelect}
        />
      </div>

      {/* Image Preview */}
      {value && (
        <div className='relative mt-2 max-w-sm rounded-md border p-1'>
          <img
            src={value}
            alt='Preview'
            className='h-auto max-h-[160px] w-full rounded object-contain'
            onError={(e) => {
              ;(e.target as HTMLImageElement).style.display = 'none'
            }}
            onLoad={(e) => {
              ;(e.target as HTMLImageElement).style.display = 'block'
            }}
          />
          <Button
            type='button'
            variant='destructive'
            size='icon'
            className='absolute -top-2 -right-2 size-6 rounded-full shadow-sm'
            onClick={() => onChange('')}
          >
            <XIcon className='size-3' />
          </Button>
        </div>
      )}

      {error && <p className='text-destructive text-sm'>{error}</p>}

      <FilePickerDialog
        mode='url'
        multiple={false}
        open={isPickerOpen}
        onOpenChange={setIsPickerOpen}
        onValueChange={(url) => {
          if (url) onChange(url)
        }}
      />
    </div>
  )
}
