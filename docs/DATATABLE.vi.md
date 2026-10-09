# Hướng Dẫn Sử Dụng DataTable

> [English](DATATABLE.md) | **Tiếng Việt**

Tài liệu này hướng dẫn cách sử dụng hệ thống DataTable dùng chung trong `apps/web`.
Nội dung dành cho các trang cần bảng dữ liệu kiểu quản trị admin với phân trang đồng bộ qua URL,
sắp xếp, lọc dữ liệu, ẩn hiện cột, chọn hàng (row selection), thao tác trên hàng, mở rộng
hàng (expanding rows) và ảo hóa (virtualization).

## Các Thành Phần Chính

Tính năng DataTable được chia thành các phần tái sử dụng:

- `useDataTable` trong `apps/web/src/hooks/use-data-table.ts`
  - Khởi tạo instance của TanStack Table.
  - Quản lý trạng thái bảng: phân trang, sắp xếp, bộ lọc, chọn hàng, mở rộng hàng và ẩn hiện cột.
  - Đồng bộ trang, kích thước trang, sắp xếp và bộ lọc vào URL query params qua thư viện `nuqs`.
- `DataTable` trong `apps/web/src/components/data-table/data-table.tsx`
  - Render giao diện bảng, trạng thái loading, trạng thái rỗng, phân trang, xử lý click hàng tùy chọn, panel chi tiết hàng con, hàng ảo, cột ảo và callback cuộn vô tận ảo (virtual infinite scrolling).
- `DataTableToolbar`
  - Render các bộ lọc cột từ `columnDef.meta`.
  - Bao gồm nút điều khiển ẩn hiện cột qua `DataTableViewOptions`.
- `DataTableSortList`
  - Cung cấp popover "Sắp xếp" hỗ trợ đa tiêu chí sắp xếp.
- `DataTableColumnHeader`
  - Component tiêu đề cột chuẩn được hầu hết các cột sử dụng.

Hầu hết các trang tuân theo cấu trúc sau:

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

## Luồng Dữ Liệu Phía Server (Server-Side Data Flow)

DataTable của dự án được thiết kế chủ yếu cho việc phân trang, sắp xếp và lọc từ phía server.

`useDataTable` thiết lập:

```ts
manualPagination: true;
manualSorting: true;
manualFiltering: true;
```

Điều đó có nghĩa bảng không tự động fetch dữ liệu. Trang của bạn cần:

1. Đọc các query params từ URL.
2. Xây dựng tham số gọi API.
3. Fetch dữ liệu với React Query.
4. Truyền `data` và `pageCount` vào `useDataTable`.

Ví dụ:

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

## Trạng Thái URL Query

Mặc định, `useDataTable` sử dụng các query key:

- `page`
- `perPage`
- `sort`
- `filters`
- `joinOperator`

Bạn có thể ghi đè khi có nhiều bảng trên cùng một trang:

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

## Định Nghĩa Cột (Defining Columns)

Các cột là mảng `ColumnDef<TData>[]` chuẩn của TanStack Table.

Sử dụng `id` ổn định khớp với:

- Các trường có thể sắp xếp/lọc phía backend,
- Các hằng số `ColumnKey`,
- Bộ phân giải `useGetFilterParams`,
- Các trường của `PaginateQueryBuilder`.

Ví dụ:

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
        placeholder: 'Tìm kiếm email...',
        variant: 'text',
        icon: MailIcon,
      },
      enableColumnFilter: true,
      enableSorting: true,
    },
  ];
}
```

## Meta Cột và Bộ Lọc (Column Meta & Filters)

`DataTableToolbar` đọc `column.columnDef.meta` để render các bộ lọc tương ứng.

Các biến thể bộ lọc phổ biến:

- `text`
- `number`
- `range`
- `date`
- `dateRange`
- `select`
- `multiSelect`
- `asyncSelect`
- `multiAsyncSelect`

## Sắp Xếp (Sorting)

Một cột có thể sắp xếp khi `enableSorting: true`.

Sử dụng `DataTableSortList` bên trong `DataTableToolbar`:

```tsx
<DataTable table={table}>
  <DataTableToolbar table={table}>
    <DataTableSortList table={table} />
  </DataTableToolbar>
