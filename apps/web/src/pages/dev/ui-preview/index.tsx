import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { useDataTable } from '@/hooks/use-data-table'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { ConfigDrawer } from '@/components/config-drawer'
import {
  DataTable,
  DataTableExpandingCell,
} from '@/components/data-table/data-table'
import { DataTableViewOptions } from '@/components/data-table/data-table-view-options'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'

function getWorkflowStatusVariant(status: WorkflowDemoRow['status']) {
  switch (status) {
    case 'healthy':
      return 'default'
    case 'warning':
      return 'secondary'
    case 'blocked':
      return 'destructive'
  }
}

type WorkflowDemoRow = {
  id: string
  name: string
  kind: 'company' | 'team' | 'workflow'
  owner: string
  status: 'healthy' | 'warning' | 'blocked'
  lastRun: string
  gross?: string
  priority: 'low' | 'medium' | 'high'
  region: string
  environment: string
  sla: string
  latency: string
  errors: number
  throughput: string
  storage: string
  cost: string
  release: string
  assignee: string
  subRows?: WorkflowDemoRow[]
}

const workflowDemoRows = createWorkflowDemoRows()

function createWorkflowDemoRows(): WorkflowDemoRow[] {
  const companies = [
    'Platform',
    'Operations',
    'Commerce',
    'Identity',
    'Analytics',
    'Messaging',
    'Media',
    'Trust',
  ]
  const teams = ['Core', 'Automation', 'Integrations', 'Insights', 'Delivery']
  const workflows = [
    'File processing',
    'Storage sync',
    'Health rollup',
    'Notifications',
    'Billing sync',
    'Permission audit',
    'Report export',
    'Webhook replay',
    'Search indexing',
    'Session cleanup',
  ]

  return companies.map((company, companyIndex) => {
    const companyChildren = teams.map((team, teamIndex) => {
      const teamChildren = workflows.map((workflow, workflowIndex) =>
        makeWorkflowDemoRow({
          id: `${company}-${team}-${workflow}`
            .toLowerCase()
            .replace(/\s/g, '-'),
          name: workflow,
          kind: 'workflow',
          owner: team,
          seed: companyIndex * 100 + teamIndex * 10 + workflowIndex,
        })
      )

      return makeWorkflowDemoRow({
        id: `${company}-${team}`.toLowerCase().replace(/\s/g, '-'),
        name: `${team} (${teamChildren.length})`,
        kind: 'team',
        owner: company,
        seed: companyIndex * 10 + teamIndex,
        subRows: teamChildren,
      })
    })

    return makeWorkflowDemoRow({
      id: company.toLowerCase(),
      name: `${company} (${companyChildren.length * workflows.length})`,
      kind: 'company',
      owner: company,
      seed: companyIndex,
      subRows: companyChildren,
    })
  })
}

function makeWorkflowDemoRow({
  id,
  name,
  kind,
  owner,
  seed,
  subRows,
}: {
  id: string
  name: string
  kind: WorkflowDemoRow['kind']
  owner: string
  seed: number
  subRows?: WorkflowDemoRow[]
}): WorkflowDemoRow {
  const statuses: WorkflowDemoRow['status'][] = [
    'healthy',
    'warning',
    'blocked',
  ]
  const priorities: WorkflowDemoRow['priority'][] = ['low', 'medium', 'high']
  const regions = ['us-east', 'us-west', 'eu-central', 'ap-southeast']
  const environments = ['production', 'staging', 'preview']
  const status = kind === 'company' ? statuses[seed % 2] : statuses[seed % 3]

  return {
    id,
    name,
    kind,
    owner,
    status,
    priority: priorities[seed % priorities.length],
    region: regions[seed % regions.length],
    environment: environments[seed % environments.length],
    lastRun: `${(seed % 59) + 1} minutes ago`,
    gross:
      status === 'blocked'
        ? 'Paused'
        : `${(99.95 - (seed % 18) / 10).toFixed(2)}%`,
    sla: `${(99.9 - (seed % 8) / 100).toFixed(2)}%`,
    latency: `${80 + (seed % 37) * 7} ms`,
    errors: seed % 11,
    throughput: `${1_200 + seed * 17}/min`,
    storage: `${12 + (seed % 90)} GB`,
    cost: `$${(120 + seed * 3.75).toFixed(2)}`,
    release: `2026.${(seed % 12) + 1}.${(seed % 28) + 1}`,
    assignee: ['Ada', 'Grace', 'Linus', 'Margaret', 'Ken'][seed % 5],
    subRows,
  }
}

export function PageUiPreview() {
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

      <Main className='flex flex-1 flex-col gap-6'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight md:text-3xl'>
            UI Preview
          </h1>
          <p className='text-muted-foreground'>
            Preview complex UI components like the DataTable feature playground.
          </p>
        </div>
        <ExpandingDataTableDemo />
      </Main>
    </>
  )
}

