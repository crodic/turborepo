import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()
  const { logout } = useAuthStore()

  const deleteAccountMutation = useMutation({
    mutationFn: apiDeleteAccount,
    onSuccess: async () => {
      toast.success(
        t('settings.account.deleteSuccess', {
          defaultValue: 'Account has been scheduled for deletion.',
        })
      )
      await apiSignOut()
      logout()
      navigate('/auth/sign-in', { replace: true })
    },
    onError: () => {
      toast.error(
        t('settings.account.deleteError', {
          defaultValue: 'Failed to delete account. Please try again.',
        })
      )
      setIsOpen(false)
    },
  })

  function handleDelete() {
    deleteAccountMutation.mutate()
  }

  return (
    <Card className='border-destructive bg-destructive/10'>
      <CardHeader>
        <CardTitle>{t('settings.account.deleteAccountTitle')}</CardTitle>
        <CardDescription>
          {t('settings.account.deleteAccountDesc')}
        </CardDescription>
      </CardHeader>
      <CardContent className='text-sm'>
        <p>{t('settings.account.deleteAccountWarning')}</p>
      </CardContent>
      <CardFooter>
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
          <AlertDialogTrigger asChild>
            <Button variant='destructive'>
              {t('settings.account.deleteAccountTitle')}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t('common.dialog.areYouSure', {
                  defaultValue: 'Are you absolutely sure?',
                })}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t('settings.account.deleteAccountConfirmDesc', {
                  defaultValue:
                    'This action will schedule your account for deletion. You have 30 days to cancel this request by logging in and restoring your account. After 30 days, your account and data will be permanently deleted.',
                })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteAccountMutation.isPending}>
                {t('common.actions.cancel', { defaultValue: 'Cancel' })}
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
                {t('common.actions.continue', { defaultValue: 'Continue' })}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  )
}
