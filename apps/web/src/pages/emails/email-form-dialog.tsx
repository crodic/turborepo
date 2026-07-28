import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EmailForm } from './email-form'
import { type EmailFormSchema, type EmailLogSchema } from './schema'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  email?: EmailLogSchema | null
  isPending?: boolean
  onSubmit: (data: EmailFormSchema) => void
}

export function EmailFormDialog({
  open,
  onOpenChange,
  email,
  isPending,
  onSubmit,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className='flex flex-col gap-0 overflow-hidden rounded-xl border p-0 shadow-2xl sm:max-w-[700px]'
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className='bg-muted/30 flex flex-row items-center justify-between space-y-0 border-b px-4 py-3'>
          <DialogTitle className='text-sm font-semibold'>
            {email ? 'Edit Campaign' : 'New Message'}
          </DialogTitle>
        </DialogHeader>

        <div className='max-h-[85vh] flex-1 overflow-y-auto'>
          <EmailForm
            email={email}
            isPending={isPending}
            onSubmit={onSubmit}
            onCancel={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