function ExpandingDataTableDemo() {
  const [enableExpanding, setEnableExpanding] = useState(true)
  const [enableVirtualRows, setEnableVirtualRows] = useState(true)
  const [enableVirtualColumns, setEnableVirtualColumns] = useState(true)
  const [enableInfinite, setEnableInfinite] = useState(false)
  const [loadedGroups, setLoadedGroups] = useState(3)
  const [isLoadingMoreGroups, setIsLoadingMoreGroups] = useState(false)
  const tableData = useMemo(
    () =>
      enableInfinite
        ? workflowDemoRows.slice(0, loadedGroups)
        : workflowDemoRows,
    [enableInfinite, loadedGroups]
  )
  const visibleLeafRows = useMemo(
    () => countWorkflowLeafRows(tableData),
    [tableData]
  )
  const hasMoreGroups = loadedGroups < workflowDemoRows.length
  const columns = useMemo<ColumnDef<WorkflowDemoRow>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Group',
        cell: ({ row }) => (
          <DataTableExpandingCell row={row}>
            <div className='min-w-0'>
              <p className='truncate font-medium'>{row.original.name}</p>
              <p className='text-muted-foreground truncate text-xs'>
                {row.original.kind}
              </p>
            </div>
          </DataTableExpandingCell>
        ),
        minSize: 280,
      },
      {
        accessorKey: 'gross',
        header: 'Gross',
        cell: ({ row }) => row.original.gross ?? '-',
      },
      {
        accessorKey: 'owner',
        header: 'Company',
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <Badge variant={getWorkflowStatusVariant(row.original.status)}>
            {row.original.status}
          </Badge>
        ),
      },
      {
        accessorKey: 'lastRun',
        header: 'Last run',
      },
      {
        accessorKey: 'priority',
        header: 'Priority',
        cell: ({ row }) => (
          <Badge variant='outline'>{row.original.priority}</Badge>
        ),
      },
      {
        accessorKey: 'region',
        header: 'Region',
      },
      {
        accessorKey: 'environment',
        header: 'Environment',
      },
      {
        accessorKey: 'sla',
        header: 'SLA',
      },
      {
        accessorKey: 'latency',
        header: 'Latency',
      },
      {
        accessorKey: 'errors',
        header: 'Errors',
      },
      {
        accessorKey: 'throughput',
        header: 'Throughput',
      },
      {
        accessorKey: 'storage',
        header: 'Storage',
      },
      {
        accessorKey: 'cost',
        header: 'Cost',
      },
      {
        accessorKey: 'release',
        header: 'Release',
      },
      {
        accessorKey: 'assignee',
        header: 'Assignee',
      },
    ],
    []
  )

  const { table } = useDataTable({
    data: tableData,
    columns,
    pageCount: 1,
    initialState: {
      pagination: { pageIndex: 0, pageSize: 10 },
      columnVisibility: {
        environment: false,
        sla: false,
        latency: false,
        errors: false,
        throughput: false,
        storage: false,
        cost: false,
        release: false,
        assignee: false,
      },
    },
    queryKeys: {
      page: 'dashboardSubRowsPage',
      perPage: 'dashboardSubRowsPerPage',
      sort: 'dashboardSubRowsSort',
    },
    getRowId: (row) => row.id,
    getSubRows: (row) => row.subRows,
    enableExpanding,
  })

  return (
    <Card className='min-w-0 overflow-hidden'>
      <CardHeader className='gap-4'>
        <div>
          <CardTitle>DataTable feature playground</CardTitle>
          <CardDescription>
            Toggle expanding, virtual rows, virtual columns, and mock infinite
            loading against a larger tree dataset.
          </CardDescription>
        </div>
        <div className='flex min-w-0 flex-wrap gap-2'>
          <DemoSwitch
            label='Expanding'
            checked={enableExpanding}
            onCheckedChange={setEnableExpanding}
          />
          <DemoSwitch
            label='Virtual rows'
            checked={enableVirtualRows}
            onCheckedChange={setEnableVirtualRows}
          />
          <DemoSwitch
            label='Virtual columns'
            checked={enableVirtualColumns}
            onCheckedChange={setEnableVirtualColumns}
          />
          <DemoSwitch
            label='Infinite mock'
            checked={enableInfinite}
            onCheckedChange={(checked) => {
              setEnableInfinite(checked)
              setLoadedGroups(checked ? 3 : workflowDemoRows.length)
              setIsLoadingMoreGroups(false)
            }}
          />
        </div>
        <div className='text-muted-foreground flex flex-wrap gap-2 text-xs'>
          <Badge variant='secondary'>{tableData.length} groups loaded</Badge>
          <Badge variant='secondary'>{visibleLeafRows} workflows</Badge>
          <Badge variant='secondary'>
            {table.getVisibleLeafColumns().length} / {columns.length} columns
          </Badge>
        </div>
      </CardHeader>
      <CardContent className='min-w-0 overflow-hidden'>
        <div className='mb-2 flex min-w-0 items-center justify-between gap-3'>
          <p className='text-muted-foreground text-xs'>
            Extra metric columns are hidden by default to keep the dashboard
            layout stable.
          </p>
          <DataTableViewOptions table={table} />
        </div>
        <div className='max-w-full min-w-0 overflow-hidden'>
          <DataTable
            className='min-w-0'
            table={table}
            enableVirtualRows={enableVirtualRows}
            enableVirtualColumns={enableVirtualColumns}
            virtualHeight={520}
            hidePagination={enableVirtualRows || enableInfinite}
            onVirtualEndReached={
              enableInfinite && hasMoreGroups && !isLoadingMoreGroups
                ? () => {
                    setIsLoadingMoreGroups(true)
                    window.setTimeout(() => {
                      setLoadedGroups((current) =>
                        Math.min(current + 1, workflowDemoRows.length)
                      )
                      setIsLoadingMoreGroups(false)
                    }, 250)
                  }
                : undefined
            }
          />
        </div>
        {enableInfinite && (
          <p className='text-muted-foreground mt-2 text-center text-xs'>
            {hasMoreGroups
              ? isLoadingMoreGroups
                ? 'Loading more mock groups...'
                : 'Scroll near the bottom to load more mock groups.'
              : 'All mock groups loaded.'}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function DemoSwitch({
  label,
  checked,
  onCheckedChange,
}: {
  label: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <label className='flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm sm:w-[180px]'>
      <span>{label}</span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  )
}

function countWorkflowLeafRows(rows: WorkflowDemoRow[]): number {
  return rows.reduce((total, row) => {
    if (!row.subRows?.length) return total + 1
    return total + countWorkflowLeafRows(row.subRows)
  }, 0)
}
