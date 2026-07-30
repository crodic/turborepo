import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { apiDeleteAccount, apiSignOut } from '@/pages/auth/queries'

export default function DeleteAccount() {
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()
  const { logout } = useAuthStore()

  const deleteAccountMutation = useMutation({
    mutationFn: apiDeleteAccount,
    onSuccess: async () => {
      toast.success('Account has been scheduled for deletion.')
      await apiSignOut()
      logout()
      navigate('/auth/sign-in', { replace: true })
    },
    onError: () => {
      toast.error('Failed to delete account. Please try again.')
      setIsOpen(false)
    },
  })

  function handleDelete() {
    deleteAccountMutation.mutate()
  }

  return (
    <Card className='border-destructive bg-destructive/10'>
      <CardHeader>
        <CardTitle>Delete Account</CardTitle>
        <CardDescription>
          Permanently delete your account and all of your data.
        </CardDescription>
      </CardHeader>
      <CardContent className='text-sm'>
        <p>
          Once you delete your account, there is no going back after 30 days.
          Please be certain. Your account will be temporarily deactivated and
          permanently deleted after the grace period.
        </p>
      </CardContent>
      <CardFooter>
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
          <AlertDialogTrigger asChild>
            <Button variant='destructive'>Delete Account</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action will schedule your account for deletion. You have 30
                days to cancel this request by logging in and restoring your
                account. After 30 days, your account and data will be
                permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteAccountMutation.isPending}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                onClick={(e) => {
                  e.preventDefault()
                  handleDelete()
                }}
                disabled={deleteAccountMutation.isPending}
              >
                {deleteAccountMutation.isPending && (
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                )}
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  )
}
