# NestJS API

> [English](README.md) | **Tiếng Việt**

Backend REST API cho monorepo, được xây dựng với NestJS, PostgreSQL, Redis, TypeORM, BullMQ, và Mailpit.

> **Ghi chú**: Đối với các lệnh điều phối cấp độ root monorepo, vui lòng tham khảo [README.vi.md](../../README.vi.md) ở thư mục gốc.

## Điều Kiện Tiên Quyết (Prerequisites)

- Docker và Docker Compose
- Git
- Node.js `20.19.0` và pnpm `10.30.3` (khi chạy trực tiếp trên máy không qua Docker)

Node.js, pnpm, PostgreSQL, Redis, Mailpit, và pgAdmin cũng có thể được cung cấp sẵn thông qua Docker phục vụ phát triển cục bộ.

## Thiết Lập Docker Cục Bộ (Local Docker Setup)

Sao chép tệp biến môi trường mẫu và điều chỉnh các giá trị khi cần:

```bash
cp .env.example .env
```

Khởi chạy cụm dịch vụ cục bộ từ thư mục gốc của repository:

```bash
pnpm docker:dev
# Hoặc chạy trực tiếp với docker compose:
docker compose -f apps/api/docker-compose.yml up -d
```

Theo dõi nhật ký log của ứng dụng:

```bash
docker compose -f apps/api/docker-compose.yml logs -f app
```

Dừng cụm dịch vụ:

```bash
docker compose -f apps/api/docker-compose.yml down
```

Xóa toàn bộ volumes dữ liệu cơ sở dữ liệu, Redis và pgAdmin cục bộ khi muốn dọn sạch hoàn toàn:

```bash
docker compose -f apps/api/docker-compose.yml down -v
```

## Các Dịch Vụ Cục Bộ (Local Services)

- API: http://localhost:8000
- Swagger (môi trường development): http://localhost:8000/api-docs
- Bull Board: http://localhost:8000/api/queues
- Mailpit: http://localhost:8025
- pgAdmin: http://localhost:5050

Thông tin đăng nhập mặc định của pgAdmin lấy từ `.env`:

- Email: `PGADMIN_DEFAULT_EMAIL`
- Mật khẩu: `PGADMIN_DEFAULT_PASSWORD`

Để kết nối pgAdmin với cơ sở dữ liệu trong Docker, sử dụng:

- Host: `postgres`
- Port: `5432`
- Database: `DATABASE_NAME`
- Username: `DATABASE_USERNAME`
- Password: `DATABASE_PASSWORD`

## Database Migrations

Migrations không tự động chạy khi container ứng dụng khởi động. Hãy chạy thủ công sau khi cơ sở dữ liệu đã sẵn sàng hoạt động (healthy):

```bash
docker compose run --rm app pnpm migration:run
```

Để hoàn tác (revert) migration gần nhất trên môi trường cục bộ:

```bash
docker compose run --rm app pnpm migration:revert
```

Để nạp dữ liệu mẫu ban đầu (seed) vào cơ sở dữ liệu quan hệ:

```bash
docker compose run --rm app pnpm seed:run
```

## Phân Quyền RBAC (RBAC Permissions)

Danh mục quyền hạn được quản lý bằng mã nguồn tại:

```text
src/utils/permissions.constant.ts
```

Mỗi quyền bao gồm:

- `key`: mã quyền định danh cho máy đọc, ví dụ `read:ADMIN`
- `group`: nhóm hiển thị trên giao diện người dùng, ví dụ `Admin Management`
- `name`: tên hiển thị cho người dùng cuối
- `description`: mô tả giải thích quyền cho người dùng cuối

Bảng `permissions` trong cơ sở dữ liệu được đồng bộ trực tiếp từ danh mục này. Không chỉnh sửa các bản ghi permissions thủ công trong cơ sở dữ liệu trừ khi bạn cũng cập nhật tệp `permissions.constant.ts`.

Quyền đặc biệt `manage:all` chỉ dành riêng cho vai trò hệ thống (system role). Quyền này được ẩn khỏi danh sách lựa chọn tạo/chỉnh sửa vai trò và bị từ chối bởi các API tạo/cập nhật Role.

Sau khi thay đổi `permissions.constant.ts`, chạy lệnh đồng bộ quyền:

```bash
pnpm permissions:sync
```

Nếu chạy bên trong container Docker cục bộ:

