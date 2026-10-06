import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Check, Copy, Link, Loader2, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { apiGetTemporaryUrl } from '../queries'
import type { FileSchema } from '../schema'

export interface ShareUrlDialogProps {
  open: boolean
  file: FileSchema | null
  onOpenChange: (open: boolean) => void
}

const EXPIRATION_OPTIONS = [
  { label: '15 minutes', value: '900' },
  { label: '1 hour', value: '3600' },
  { label: '24 hours', value: '86400' },
  { label: '7 days', value: '604800' },
]

export function ShareUrlDialog({
  open,
  file,
  onOpenChange,
}: ShareUrlDialogProps) {
  const { t } = useTranslation()
  const [expiresIn, setExpiresIn] = useState('3600')
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const mutation = useMutation({
    mutationFn: async () => {
      if (!file) return
      return apiGetTemporaryUrl({
        publicId: file.public_id,
        expiresIn: Number(expiresIn),
      })
    },
    onSuccess: (data) => {
      if (data?.url) {
        setGeneratedUrl(data.url)
        toast.success(t('files.share.generated', 'Temporary link generated'))
      }
    },
    onError: () => {
      toast.error(t('files.share.error', 'Failed to generate temporary link'))
    },
  })

  const handleCopy = async () => {
    if (!generatedUrl) return
    await navigator.clipboard.writeText(generatedUrl)
    setCopied(true)
    toast.success(t('files.share.copied', 'Copied temporary link to clipboard'))
    setTimeout(() => setCopied(false), 2000)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setGeneratedUrl(null)
      setCopied(false)
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <div className='flex items-center gap-2'>
            <ShieldCheck className='text-primary size-5' />
            <DialogTitle>
              {t('files.share.title', 'Share temporary link')}
            </DialogTitle>
          </div>
          <DialogDescription>
            {t(
              'files.share.description',
              'Generate a signed temporary link for this private file. Anyone with this link can access the file until it expires.'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className='flex flex-col gap-4 py-2'>
          <div className='flex flex-col gap-1.5'>
            <label className='text-muted-foreground text-xs font-medium'>
              {t('files.share.duration', 'Link expiration time')}
            </label>
            <div className='flex gap-2'>
              <Select value={expiresIn} onValueChange={setExpiresIn}>
                <SelectTrigger className='w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPIRATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending}
                className='shrink-0 gap-1.5'
              >
                {mutation.isPending ? (
                  <Loader2 className='size-4 animate-spin' />
                ) : (
                  <Link className='size-4' />
                )}
                <span>{t('files.share.generateBtn', 'Generate Link')}</span>
              </Button>
            </div>
          </div>

          {generatedUrl && (
            <div className='bg-muted/30 flex flex-col gap-2 rounded-lg border p-3'>
              <label className='text-foreground text-xs font-semibold'>
                {t('files.share.result', 'Generated link:')}
              </label>
              <div className='flex items-center gap-2'>
                <Input
                  readOnly
                  value={generatedUrl}
                  className='bg-background font-mono text-xs'
                />
                <Button
                  size='icon'
                  variant='secondary'
                  onClick={handleCopy}
                  className='shrink-0'
                  title='Copy link'
                >
                  {copied ? (
                    <Check className='size-4 text-emerald-500' />
                  ) : (
                    <Copy className='size-4' />
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => handleOpenChange(false)}>
            {t('buttons.close', 'Close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