</DataTable>
```

## Phân Trang (Pagination)

`DataTable` tự động render `DataTablePagination` theo mặc định.

Các tùy chọn kích cỡ trang mặc định là:

```ts
[10, 20, 30, 40, 50];
```

## Chọn Hàng (Row Selection)

`useDataTable` bật sẵn tính năng chọn hàng theo mặc định:

```ts
enableRowSelection: true;
```

Thêm cột `select` khi giao diện cần cho phép chọn:

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
      aria-label="Chọn tất cả"
    />
  ),
  cell: ({ row }) => (
    <Checkbox
      checked={row.getIsSelected()}
      onCheckedChange={(value) => row.toggleSelected(!!value)}
      aria-label="Chọn hàng"
    />
  ),
  size: 32,
  enableSorting: false,
  enableHiding: false,
}
```

Sử dụng `actionBar` cho các thao tác hàng loạt (bulk actions):

```tsx
<DataTable table={table} actionBar={<BulkActions table={table} />} />
```

## Hành Động Khi Nhấp Hàng (Row Click Actions)

Truyền `onClickRowAction` để các ô thông thường có thể nhấp được:

```tsx
<DataTable
  table={table}
  onClickRowAction={(row) => navigate(`/admins/${row.id}/show`)}
/>
```

## Cột Thao Tác Hàng (Actions Column)

Sử dụng cột `actions` chuyên dụng cho menu thao tác từng hàng:

```tsx
{
  id: 'actions',
  cell: ({ row }) => <MyRowActions row={row} />,
  enableSorting: false,
  enableHiding: false,
}
```

Ghim cột actions sang bên phải:

```tsx
initialState: {
  columnPinning: { right: ['actions'] },
}
```

## Mở Rộng Hàng Cây & Hàng Con Chi Tiết

Đối với cây dữ liệu có cấp con:

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

Đối với bảng mở rộng xem chi tiết (không phải cấu trúc cây):

```tsx
<DataTable
  table={table}
  renderSubRow={(row) => (
    <div className="grid gap-2">
      <p>{row.original.description}</p>
    </div>
  )}
/>
```

## Ảo Hóa Hàng & Cuộn Vô Tận (Virtualization)

Khi danh sách lên tới hàng nghìn mục, kích hoạt ảo hóa:

```tsx
<DataTable
  table={table}
  enableVirtualRows
  virtualHeight={600}
  virtualRowEstimateSize={48}
  virtualOverscan={8}
/>
```

Cuộn vô tận ảo với React Query:

```tsx
<DataTable
  table={table}
  enableVirtualRows
  hidePagination
  onVirtualEndReached={() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage();
    }
  }}
/>
```

## Xử Lý Sự Cố Thường Gặp (Troubleshooting)

- **Giao diện bảng bị kéo giãn ngang**: Kiểm tra thẻ cha của bảng. Container bảng, nội dung card, grid item và flex item đều cần cho phép co lại với `min-w-0 overflow-hidden`.
- **Thanh Header fixed/sticky bị mất tác dụng**: Tìm thẻ cha có `overflow-hidden`, `overflow-auto` hoặc `overflow-x-hidden`. Định vị sticky dùng container cuộn gần nhất.
- **Select kích cỡ trang bị trắng**: Kích cỡ trang hiện tại phải nằm trong mảng tùy chọn `[10, 20, 30, 40, 50]`.
- **Bộ lọc hoặc sắp xếp không gửi lên API**: Đảm bảo cột `id`, `filterParsers`, `useGetFilterParams`, `PaginateQueryBuilder` và trường phía backend hoàn toàn khớp nhau.
