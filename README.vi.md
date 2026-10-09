# Boilerplate Turborepo

> [English](README.md) | **Tiếng Việt**

Monorepo mẫu cấp doanh nghiệp tích hợp Backend API (NestJS), Admin Portal (Vite React), Client Website (Next.js 15), cùng các cấu hình chia sẻ và gói dùng chung.

## Các Ứng Dụng & Không Gian Làm Việc (Workspaces)

- `apps/api`: NestJS API, PostgreSQL, Redis, hàng đợi BullMQ, gửi mail Mailpit, lưu trữ tệp, xác thực admin và user.
- `apps/client`: Website Next.js 15 (App Router) hướng người dùng với hỗ trợ đa ngôn ngữ i18n (`next-intl`).
- `apps/web`: Trang quản trị Admin Portal (Vite + React 18, TailwindCSS, TanStack Table, CASL).
- `packages/eslint-config`: Cấu hình ESLint dùng chung.
- `packages/typescript-config`: Cấu hình TypeScript dùng chung.
- `packages/prettier-config`: Cấu hình Prettier dùng chung.
- `packages/commitlint-config`: Cấu hình Commitlint dùng chung.

## Yêu Cầu Môi Trường

- Node.js `20.19.0`
- pnpm `10.30.3`
- Docker Desktop hoặc Docker Engine (khuyến nghị cho các dịch vụ phụ thuộc của API)

Kích hoạt các phiên bản chuẩn của repo:

```bash
nvm use
corepack enable
corepack prepare pnpm@10.30.3 --activate
```

## Cài Đặt

Luôn cài đặt từ thư mục gốc của repository:

```bash
pnpm install
```

Dự án sử dụng duy nhất một file `pnpm-lock.yaml` ở root. Không chạy install riêng rẽ tạo các lockfile lồng nhau trong `apps/api`, `apps/client`, hay `apps/web`.

## Thiết Lập Dự Án (Setup Wizard)

Dự án cung cấp trình hướng dẫn cài đặt tương tác (`setup wizard`) tự động cấu hình file môi trường, dependencies, database, hạ tầng và kiểm tra kiểu:

```bash
pnpm run setup
```

Khi chạy trong terminal, một menu tương tác sẽ xuất hiện:

1. **Full Setup with Docker (Khuyến nghị)**: Khởi chạy các container PostgreSQL, Redis, Mailpit và pgAdmin, thiết lập cơ sở dữ liệu, chạy migration/seed, đồng bộ quyền, dọn storage cục bộ và kiểm tra kiểu.
2. **Local Setup without Docker**: Kết nối với PostgreSQL và Redis có sẵn trên máy của bạn, khởi tạo cơ sở dữ liệu và kiểm tra kiểu.
3. **Database & Permissions Only**: Làm mới nhanh migration, seed, đồng bộ quyền và dọn storage mà không cài lại dependencies hay kiểm tra kiểu.
4. **Reset Database (Drop & Fresh Migration + Seed)**: Xóa toàn bộ schema bảng và chạy lại toàn bộ migration, seed và permissions sync từ đầu (yêu cầu xác nhận, ⚠️ mất dữ liệu vĩnh viễn).
5. **Custom Setup**: Tùy chọn từng bước thủ công (file env, dependencies, Docker, database, storage, type checks).

### Các Cờ CLI (Tự động hóa / CI)

Bạn có thể bỏ qua menu tương tác bằng cách truyền trực tiếp cờ:

```bash
pnpm run setup --docker      # Cài đặt đầy đủ kèm Docker
pnpm run setup --no-docker   # Cài đặt với PostgreSQL & Redis cục bộ (alias: `pnpm run config`)
pnpm run setup --db-only     # Chỉ chạy migrations, seeds và đồng bộ permissions
pnpm run setup --reset-db    # Reset schema cơ sở dữ liệu, migrate & seed mới (alias: `pnpm run db:reset`)
pnpm run setup --skip-types  # Bỏ qua bước kiểm tra kiểu TypeScript
pnpm run setup --api-port 8000 --client-port 3000 --web-port 5173  # Tùy chỉnh cổng
pnpm run setup --help        # Xem hướng dẫn sử dụng
```

