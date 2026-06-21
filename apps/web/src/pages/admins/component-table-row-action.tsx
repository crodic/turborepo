import { useState } from 'react'
import { AxiosError } from 'axios'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Row } from '@tanstack/react-table'
import { Edit2Icon, Trash2Icon } from 'lucide-react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { DeleteAlertDialog } from '@/components/common/delete-alert-dialog'
import { deleteAdmin } from './queries'
import { type AdminSchema } from './schema'

export default function ComponentTableRowActions({
  row,
}: {
  row: Row<AdminSchema>
}) {
  const { id } = useAuthStore()
  const queryClient = useQueryClient()
  const [isShowDeleteDialog, setIsShowDeleteDialog] = useState(false)

  const deleteUserMutation = useMutation({
    mutationFn: deleteAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['admins'],
      })
      toast.success('Admin deleted successfully')
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
        <Link
          to={`/admins/${row.original.id}/edit`}
          className={cn({ 'pointer-events-none': row.original.id === id })}
        >
          <Edit2Icon
            size={16}
            className={
              row.original.id === id ? 'text-primary/50' : 'text-primary'
            }
          />
        </Link>
      </Button>
      <Button
        variant='ghost'
        size='icon'
        disabled={row.original.id === id}
        onClick={() => setIsShowDeleteDialog(true)}
      >
        <Trash2Icon size={16} className='text-destructive' />
      </Button>
    </div>
  )
}
