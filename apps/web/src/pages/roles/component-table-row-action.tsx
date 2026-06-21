import { useState } from 'react'
import { AxiosError } from 'axios'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Row } from '@tanstack/react-table'
import { Edit2Icon, Trash2Icon } from 'lucide-react'
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
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [isShowDeleteDialog, setIsShowDeleteDialog] = useState(false)

  const deleteRoleMutation = useMutation({
    mutationFn: apiDeleteRole,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['roles'],
      })
      toast.success('Role deleted successfully')
      setIsShowDeleteDialog(false)
    },
    onError: (error) => {
      if (error instanceof AxiosError) {
        toast.error(error.response?.data.message)
      }
    },
  })

  const handleDelete = () => {
    if (isProtectedRole(row.original)) {
      toast.error('System roles cannot be deleted')
      return
    }

    deleteRoleMutation.mutate(row.original.id)
  }

  const isProtected = isProtectedRole(row.original)

  return (
    <div>
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
      >
        <Edit2Icon size={16} className='text-primary' />
      </Button>
      <Button
        variant='ghost'
        size='icon'
        onClick={() => setIsShowDeleteDialog(true)}
        disabled={isProtected}
      >
        <Trash2Icon size={16} className='text-destructive' />
      </Button>
    </div>
  )
}