```bash
docker compose run --rm app pnpm permissions:sync
```

Đối với môi trường production, hãy build ứng dụng trước, chạy migrations, sau đó đồng bộ permissions từ các tệp `dist` đã được biên dịch:

```bash
pnpm build
pnpm migration:run:prod
pnpm permissions:sync:prod
```

Nếu sử dụng Docker Compose production:

```bash
docker compose -f docker-compose.prod.yml run --rm app pnpm migration:run:prod
docker compose -f docker-compose.prod.yml run --rm app pnpm permissions:sync:prod
```

## Quản Lý Phiên Và Thu Hồi Phiên (Sessions and Revocation)

Khi người dùng quản trị (admin) hoặc người dùng thông thường (user) đăng nhập thành công, một bản ghi mới sẽ được tạo trong bảng `sessions`. Các yêu cầu được bảo vệ sẽ xác thực cả token JWT và bản ghi phiên tương ứng, do đó việc thu hồi phiên (revoke) sẽ chặn access token ngay lập tức ngay cả khi token đó chưa hết hạn.

Các endpoint quản lý phiên của Admin:

```text
GET    /api/v1/auth/sessions
DELETE /api/v1/auth/sessions/:id
DELETE /api/v1/auth/sessions
```

Các endpoint quản lý phiên của User:

```text
GET    /api/v1/user/auth/sessions
DELETE /api/v1/user/auth/sessions/:id
DELETE /api/v1/user/auth/sessions
```

## Email Quản Trị Và Nhật Ký Gửi Email (Admin Emails and Email Logs)

Quản trị viên có thể gửi trực tiếp hoặc lên lịch gửi email thông qua hàng đợi email (email queue). Mọi email do admin tạo đều sử dụng người gửi hệ thống được cấu hình từ `MAIL_DEFAULT_EMAIL`/`MAIL_DEFAULT_NAME`; địa chỉ email riêng của admin không bao giờ được dùng làm địa chỉ `from`.

Các tác vụ hàng đợi email được ghi lại vào bảng `email_logs` với người nhận, tiêu đề, nội dung, trạng thái, thời gian lên lịch, thời gian gửi, thông báo lỗi nếu thất bại, ID tác vụ hàng đợi, và người quản trị đã tạo email. Các email hệ thống như email xác thực tài khoản và quên mật khẩu cũng được ghi nhật ký dựa trên nguyên tắc best-effort mà không làm ảnh hưởng đến luồng gửi email sẵn có.

Các endpoint gửi email của Admin:

```text
POST /api/v1/emails
GET  /api/v1/emails/my
GET  /api/v1/emails/:id
PATCH /api/v1/emails/:id
POST /api/v1/emails/:id/cancel
GET  /api/v1/emails/recipients
```

Các endpoint nhật ký email (Email log):

```text
GET /api/v1/email-logs
GET /api/v1/email-logs/:id
```

Các quyền yêu cầu:

- `create:EMAIL` để gửi hoặc lên lịch gửi email.
- `read:EMAIL` để xem danh sách email do admin hiện tại tạo.
- `update:EMAIL` để chỉnh sửa email đã lên lịch.
- `delete:EMAIL` để hủy bỏ email đã lên lịch.
- `read:EMAIL_LOG` để xem các trang kiểm tra nhật ký email toàn hệ thống.

Sau khi thêm hoặc thay đổi quyền email trong `src/utils/permissions.constant.ts`, hãy chạy lệnh đồng bộ quyền trong mục RBAC. Tính năng lên lịch gửi email yêu cầu Redis và BullMQ email worker phải đang hoạt động.

## Kiểm Thử (Tests)

Jest nạp các giá trị môi trường kiểm thử từ `.env.testing` thông qua `setup-jest.mjs`.

Chạy kiểm thử bên trong Docker:

```bash
docker compose run --rm app pnpm test
docker compose run --rm app pnpm test:e2e
```

Chạy kiểm tra linting bên trong Docker:

```bash
docker compose run --rm app pnpm exec eslint "{src,apps,libs,test}/**/*.ts"
```

## Docker Image

Build image cho môi trường production cục bộ:

```bash
docker build -f apps/api/Dockerfile --target production -t api:local .
```

Chạy thử production image kết hợp với các dịch vụ phụ thuộc Compose cục bộ để kiểm tra (smoke test):

