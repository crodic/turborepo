import { useState, useMemo } from 'react'
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
  to: parseAsString.withDefault(''),
  status: parseAsArrayOf(parseAsString, ',').withDefault([]),
} as const

export function PageMyEmails() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedEmail, setSelectedEmail] = useState<EmailLogSchema | null>(
    null
  )

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
    .ilike('to', filter.to)
    .in('status', filter.status || [])
    .applySorts(sortParser(sort))

  const { data, isFetching } = useDataMyEmails(builder.build())

  const invalidateEmails = () => {
    queryClient.invalidateQueries({ queryKey: ['my_emails'] })
    queryClient.invalidateQueries({ queryKey: ['email_logs'] })
  }

  const cancelMutation = useMutation({
    mutationFn: apiCancelEmail,
    onSuccess: () => {
      toast.success('Scheduled email cancelled')
      invalidateEmails()
    },
    onError: () => toast.error('Failed to cancel email'),
  })
  const { mutate: cancelEmail } = cancelMutation

  const createMutation = useMutation({
    mutationFn: apiCreateEmail,
    onSuccess: () => {
      toast.success('Email campaign created')
      invalidateEmails()
      setIsFormOpen(false)
    },
    onError: (error) => toast.error(`Failed to create: ${error.message}`),
  })

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; payload: EmailFormSchema }) =>
      apiUpdateEmail({ id: data.id, data: data.payload }),
    onSuccess: () => {
      toast.success('Email campaign updated')
      invalidateEmails()
      setIsFormOpen(false)
    },
    onError: (error) => toast.error(`Failed to update: ${error.message}`),
  })

  const handleFormSubmit = (data: EmailFormSchema) => {
    if (selectedEmail) {
      updateMutation.mutate({ id: selectedEmail.id, payload: data })
    } else {
      createMutation.mutate(data)
    }
  }

  const columns = useMemo(
    () =>
      getEmailTableColumns({
        onEdit: (email) => {
          setSelectedEmail(email)
          setIsFormOpen(true)
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
            <h2 className='text-2xl font-bold tracking-tight'>
              Email Campaigns
            </h2>
            <p className='text-muted-foreground'>
              Manage your messaging campaigns and scheduled announcements.
            </p>
          </div>
          <Button
            onClick={() => {
              setSelectedEmail(null)
              setIsFormOpen(true)
            }}
          >
            <PlusIcon className='me-2 size-4' />
            Create Campaign
          </Button>
        </div>

        <DataTable
          table={table}
          isFetching={isFetching}
          onClickRowAction={(row) => navigate(`/emails/${row.id}/show`)}
        >
          <DataTableToolbar table={table}>
            <DataTableSortList table={table} />
          </DataTableToolbar>
        </DataTable>
      </Main>

      <EmailFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        email={selectedEmail}
        onSubmit={handleFormSubmit}
        isPending={createMutation.isPending || updateMutation.isPending}
      />
    </>
  )
}
