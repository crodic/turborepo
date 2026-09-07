import { useState } from 'react'
import { AxiosError } from 'axios'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Row } from '@tanstack/react-table'
import { Edit2Icon, Trash2Icon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { DeleteAlertDialog } from '@/components/common/delete-alert-dialog'
import { apiDeleteRole } from './queries'
import { isProtectedRole, type RoleSchema } from './schema'

export default function ComponentTableRowActions({
  row,
}: {
  row: Row<RoleSchema>
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [isShowDeleteDialog, setIsShowDeleteDialog] = useState(false)

  const isProtected = isProtectedRole(row.original)

  const deleteRoleMutation = useMutation({
    mutationFn: apiDeleteRole,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['roles'],
      })
      toast.success(t('roles.message.deleteRoleSuccess'))
      setIsShowDeleteDialog(false)
    },
    onError: (error) => {
      if (error instanceof AxiosError) {
        toast.error(error.response?.data.message)
      }
    },
  })

  const handleDelete = () => {
    if (isProtected) {
      toast.error(t('roles.message.systemRoleCannotBeDeleted'))
      return
    }

    deleteRoleMutation.mutate(row.original.id)
  }

  return (
    <div className='flex items-center gap-1'>
      {isShowDeleteDialog && (
        <DeleteAlertDialog
          open={isShowDeleteDialog}
          onOpenChange={(open) => setIsShowDeleteDialog(open)}
          handleDelete={handleDelete}
          isLoading={deleteRoleMutation.isPending}
        />
      )}
      <Button
        variant='ghost'
        size='icon'
        onClick={() => {
          navigate(`/roles/${row.original.id}/edit`)
        }}
        disabled={isProtected}
        title={
          isProtected ? t('roles.message.systemRoleCannotBeUpdated') : undefined
        }
      >
        <Edit2Icon
          size={16}
          className={isProtected ? 'text-muted-foreground' : 'text-primary'}
        />
      </Button>
      <Button
        variant='ghost'
        size='icon'
        onClick={() => setIsShowDeleteDialog(true)}
        disabled={isProtected}
        title={
          isProtected ? t('roles.message.systemRoleCannotBeDeleted') : undefined
        }
      >
        <Trash2Icon
          size={16}
          className={isProtected ? 'text-muted-foreground' : 'text-destructive'}
        />
      </Button>
    </div>
  )
}
