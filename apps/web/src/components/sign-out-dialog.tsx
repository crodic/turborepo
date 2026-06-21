import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router'
import { useAuthStore } from '@/stores/auth-store'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { apiSignOut } from '@/pages/auth/queries'

interface SignOutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SignOutDialog({ open, onOpenChange }: SignOutDialogProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { logout, meta } = useAuthStore()

  const handleSignOut = async () => {
    await apiSignOut(meta.refreshToken)
    logout()

    const currentPath = location.pathname
    navigate(`/sign-in${currentPath ? `?redirect=${currentPath}` : ''}`, {
      replace: true,
    })
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('signOut.title')}
      desc={t('signOut.description')}
      confirmText={t('signOut.buttonSignOut')}
      cancelBtnText={t('signOut.buttonCancel')}
      destructive
      handleConfirm={handleSignOut}
      className='sm:max-w-sm'
    />
  )
}
