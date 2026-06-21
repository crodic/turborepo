import { useState } from 'react'
import { AxiosError } from 'axios'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Row } from '@tanstack/react-table'
import { Edit2Icon, Trash2Icon } from 'lucide-react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { DeleteAlertDialog } from '@/components/common/delete-alert-dialog'
import { apiDeleteUser } from '../users/queries'
import { type UserSchema } from '../users/schema'

export default function ComponentTableRowActions({
  row,
}: {
  row: Row<UserSchema>
}) {
  const queryClient = useQueryClient()
  const [isShowDeleteDialog, setIsShowDeleteDialog] = useState(false)

  const deleteUserMutation = useMutation({
    mutationFn: apiDeleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['users'],
      })
      toast.success('User deleted successfully')
      setIsShowDeleteDialog(false)
    },
    onError: (error) => {
      if (error instanceof AxiosError) {
        toast.error(error.response?.data.message)
      }
    },
  })

  const handleDelete = (id: string) => {
    deleteUserMutation.mutate(id)
  }

  return (
    <div>
      {isShowDeleteDialog && (
        <DeleteAlertDialog
          open={isShowDeleteDialog}
          onOpenChange={(open) => setIsShowDeleteDialog(open)}
          handleDelete={() => handleDelete(row.original.id)}
          isLoading={deleteUserMutation.isPending}
        />
      )}

      <Button variant='ghost' size='icon' asChild>
        <Link to={`/users/${row.original.id}/edit`}>
          <Edit2Icon size={16} className='text-primary' />
        </Link>
      </Button>
      <Button
        variant='ghost'
        size='icon'
        onClick={() => setIsShowDeleteDialog(true)}
      >
        <Trash2Icon size={16} className='text-destructive' />
      </Button>
    </div>
  )
}
