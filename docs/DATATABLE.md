# DataTable Guide

This document explains how to use the shared DataTable system in `apps/web`.
It is written for pages that need admin-style tables with URL-driven pagination,
sorting, filtering, column visibility, row selection, row actions, expanding
rows, and optional virtualization.

## Main Pieces

The DataTable feature is split into a few reusable parts:

- `useDataTable` in `apps/web/src/hooks/use-data-table.ts`
  - Creates the TanStack Table instance.
  - Owns table state for pagination, sorting, filters, row selection, expanded rows, and column visibility.
  - Syncs page, page size, sorting, and filters to URL query params with `nuqs`.
- `DataTable` in `apps/web/src/components/data-table/data-table.tsx`
  - Renders the table UI, loading state, empty state, pagination, optional row click handling, optional sub-row detail panels, virtual rows, virtual columns, and virtual infinite scrolling callbacks.
- `DataTableToolbar`
  - Renders column filters from `columnDef.meta`.
  - Includes column visibility controls through `DataTableViewOptions`.
- `DataTableSortList`
  - Provides the “Sort” popover for multi-sort configuration.
- `DataTableColumnHeader`
  - Standard table header component used by most columns.

Most pages follow this shape:

```tsx
const columns = useMemo(() => getMyTableColumns(), []);

const { table } = useDataTable({
  data: data?.data ?? [],
  columns,
  pageCount: data?.meta.totalPages ?? 0,
  initialState: {
    columnPinning: { right: ['actions'] },
  },
  getRowId: (row) => row.id,
});

return (
  <DataTable table={table} isFetching={isFetching}>
    <DataTableToolbar table={table}>
      <DataTableSortList table={table} />
    </DataTableToolbar>
  </DataTable>
);
```

## Server-Side Data Flow

The project’s DataTable is designed primarily for server-side pagination,
sorting, and filtering.

`useDataTable` sets:

```ts
manualPagination: true;
manualSorting: true;
manualFiltering: true;
```

That means the table does not fetch data by itself. Your page must:

1. Read query params.
2. Build API params.
3. Fetch data with React Query.
4. Pass `data` and `pageCount` into `useDataTable`.

Example:

```tsx
const {
  page,
  perPage,
  sorting: sort,
  filter,
} = useGetFilterParams<MySchema, typeof myFilterParsers>({
  allowedSorts: [ColumnKey.email, ColumnKey.createdAt],
  filterParsers: myFilterParsers,
});

const builder = new PaginateQueryBuilder()
  .page(page)
  .limit(perPage)
  .ilike('email', filter.email)
  .sortBy(sortParser(sort).sortBy, sortParser(sort).sortDirection);

const { data, isFetching } = useMyOverview(builder.build());

const { table } = useDataTable({
  data: data?.data ?? [],
  columns,
  pageCount: data?.meta.totalPages ?? 0,
  getRowId: (row) => row.id,
});
```

## URL Query State

By default, `useDataTable` uses these query keys:

- `page`
- `perPage`
- `sort`
- `filters`
- `joinOperator`

You can override them when multiple tables live on the same page:

```tsx
const { table } = useDataTable({
  data,
  columns,
  pageCount,
  queryKeys: {
    page: 'adminsPage',
    perPage: 'adminsPerPage',
    sort: 'adminsSort',
    filters: 'adminsFilters',
    joinOperator: 'adminsJoinOperator',
  },
});
```

Use unique query keys for dashboard/demo tables or nested tables to avoid state
collisions with other tables on the same route.

## Defining Columns

Columns are regular TanStack `ColumnDef<TData>[]`.

Use stable `id` values that match:

- backend sortable/filterable fields,
- `ColumnKey` constants,
- `useGetFilterParams` parsers,
- `PaginateQueryBuilder` fields.

Example:

