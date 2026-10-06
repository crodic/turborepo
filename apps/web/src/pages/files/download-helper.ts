import { toast } from 'sonner'
import http from '@/lib/http'
import type { FileSchema } from './schema'

function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

export async function downloadFile(file: FileSchema): Promise<void> {
  const downloadToastId = toast.loading(
    `Preparing download: ${file.original_name}`
  )
  try {
    // If file is private, fetch through authenticated API
    const response = await http.get(file.url, {
      responseType: 'blob',
    })

    const blob = new Blob([response.data], {
      type: file.mime || 'application/octet-stream',
    })

    triggerBrowserDownload(blob, file.original_name)
    toast.success(`Downloaded: ${file.original_name}`, { id: downloadToastId })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Download failed:', error)
    // Fallback: try opening the URL in new window
    window.open(file.url, '_blank')
    toast.error(`Could not download directly. Opening in new tab.`, {
      id: downloadToastId,
    })
  }
}

export async function bulkDownloadFiles(
  files: FileSchema[],
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  if (files.length === 0) return

  const toastId = toast.loading(
    `Starting download of ${files.length} file(s)...`
  )

  let successCount = 0
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    try {
      onProgress?.(i + 1, files.length)
      await downloadFile(file)
      successCount++
      // Short delay between triggers to prevent browser blocking multiple downloads
      if (i < files.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 350))
      }
    } catch {
      // Continue next file
    }
  }

  toast.success(
    `Completed downloading ${successCount}/${files.length} file(s)`,
    {
      id: toastId,
    }
  )
}
