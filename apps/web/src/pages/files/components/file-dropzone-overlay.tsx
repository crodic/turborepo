import { useEffect, useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

interface FileDropzoneOverlayProps {
  activeFolder: string | null
  onDropFiles: (files: File[]) => void
  disabled?: boolean
}

export function FileDropzoneOverlay({
  activeFolder,
  onDropFiles,
  disabled = false,
}: FileDropzoneOverlayProps) {
  const { t } = useTranslation()
  const [isDragging, setIsDragging] = useState(false)
  const dragCounter = useRef(0)

  useEffect(() => {
    if (disabled) return

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dragCounter.current += 1
      if (e.dataTransfer?.types?.includes('Files')) {
        setIsDragging(true)
      }
    }

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dragCounter.current -= 1
      if (dragCounter.current <= 0) {
        dragCounter.current = 0
        setIsDragging(false)
      }
    }

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy'
      }
    }

    const handleDrop = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dragCounter.current = 0
      setIsDragging(false)

      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        const droppedFiles = Array.from(e.dataTransfer.files)
        onDropFiles(droppedFiles)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        dragCounter.current = 0
        setIsDragging(false)
      }
    }

    window.addEventListener('dragenter', handleDragEnter)
    window.addEventListener('dragleave', handleDragLeave)
    window.addEventListener('dragover', handleDragOver)
    window.addEventListener('drop', handleDrop)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('dragenter', handleDragEnter)
      window.removeEventListener('dragleave', handleDragLeave)
      window.removeEventListener('dragover', handleDragOver)
      window.removeEventListener('drop', handleDrop)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [disabled, onDropFiles])

  if (!isDragging) {
    return null
  }

  const folderName = activeFolder ?? t('files.folders.root')

  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-6',
        'bg-background/80 backdrop-blur-md transition-all duration-200'
      )}
    >
      <div className='border-primary bg-card/90 animate-in fade-in zoom-in-95 flex max-w-md flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-8 text-center shadow-2xl duration-200'>
        <div className='bg-primary/10 text-primary flex size-16 animate-pulse items-center justify-center rounded-2xl'>
          <Upload className='size-8' />
        </div>
        <div className='flex flex-col gap-1'>
          <h3 className='text-foreground text-lg font-bold'>
            {t('files.dropzone.title')}
          </h3>
          <p className='text-muted-foreground text-xs'>
            {t('files.dropzone.subtitle', { folder: folderName })}
          </p>
        </div>
      </div>
    </div>
  )
}