## Thiết Lập Biến Môi Trường (.env)

Sao chép file mẫu env cho ứng dụng bạn muốn chạy:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/client/.env.example apps/client/.env
cp apps/web/.env.example apps/web/.env
```

Đối với kiểm thử API, `apps/api/.env.testing` đã được chuẩn bị sẵn.

## Xác Thực Google OAuth

Ứng dụng web client hỗ trợ đăng nhập bằng Google và liên kết tài khoản Google với tài khoản người dùng hiện có.

Cấu hình các biến sau trong `apps/api/.env`:

```bash
USER_AUTH_CLIENT_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_OAUTH_CALLBACK_URL=http://localhost:8000/api/v1/user/auth/social/google/callback
```

Đăng ký URI chuyển hướng được ủy quyền này trong Google Cloud Console cho môi trường cục bộ:

```text
http://localhost:8000/api/v1/user/auth/social/google/callback
```

## Kiến Trúc Xác Thực & Bảo Vệ Tuyến Đường (Authentication)

Monorepo triển khai kiến trúc xác thực toàn diện, cấp doanh nghiệp và đồng bộ trên cả `apps/api`, `apps/client` và `apps/web`. Xem tài liệu hướng dẫn và sơ đồ chi tiết tại:

👉 **[docs/AUTH.vi.md](docs/AUTH.vi.md)** (hoặc bản tiếng Anh: **[docs/AUTH.md](docs/AUTH.md)**)

### Kiến Trúc Client & Nhóm Tuyến Đường (`apps/client`)

Website Next.js áp dụng **kiến trúc bảo vệ tuyến đường theo cấu trúc thư mục (Folder-based route protection)** thông qua Route Groups của App Router:

| Nhóm Tuyến Đường / Thư Mục       | Mẫu Tuyến Đường                     | Kiểu Bảo Vệ            | Hành Vi                                                                                                                                                                          |
| :------------------------------- | :---------------------------------- | :--------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/[locale]/(protected)/`  | `/profile`, `/settings`, ...        | **Auth Guard**         | Server Component layout (`ProtectedLayout`) kiểm tra cookie phiên. Người chưa đăng nhập tự động được chuyển hướng về `/${locale}/auth/login?code=unauthorized&from=${pathname}`. |
| `src/app/[locale]/auth/(forms)/` | `/auth/login`, `/auth/sign-up`, ... | **Guest Guard**        | Layout biểu mẫu (`AuthLayout`) kiểm tra cookie phiên. Người đã đăng nhập tự động được chuyển hướng vào `/${locale}/profile`.                                                     |
| `src/app/[locale]/auth/oauth/`   | `/auth/oauth/callback`              | **Callback chức năng** | Xử lý trao đổi mã xác thực Google OAuth độc lập, không gắn với layout 2 cột của form.                                                                                            |
| Các tuyến đường khác             | `/`, `/example`, ...                | **Mặc định công khai** | Mở tự do cho mọi khách truy cập.                                                                                                                                                 |

### Các Điểm Nhấn Kiến Trúc (Không Dùng Trick)

- **Không Hardcode Tuyến Đường**: Middleware (`proxy.ts`) không lưu danh sách cứng các URL và không thực hiện chuyển hướng khách gây vòng lặp.
- **Chủ Động Làm Mới Token**: Edge Middleware tự động gia hạn token trước khi hết hạn (khi còn `< 1 phút`), đồng thời bảo toàn nguyên vẹn route rewrite của Next-intl và request headers.
- **Kiểm Soát Đồng Thời Single-Flight**: Trong `http.ts`, Promise Mutex dùng chung ngăn chặn các request 401 đồng thời kích hoạt nhiều lượt xoay vòng Refresh Token.
- **Xử Lý Lỗi Kiên Cường (Resilient Error Handling)**: Trục trặc mạng tạm thời (timeout, 5xx) không làm mất cookie của người dùng; chỉ lỗi 401/400 mới xóa thông tin phiên.
- **Mã Lỗi Chuẩn Hóa (`AUTH_CODE`)**: Sử dụng các mã trạng thái thống nhất (`session_expired`, `unauthorized`, `invalid_token`) kèm hỗ trợ đa ngôn ngữ đầy đủ.