```tsx
export function getAdminsTableColumns(): ColumnDef<AdminSchema>[] {
  return [
    {
      id: ColumnKey.email,
      accessorFn: (row) => row.email,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Email" />
      ),
      cell: ({ row }) => <span>{row.original.email}</span>,
      meta: {
        label: 'Email',
        placeholder: 'Search email...',
        variant: 'text',
        icon: MailIcon,
      },
      enableColumnFilter: true,
      enableSorting: true,
    },
  ];
}
```

## Column Meta and Filters

`DataTableToolbar` reads `column.columnDef.meta` to render filters.

Supported filter variants are declared in `apps/web/src/types/data-table.ts` and
configured in `apps/web/src/config/data-table`.

Common variants:

- `text`
- `number`
- `range`
- `date`
- `dateRange`
- `select`
- `multiSelect`
- `asyncSelect`
- `multiAsyncSelect`

Text filter:

```tsx
meta: {
  label: 'Email',
  placeholder: 'Search email...',
  variant: 'text',
  icon: MailIcon,
},
enableColumnFilter: true,
```

Multi-select filter:

```tsx
meta: {
  label: 'Role',
  variant: 'multiSelect',
  options: roles.map((role) => ({
    label: role.name,
    value: role.id,
  })),
},
enableColumnFilter: true,
```

Async select filter:

```tsx
meta: {
  label: 'Owner',
  variant: 'asyncSelect',
  searchKey: 'name',
  fetchOptions: async (params) => {
    const response = await apiGetOwners(params)
    return {
      data: response.data.map((owner) => ({
        label: owner.name,
        value: owner.id,
      })),
      meta: { totalItems: response.meta.totalItems },
    }
  },
},
enableColumnFilter: true,
```

## Sorting

A column can be sorted when `enableSorting` is true.

Use `DataTableSortList` inside `DataTableToolbar`:

```tsx
<DataTable table={table}>
  <DataTableToolbar table={table}>
    <DataTableSortList table={table} />
  </DataTableToolbar>
</DataTable>
```

In the page, make sure `allowedSorts` includes only fields supported by the API:

```tsx
const { sorting: sort } = useGetFilterParams<MySchema, typeof parsers>({
  allowedSorts: [ColumnKey.name, ColumnKey.createdAt],
  filterParsers: parsers,
});
```

Then pass parsed sorting to `PaginateQueryBuilder`:

```tsx
.sortBy(sortParser(sort).sortBy, sortParser(sort).sortDirection)
```

## Pagination

`DataTable` renders `DataTablePagination` by default.

The default page size options are:

```ts
[10, 20, 30, 40, 50];
```

If your table sets `initialState.pagination.pageSize`, make sure the page size
exists in the pagination options. Otherwise the select can appear blank.

Example:

```tsx
initialState: {
  pagination: { pageIndex: 0, pageSize: 10 },
}
```

For virtual infinite scrolling tables, hide pagination:

```tsx
<DataTable table={table} enableVirtualRows hidePagination />
```

## Row Selection

`useDataTable` enables row selection by default:

```ts
enableRowSelection: true;
```

Add a select column when the UI should expose selection:

```tsx
{
  id: 'select',
  header: ({ table }) => (
    <Checkbox
      checked={
        table.getIsAllPageRowsSelected() ||
        (table.getIsSomePageRowsSelected() && 'indeterminate')
      }
      onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
      aria-label="Select all"
    />
  ),
  cell: ({ row }) => (
    <Checkbox
      checked={row.getIsSelected()}
      onCheckedChange={(value) => row.toggleSelected(!!value)}
      aria-label="Select row"
    />
  ),
  size: 32,
  enableSorting: false,
  enableHiding: false,
}
```

Use `actionBar` for bulk actions. It only renders when at least one filtered row
is selected:

```tsx
<DataTable table={table} actionBar={<BulkActions table={table} />} />
```

## Row Click Actions

Pass `onClickRowAction` to make ordinary cells clickable:

```tsx
<DataTable
  table={table}
  onClickRowAction={(row) => navigate(`/admins/${row.id}/show`)}
/>
```

