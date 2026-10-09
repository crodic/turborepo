# Hướng Dẫn Triển Khai (Deployment Guide)

> [English](DEPLOYMENT.md) | **Tiếng Việt**

Tài liệu này hướng dẫn cách triển khai các ứng dụng trong monorepo:

- API: `apps/api`
- Client website: `apps/client`
- Admin portal: `apps/web`

Kho mã nguồn này là một pnpm workspace. Các lệnh build và deploy nên được thực thi từ thư mục gốc của repository trừ khi có ghi chú khác.

## Yêu Cầu Môi Trường

- Node.js `20.19.0`
- pnpm `10.30.3`
- Docker Buildx
- PostgreSQL 16+
- Redis 7+
- Nhà cung cấp SMTP
- Lưu trữ đối tượng (Object storage), tùy chọn dựa trên biến `FILESYSTEM_DISK`

Kích hoạt package manager được ghim phiên bản:

```bash
corepack enable
corepack prepare pnpm@10.30.3 --activate
```

## Các Tệp Môi Trường Production

Tạo các tệp môi trường production từ tệp mẫu:

```bash
cp apps/api/.env.production.example apps/api/.env
cp apps/client/.env.example apps/client/.env
cp apps/web/.env.example apps/web/.env
```

Kiểm tra kỹ từng giá trị trước khi triển khai. Các biến API quan trọng:

- `APP_URL`
- `APP_PORT`
- `APP_CORS_ORIGIN`
- `APP_SECURE_HEADER_ORIGIN`
- `DATABASE_*`
- `REDIS_*`
- `MAIL_*`
- `AUTH_*`
- `USER_AUTH_*`
- `FILESYSTEM_DISK`
- `AWS_*` khi sử dụng S3
- `SENTRY_*` khi kích hoạt Sentry

Các biến quan trọng của client website được liệt kê trong `apps/client/.env.example`.
Các biến quan trọng của admin portal được liệt kê trong `apps/web/.env.example`.

## Cài Đặt và Kiểm Tra Xác Thực

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm check-types
pnpm --filter api test:ci
pnpm --filter client test:ci
pnpm --filter web-portal test:coverage
pnpm build
```

## Triển Khai Cơ Sở Dữ Liệu

Chạy các lệnh này sau khi đã cấu hình `apps/api/.env` trỏ tới cơ sở dữ liệu đích:

```bash
pnpm --filter api build
pnpm --filter api db:create
pnpm --filter api migration:run:prod
pnpm --filter api seed:run:prod
pnpm --filter api permissions:sync:prod
```

Ghi chú:

- `db:create` có tính idempotent và sẽ bỏ qua nếu database đã tồn tại.
- TypeORM migration sẽ tự động bỏ qua các migration đã chạy.
- Script seed được thiết kế để tránh tạo trùng lặp users/admins.
- Đồng bộ quyền hạn (`permissions:sync`) cập nhật danh sách quyền từ `permissions.constant.ts`.

## Build Docker Image

Build image API từ thư mục gốc:

```bash
docker build -f apps/api/Dockerfile --target production -t api .
```

Build image web portal từ thư mục gốc:

```bash
docker build -f apps/web/Dockerfile --target production -t web-portal .
```

Build image client website từ thư mục gốc:

```bash
docker build -f apps/client/Dockerfile --target production -t boilerplate-client .
```

Image API khởi động bằng lệnh:

```bash
node dist/main.js
```

Image web portal phục vụ các tệp tĩnh Vite qua nginx ở cổng `80`.
Image client website chạy server standalone Next.js ở cổng `3000`.

## Triển Khai Production với Docker Compose

Tệp docker-compose production hiện tại phục vụ API, PostgreSQL, và Redis.

```bash
APP_IMAGE=ghcr.io/<owner>/<repo>-api:<tag> \
docker compose -f apps/api/docker-compose.prod.yml up -d
```

Đối với các ứng dụng web frontend, triển khai các image đã phát hành độc lập phía sau reverse proxy:

```bash
docker run -d --name web-portal -p 80:80 ghcr.io/<owner>/<repo>-web:<tag>
docker run -d --name boilerplate-client -p 3000:3000 ghcr.io/<owner>/<repo>-client:<tag>
```

## GitHub Actions

Luồng CI/CD nằm tại:

```text
.github/workflows/ci-cd.yml
```

Các bước tự động:

- API: lint, type-check, unit tests, e2e tests, build, kiểm tra build Docker.
- Client: lint, type-check, tests, build, kiểm tra build Docker.
- Web: lint, type-check, coverage tests, build, kiểm tra build Docker.
- Xuất bản Docker image lên GHCR trên nhánh `main` và các thẻ phiên bản (version tags).

Các image được xuất bản:

```text
ghcr.io/<owner>/<repo>-api
ghcr.io/<owner>/<repo>-client
ghcr.io/<owner>/<repo>-web
```

## Quy Trình Phát Hành (Release Flow)

1. Merge code vào nhánh `main`.
2. Chờ CI/CD build và xuất bản các image API, client, và web.
3. Kéo (pull) các image tag mới về server.
4. Chạy migration cơ sở dữ liệu.
5. Khởi động lại các container API và web.
6. Xác minh health checks và luồng đăng nhập.

Ví dụ:

```bash
docker pull ghcr.io/<owner>/<repo>-api:<tag>
docker pull ghcr.io/<owner>/<repo>-client:<tag>
docker pull ghcr.io/<owner>/<repo>-web:<tag>

pnpm --filter api migration:run:prod
pnpm --filter api permissions:sync:prod

APP_IMAGE=ghcr.io/<owner>/<repo>-api:<tag> \
docker compose -f apps/api/docker-compose.prod.yml up -d
```

## Hoàn Tác (Rollback)

1. Tái triển khai các tag image API, client, và web phiên bản trước đó.
2. Revert migration cơ sở dữ liệu chỉ khi migration đó có hỗ trợ hoàn tác an toàn và rõ ràng.
3. Chạy lại kiểm thử cơ bản (smoke tests) sau khi rollback.

```bash
APP_IMAGE=ghcr.io/<owner>/<repo>-api:<previous-tag> \
docker compose -f apps/api/docker-compose.prod.yml up -d

docker run -d --name web-portal -p 80:80 ghcr.io/<owner>/<repo>-web:<previous-tag>
docker run -d --name boilerplate-client -p 3000:3000 ghcr.io/<owner>/<repo>-client:<previous-tag>
```

## Kiểm Tra Hoạt Động (Smoke Checks)

Sau khi hoàn tất triển khai:

```bash
curl -f https://api.example.com/api/v1/health
curl -f https://www.example.com
curl -f https://portal.example.com
```

Xác minh các tính năng chính:

- Đăng nhập admin.
- Phản hồi từ API `/me`.
- Tải danh sách quyền hạn.
- Tải lên tệp (nếu cấu hình storage).
- Gửi email (nếu cấu hình SMTP).
- Kết nối WebSocket (nếu sử dụng tính năng thời gian thực).
