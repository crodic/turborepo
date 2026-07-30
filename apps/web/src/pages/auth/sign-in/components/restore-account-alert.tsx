import { Loader2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface RestoreAccountAlertProps {
  isPending: boolean
  onRestore: () => void
  onCancel: () => void
}

export function RestoreAccountAlert({
  isPending,
  onRestore,
  onCancel,
}: RestoreAccountAlertProps) {
  return (
    <div className='bg-destructive/15 text-destructive rounded-lg border p-4 shadow-sm'>
      <div className='flex items-start gap-3'>
        <div className='flex-1 space-y-2'>
          <h4 className='font-semibold'>Account Scheduled for Deletion</h4>
          <p className='text-sm leading-snug'>
            Your account is scheduled for deletion and cannot be accessed. Do
            you want to cancel the deletion and restore your account?
          </p>
          <div className='flex gap-2 pt-2'>
            <Button
              size='sm'
              variant='destructive'
              onClick={onRestore}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              ) : (
                <RotateCcw className='mr-2 h-4 w-4' />
              )}
              Restore Account
            </Button>
            <Button
              size='sm'
              variant='outline'
              onClick={onCancel}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