Cells whose id includes `actions`, `select`, or `expand` are ignored so buttons,
checkboxes, and expand controls do not trigger row navigation.

## Row Actions Column

Use a dedicated `actions` column for per-row menus:

```tsx
{
  id: 'actions',
  cell: ({ row }) => <MyRowActions row={row} />,
  enableSorting: false,
  enableHiding: false,
}
```

Pin actions to the right:

```tsx
initialState: {
  columnPinning: { right: ['actions'] },
}
```

## Column Visibility

`DataTableViewOptions` is included automatically in `DataTableToolbar`.

You can also render it manually:

```tsx
<DataTableViewOptions table={table} />
```

Set initial visibility:

```tsx
initialState: {
  columnVisibility: {
    internalMetric: false,
    debugInfo: false,
  },
}
```

Only hideable columns appear in the view options. Use `enableHiding: false` for
required columns.

## Expanding Tree Rows

Use expanding when the data itself has nested rows.

Data shape:

```ts
type WorkflowRow = {
  id: string;
  name: string;
  subRows?: WorkflowRow[];
};
```

Table setup:

```tsx
const { table } = useDataTable({
  data,
  columns,
  pageCount: 1,
  getRowId: (row) => row.id,
  getSubRows: (row) => row.subRows,
  enableExpanding: true,
});
```

Use `DataTableExpandingCell` in the column that should show the caret and
indentation:

```tsx
{
  accessorKey: 'name',
  header: 'Name',
  cell: ({ row }) => (
    <DataTableExpandingCell row={row}>
      <span>{row.original.name}</span>
    </DataTableExpandingCell>
  ),
}
```

Rows are collapsed by default. To open all rows initially:

```tsx
initialState: {
  expanded: true,
}
```

Avoid default expanded state for very large trees unless you are using virtual
rows.

## Detail Sub-Rows

Use `renderSubRow` when you want an expanded detail panel for a row, not a tree
of child data.

```tsx
const { table } = useDataTable({
  data,
  columns,
  pageCount,
  getRowCanExpand: () => true,
  enableExpanding: true,
})

<DataTable
  table={table}
  renderSubRow={(row) => (
    <div className="grid gap-2">
      <p>{row.original.description}</p>
    </div>
  )}
/>
```

Tree expanding and detail sub-rows can technically coexist, but prefer one
pattern per table unless the UX clearly needs both.

## Virtual Rows

Use virtual rows for large client-side row models or expanding trees.

```tsx
<DataTable
  table={table}
  enableVirtualRows
  virtualHeight={600}
  virtualRowEstimateSize={48}
  virtualOverscan={8}
/>
```

Notes:

- `virtualHeight` controls the internal scroll area height.
- `virtualRowEstimateSize` should be close to the real row height.
- Dynamic row measuring is enabled outside Firefox.
- Pagination can be hidden if virtual scrolling is the primary navigation:

```tsx
<DataTable table={table} enableVirtualRows hidePagination />
```

## Virtual Columns

Use virtual columns when a table has many columns and horizontal scrolling
becomes expensive.

```tsx
<DataTable
  table={table}
  enableVirtualRows
  enableVirtualColumns
  virtualHeight={600}
  virtualColumnEstimateSize={160}
/>
```

Virtual columns are opt-in. Prefer hiding rarely used columns by default with
`initialState.columnVisibility`, and let users enable them through
`DataTableViewOptions`.

## Virtual Infinite Scrolling

`DataTable` exposes `onVirtualEndReached` for pages that use infinite queries.
The callback fires when the virtual row list scrolls near the end.

Example with React Query:

```tsx
const query = useInfiniteQuery({
  queryKey: ['files', params],
  initialPageParam: 1,
  queryFn: ({ pageParam }) =>
    apiGetFiles({ ...params, page: pageParam }),
  getNextPageParam: (lastPage) =>
    lastPage.meta.currentPage < lastPage.meta.totalPages
      ? lastPage.meta.currentPage + 1
      : undefined,
})

const rows = query.data?.pages.flatMap((page) => page.data) ?? []

const { table } = useDataTable({
  data: rows,
  columns,
  pageCount: 1,
  getRowId: (row) => row.id,
})

<DataTable
  table={table}
  enableVirtualRows
  hidePagination
  onVirtualEndReached={() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage()
    }
  }}
/>
```

