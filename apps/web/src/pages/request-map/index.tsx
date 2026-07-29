import { useMemo } from 'react'
import { parseAsString } from 'nuqs'
import { PaginateQueryBuilder } from '@/lib/query-builder'
import { sortParser } from '@/lib/utils'
import { useDataTable } from '@/hooks/use-data-table'
import useGetFilterParams from '@/hooks/use-get-filter-params'
import {
  Map,
  MapMarker,
  MapPopup,
  MapMarkerClusterGroup,
  MapTileLayer,
  MapZoomControl,
} from '@/components/ui/map'
import { ConfigDrawer } from '@/components/config-drawer'
import { DataTable } from '@/components/data-table/data-table'
import { DataTableSortList } from '@/components/data-table/data-table-sort-list'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { getRequestLogColumns } from './columns'
import { useDataRequestLogs, useDataRequestMapLogs } from './queries'
import { ColumnKey, type RequestLogSchema } from './schema'

const requestLogFilterParsers = {
  method: parseAsString.withDefault(''),
} as const

export function PageRequestMap() {
  const {
    page,
    perPage,
    sorting: sort,
    filter,
  } = useGetFilterParams<RequestLogSchema, typeof requestLogFilterParsers>({
    allowedSorts: [
      ColumnKey.timestamp,
      ColumnKey.duration,
      ColumnKey.status,
      ColumnKey.method,
    ],
    filterParsers: requestLogFilterParsers,
  })

  const builder = new PaginateQueryBuilder()
    .page(page)
    .limit(perPage)
    .ilike('method', filter.method)
    .sortBy(sortParser(sort).sortBy, sortParser(sort).sortDirection)

  const { data, isFetching } = useDataRequestLogs(builder.build())
  const { data: mapLogs } = useDataRequestMapLogs()
  const columns = useMemo(() => getRequestLogColumns(), [])
  const totalPages = data?.meta.totalPages ?? 0

  const { table } = useDataTable({
    data: data?.data ?? [],
    columns,
    pageCount: totalPages,
    initialState: {
      sorting: [{ id: ColumnKey.timestamp, desc: true }],
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
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>
            Request Map & Logs
          </h2>
          <p className='text-muted-foreground'>
            Geographical overview of system requests and detailed execution
            logs.
          </p>
        </div>

        {/* Map Container */}
        <div className='h-[400px] w-full overflow-hidden rounded-lg border'>
          <Map
            center={[21.028511, 105.804817]} // default Hanoi
            zoom={3}
            maxZoom={18}
            className='h-full w-full'
          >
            <MapTileLayer />
            <MapZoomControl />
            <MapMarkerClusterGroup>
              {mapLogs
                ?.filter((log) => log.latitude != null && log.longitude != null)
                .map((log) => (
                  <MapMarker
                    key={log.id}
                    position={[log.latitude as number, log.longitude as number]}
                  >
                    <MapPopup>
                      <div className='flex flex-col gap-1 text-sm'>
                        <span className='text-primary font-semibold'>
                          {log.method} {log.path}
                        </span>
                        <span>Status: {log.status}</span>
                        <span>IP: {log.ip}</span>
                        <span>Duration: {log.duration}ms</span>
                      </div>
                    </MapPopup>
                  </MapMarker>
                ))}
            </MapMarkerClusterGroup>
          </Map>
        </div>

        {/* Data Table Container */}
        <DataTable table={table} isFetching={isFetching}>
          <DataTableToolbar table={table}>
            <DataTableSortList table={table} />
          </DataTableToolbar>
        </DataTable>
      </Main>
    </>
  )
}