## Trang Quản Trị Admin Portal (`apps/web`)

Admin Portal cấp doanh nghiệp xây dựng với **Vite + React 18**, **TailwindCSS** và **TanStack Table**:

- **Quản lý Admin & Người dùng**: Phân cấp đa quản trị viên, quản lý email xác thực và vòng đời tài khoản.
- **Phân quyền CASL (RBAC)**: Ma trận quyền chi tiết, chính sách hành động (`manage`, `read`, `create`, `update`, `delete`) và component UI kiểm tra quyền.
- **Tùy biến Nhãn trắng (White-Label)**: Logo động, favicon, SEO metadata và phong cách nhận diện thương hiệu theo từng môi trường.
- **Bảng dữ liệu hiệu năng cao**: Phân trang phía server, sắp xếp, tìm kiếm, ẩn hiện cột và thao tác hàng loạt bằng TanStack Table.
- **URL cục bộ**: `http://localhost:5173` thông qua `pnpm --filter web-portal dev`.

## Khởi Chạy Cục Bộ

Chạy toàn bộ ứng dụng qua Turborepo:

```bash
pnpm dev
```

Build và khởi chạy không cần dev watcher:

```bash
pnpm start
```

Chạy riêng từng ứng dụng:

```bash
pnpm --filter api start:dev
pnpm --filter client dev
pnpm --filter web-portal dev
```

Cổng truy cập mặc định:

- API: `http://localhost:8000`
- Client website: `http://localhost:3000`
- Admin portal: `http://localhost:5173`
- Mailpit UI: `http://localhost:8025`
- pgAdmin: `http://localhost:5050`

## Phát Triển Với Docker

Chạy toàn bộ stack thông qua Docker Compose:

```bash
pnpm docker:dev
```

Dừng toàn bộ dịch vụ:

```bash
pnpm docker:down
```

## Kiểm Tra Kiểu (Type Check), Lint, Test

Chạy kiểm tra trên toàn bộ workspaces:

```bash
pnpm lint
pnpm check-types
pnpm test
```

Chạy kiểm tra riêng từng ứng dụng:

```bash
pnpm --filter api lint
pnpm --filter api check-types
pnpm --filter api test:ci

pnpm --filter client lint
pnpm --filter client check-types
pnpm --filter client test:ci

pnpm --filter web-portal lint
pnpm --filter web-portal check-types
pnpm --filter web-portal test:coverage
```

## Tài Liệu & Hướng Dẫn Kỹ Thuật

- [docs/AUTH.vi.md](./docs/AUTH.vi.md) - Kiến trúc xác thực toàn diện (RTR, Single-Flight, Cookies, Layout Guards).
- [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) - Hướng dẫn triển khai môi trường sản xuất (Docker, migrations, CI/CD).
- [docs/RELEASE.md](./docs/RELEASE.md) - Quy trình phát hành tự động và Conventional Commits.
- [docs/DATATABLE.md](./docs/DATATABLE.md) - Kiến trúc TanStack Table cho Admin Portal.
- [docs/SORTABLE.md](./docs/SORTABLE.md) - Tải lên và sắp xếp thứ tự hình ảnh kéo thả (Client & API).
- [docs/BACKGROUND_FILE_UPLOAD.md](./docs/BACKGROUND_FILE_UPLOAD.md) - Xử lý tải tệp nền qua BullMQ và EventEmitter.
- [docs/websocket.md](./docs/websocket.md) - Kiến trúc kết nối WebSocket Socket.IO và Redis Pub/Sub.
- [docs/filesystem.md](./docs/filesystem.md) - Kiến trúc hệ thống quản lý tập tin và lưu trữ đám mây.