Tune the threshold:

```tsx
<DataTable
  table={table}
  enableVirtualRows
  onVirtualEndReached={fetchMore}
  virtualEndReachedThreshold={12}
/>
```

## Loading and Empty States

Pass `isFetching` to render the built-in loading row:

```tsx
<DataTable table={table} isFetching={isFetching} />
```

When there are no rows, the table renders:

```txt
No results.
```

## Layout Requirements

Tables with many columns can easily stretch flex layouts. The shared layout has
been adjusted for this:

- `Main` uses `w-full min-w-0`.
- `SidebarInset` uses `min-w-0`.
- `DataTable` uses `min-w-0`, `overflow-hidden`, and inline-size containment.

When placing a table inside cards, grids, panels, or flex children, keep these
rules:

```tsx
<Card className="min-w-0 overflow-hidden">
  <CardContent className="min-w-0 overflow-hidden">
    <DataTable className="min-w-0" table={table} />
  </CardContent>
</Card>
```

For grid/flex parents, add `min-w-0` to the item that contains the table.

Do not put `overflow-x-hidden` on page-level layout wrappers that contain fixed
or sticky headers. It can break sticky positioning. Put overflow containment on
the table/card itself instead.

## Recommended Page Structure

```tsx
export function PageExampleOverview() {
  const columns = useMemo(() => getExampleColumns(), []);
  const params = buildParamsFromUrl();
  const { data, isFetching } = useDataExampleOverview(params);

  const { table } = useDataTable({
    data: data?.data ?? [],
    columns,
    pageCount: data?.meta.totalPages ?? 0,
    initialState: {
      columnPinning: { right: ['actions'] },
    },
    getRowId: (row) => row.id,
  });

  return (
    <>
      <Header fixed>{/* actions */}</Header>
      <Main className="flex flex-1 flex-col gap-4 sm:gap-6">
        <PageTitle />
        <DataTable table={table} isFetching={isFetching}>
          <DataTableToolbar table={table}>
            <DataTableSortList table={table} />
          </DataTableToolbar>
        </DataTable>
      </Main>
    </>
  );
}
```

## Troubleshooting

### Page layout stretches horizontally

Check the table’s ancestors. The table container, card content, grid item, and
flex item should all allow shrinking:

```tsx
className = 'min-w-0 overflow-hidden';
```

Do not fix this by putting `overflow-x-hidden` on the app layout or page root if
the page has sticky/fixed headers.

### Header fixed/sticky behavior stops working

Look for an ancestor with `overflow-hidden`, `overflow-auto`, or
`overflow-x-hidden`. Sticky positioning uses the nearest scroll container, so
page-level overflow containment can change sticky behavior.

### Page size select is blank

The current `pagination.pageSize` must exist in the page size options. The
default options are `[10, 20, 30, 40, 50]`.

### Filters do not affect API requests

Make sure all of these are aligned:

- column `id`,
- `filterParsers`,
- `useGetFilterParams`,
- `PaginateQueryBuilder`,
- backend filterable columns.

### Sorting does not affect API requests

Make sure the column id appears in `allowedSorts` and the backend endpoint
accepts that sort field.

### Expanding rows do not expand

For tree rows, pass:

```tsx
getSubRows: (row) => row.subRows;
enableExpanding: true;
```

For detail panels, pass:

```tsx
getRowCanExpand: () => true
enableExpanding: true
renderSubRow={(row) => ...}
```

### Virtual infinite scrolling fetches repeatedly

Guard your callback:

```tsx
if (hasNextPage && !isFetchingNextPage) {
  void fetchNextPage();
}
```

You can also increase `virtualEndReachedThreshold` or add a local loading guard.
