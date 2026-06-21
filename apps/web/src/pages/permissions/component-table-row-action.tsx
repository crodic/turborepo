import type { Row } from '@tanstack/react-table'
import { Edit2Icon } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import type { PermissionSchema } from './schema'

export default function ComponentTableRowActions({
  row,
}: {
  row: Row<PermissionSchema>
}) {
  const navigate = useNavigate()

  return (
    <Button
      variant='ghost'
      size='icon'
      onClick={() => navigate(`/permissions/${row.original.id}/edit`)}
    >
      <Edit2Icon size={16} className='text-primary' />
    </Button>
  )
}
