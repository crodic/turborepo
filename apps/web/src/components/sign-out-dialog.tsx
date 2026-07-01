import { useState } from 'react'
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
  const [isLoading, setIsLoading] = useState(false)
  const { logout, meta } = useAuthStore()

  const handleSignOut = async () => {
    setIsLoading(true)
    try {
      await apiSignOut(meta.refreshToken)
      logout()
    } catch (_error) {
      //
    } finally {
      const currentPath = location.pathname
      navigate(`/sign-in${currentPath ? `?redirect=${currentPath}` : ''}`, {
        replace: true,
      })
      setIsLoading(false)
    }
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
      isLoading={isLoading}
    />
  )
}