```bash
docker compose -f apps/api/docker-compose.yml up -d postgres redis mailpit
docker run --rm --env-file apps/api/.env -p 8000:8000 api:local
```

## Production Compose

`docker-compose.prod.yml` được thiết kế cho việc tự lưu trữ (self-hosted) triển khai production đơn giản. Cụm chỉ chạy duy nhất API, PostgreSQL và Redis. Nó không bao gồm pgAdmin hoặc Mailpit, và không mở cổng PostgreSQL hay Redis ra môi trường máy chủ ngoài (host).

Chuẩn bị môi trường máy chủ:

```bash
cp .env.production.example .env
```

Chỉnh sửa tệp `.env` và thiết lập các giá trị thực tế, đặc biệt:

- `APP_IMAGE`
- Thông tin xác thực cơ sở dữ liệu
- Mật khẩu Redis
- Khóa bí mật JWT và auth secrets
- Thông tin xác thực máy chủ SMTP
- CORS và các URL công khai

Kéo image và khởi chạy cụm production:

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

Xem nhật ký sản xuất:

```bash
docker compose -f docker-compose.prod.yml logs -f app
```

Dừng các container production mà không làm mất dữ liệu:

```bash
docker compose -f docker-compose.prod.yml down
```

Chạy production migrations như một bước phát hành release rõ ràng:

```bash
docker compose -f docker-compose.prod.yml run --rm app pnpm migration:run:prod
```

Đồng bộ danh mục quyền sau migrations bất cứ khi nào `src/utils/permissions.constant.ts` thay đổi:

```bash
docker compose -f docker-compose.prod.yml run --rm app pnpm permissions:sync:prod
```

Không đưa bí mật sản xuất vào image hoặc commit lên repository. Đối với các triển khai quy mô lớn hơn, hãy tái sử dụng cùng target `production` trong `Dockerfile` với công cụ điều phối (orchestrator) của bạn và cung cấp biến môi trường thông qua nền tảng đám mây hoặc công cụ quản lý bí mật (secret manager). Lệnh migration production bên trong image đã build là:

```bash
node node_modules/typeorm/cli.js --dataSource=dist/database/data-source.js migration:run
```

## Git Hooks Và Quy Tắc Commit

Husky được kích hoạt thông qua script `prepare`. Sau khi cài đặt các phụ thuộc, Git hooks sẽ tự động được cài đặt:

```bash
pnpm install
```

Các hooks đang hoạt động:

- `pre-commit`: chạy `lint-staged`
- `commit-msg`: chạy `commitlint`

`lint-staged` chạy ESLint và Prettier chỉ trên các tệp đã staged trong git.

Thông điệp commit phải tuân thủ chuẩn Conventional Commits:

```text
<type>(optional-scope): <description>
```

Các loại commit thông dụng được phép:

- `feat`: tính năng mới
- `fix`: sửa lỗi
- `docs`: chỉ thay đổi tài liệu
- `style`: chỉ định dạng hoặc quy cách viết mã (code style)
- `refactor`: tái cấu trúc mã mà không thêm tính năng mới hay sửa lỗi
- `perf`: cải thiện hiệu năng
- `test`: thêm hoặc sửa mã kiểm thử
- `build`: thay đổi hệ thống build hoặc các gói phụ thuộc
- `ci`: thay đổi quy trình CI/CD
- `chore`: tác vụ bảo trì định kỳ
- `revert`: hoàn tác một commit trước đó

Ví dụ:

```text
feat(auth): add refresh token rotation
fix(docker): correct redis healthcheck
docs: update local setup guide
ci: publish docker image to ghcr
```

## CI/CD

Quy trình GitHub Actions được định nghĩa trong `.github/workflows/ci-cd.yml`:

- Job `ci` cài đặt phụ thuộc, lint mã nguồn, chạy unit tests, chạy e2e tests, build ứng dụng và xác thực tiến trình Docker build.
- Job `docker` tiến hành build với Docker Buildx, lưu cache các tầng Docker layers và đẩy image lên GitHub Container Registry sau khi job CI vượt qua thành công trên nhánh `main` hoặc khi gắn thẻ phiên bản (version tags).

Job Docker sử dụng `GITHUB_TOKEN` để xác thực với GitHub Container Registry. Thêm thông tin đăng nhập triển khai và các biến môi trường production dưới dạng GitHub secrets trong cài đặt repository hoặc environment khi liên kết một tác vụ triển khai thực tế.
