import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { PlusIcon } from 'lucide-react'
import { parseAsArrayOf, parseAsString } from 'nuqs'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { PaginateQueryBuilder } from '@/lib/query-builder'
import { sortParser } from '@/lib/utils'
import { useDataTable } from '@/hooks/use-data-table'
import useGetFilterParams from '@/hooks/use-get-filter-params'
import { Button } from '@/components/ui/button'
import { ConfigDrawer } from '@/components/config-drawer'
import { DataTable } from '@/components/data-table/data-table'
import { DataTableSortList } from '@/components/data-table/data-table-sort-list'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { getEmailTableColumns } from './columns'
import { EmailFormDialog } from './email-form-dialog'
import {
  apiCancelEmail,
  apiCreateEmail,
  apiUpdateEmail,
  useDataMyEmails,
} from './queries'
import { ColumnKey, type EmailFormSchema, type EmailLogSchema } from './schema'

const emailFilterParsers = {
  subject: parseAsString.withDefault(''),
  status: parseAsArrayOf(parseAsString, ',').withDefault([]),
} as const

export function PageMyEmails() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEmail, setEditingEmail] = useState<EmailLogSchema | null>(null)

  const {
    page,
    perPage,
    sorting: sort,
    filter,
  } = useGetFilterParams<EmailLogSchema, typeof emailFilterParsers>({
    allowedSorts: [
      ColumnKey.createdAt,
      ColumnKey.scheduledAt,
      ColumnKey.sentAt,
      ColumnKey.status,
    ],
    filterParsers: emailFilterParsers,
  })

  const builder = new PaginateQueryBuilder()
    .page(page)
    .limit(perPage)
    .ilike('subject', filter.subject)
    .in('status', filter.status || [])
    .sortBy(sortParser(sort).sortBy, sortParser(sort).sortDirection)

  const { data, isFetching } = useDataMyEmails(builder.build())

  const invalidateEmails = () => {
    queryClient.invalidateQueries({ queryKey: ['my_emails'] })
    queryClient.invalidateQueries({ queryKey: ['email_logs'] })
  }

  const createMutation = useMutation({
    mutationFn: apiCreateEmail,
    onSuccess: () => {
      toast.success('Email queued successfully')
      setDialogOpen(false)
      invalidateEmails()
    },
    onError: () => toast.error('Failed to send email'),
  })

  const updateMutation = useMutation({
    mutationFn: apiUpdateEmail,
    onSuccess: () => {
      toast.success('Scheduled email updated')
      setDialogOpen(false)
      setEditingEmail(null)
      invalidateEmails()
    },
    onError: () => toast.error('Failed to update email'),
  })

  const cancelMutation = useMutation({
    mutationFn: apiCancelEmail,
    onSuccess: () => {
      toast.success('Scheduled email cancelled')
      invalidateEmails()
    },
    onError: () => toast.error('Failed to cancel email'),
  })
  const { mutate: cancelEmail } = cancelMutation

  const columns = useMemo(
    () =>
      getEmailTableColumns({
        onEdit: (email) => {
          setEditingEmail(email)
          setDialogOpen(true)
        },
        onCancel: (email) => cancelEmail(email.id),
      }),
    [cancelEmail]
  )
  const totalPages = data?.meta.totalPages ?? 0
  const { table } = useDataTable({
    data: data?.data ?? [],
    columns,
    pageCount: totalPages,
    initialState: {
      columnPinning: { right: ['actions'] },
      sorting: [{ id: ColumnKey.createdAt, desc: true }],
    },
    getRowId: (row) => row.id,
  })

  function submitEmail(form: EmailFormSchema) {
    if (editingEmail) {
      updateMutation.mutate({ id: editingEmail.id, data: form })
      return
    }

    createMutation.mutate(form)
  }

  return (
    <>
      <Header fixed>
        <div className='ms-auto flex items-center space-x-4'>
          <Search />
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main fluid className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>My Emails</h2>
            <p className='text-muted-foreground'>
              Review emails you sent or scheduled.
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingEmail(null)
              setDialogOpen(true)
            }}
          >
            <PlusIcon className='me-2 size-4' />
            Send new email
          </Button>
        </div>
        <DataTable
          table={table}
          onClickRowAction={(email) => navigate(`/emails/${email.id}/show`)}
          isFetching={isFetching}
        >
          <DataTableToolbar table={table}>
            <DataTableSortList table={table} />
          </DataTableToolbar>
        </DataTable>
      </Main>

      <EmailFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditingEmail(null)
        }}
        email={editingEmail}
        isPending={createMutation.isPending || updateMutation.isPending}
        onSubmit={submitEmail}
      />
    </>
  )
}
