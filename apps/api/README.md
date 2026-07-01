# Crodic Framework

A NestJS backend using PostgreSQL, Redis, TypeORM, BullMQ, and Mailpit.

## Prerequisites

- Docker and Docker Compose
- Git

Node.js, pnpm, PostgreSQL, Redis, Mailpit, and pgAdmin are provided by Docker for local development.

## Local Docker Setup

Copy the example environment file and adjust values as needed:

```bash
cp .env.example .env
```

Start the full local stack:

```bash
docker compose up -d
```

Follow the app logs:

```bash
docker compose logs -f app
```

Stop the stack:

```bash
docker compose down
```

Remove local database, Redis, and pgAdmin volumes when you need a clean reset:

```bash
docker compose down -v
```

## Local Services

- API: http://localhost:3000
- Swagger, in development: http://localhost:3000/api-docs
- Bull Board: http://localhost:3000/api/queues
- NestLens: http://localhost:3000/nestlens
- Mailpit: http://localhost:8025
- pgAdmin: http://localhost:5050

pgAdmin login defaults come from `.env`:

- Email: `PGADMIN_DEFAULT_EMAIL`
- Password: `PGADMIN_DEFAULT_PASSWORD`

To connect pgAdmin to the Docker database, use:

- Host: `postgres`
- Port: `5432`
- Database: `DATABASE_NAME`
- Username: `DATABASE_USERNAME`
- Password: `DATABASE_PASSWORD`

## Database Migrations

Migrations are not run automatically when the app container starts. Run them explicitly after the database is healthy:

```bash
docker compose run --rm app pnpm migration:run:docker
```

To revert the latest migration locally:

```bash
docker compose run --rm app pnpm migration:revert:docker
```

To seed local relational data:

```bash
docker compose run --rm app pnpm seed:run:relational
```

## RBAC Permissions

Permissions are source-controlled in:

```text
src/utils/permissions.constant.ts
```

Each permission has:

- `key`: machine-readable permission key, for example `read:ADMIN`
- `group`: UI grouping, for example `Admin Management`
- `name`: end-user display name
- `description`: end-user help text

The database `permissions` table is synced from this catalog. Do not edit permission rows manually unless you also update `permissions.constant.ts`.

The reserved permission `manage:all` is for the system role only. It is intentionally hidden from role create/edit options and rejected by the Role create/update APIs.

After changing `permissions.constant.ts`, run the permission sync:

```bash
pnpm permissions:sync
```

Inside local Docker:

```bash
docker compose run --rm app pnpm permissions:sync
```

For production, build the app first, run migrations, then sync permissions from the compiled `dist` files:

```bash
pnpm build
pnpm migration:run:prod
pnpm permissions:sync:prod
```

If using production Docker Compose:

```bash
docker compose -f docker-compose.prod.yml run --rm app pnpm migration:run:prod
docker compose -f docker-compose.prod.yml run --rm app pnpm permissions:sync:prod
```

## Sessions, Revocation, and Impersonation

Authenticated admin and user logins create rows in the `sessions` table. Protected requests validate both the JWT and the backing session row, so revoking a session blocks the access token immediately even when the token has not expired yet.

Admin session endpoints:

```text
GET    /api/v1/auth/sessions
DELETE /api/v1/auth/sessions/:id
DELETE /api/v1/auth/sessions
```

User session endpoints:

```text
GET    /api/v1/user/auth/sessions
DELETE /api/v1/user/auth/sessions/:id
DELETE /api/v1/user/auth/sessions
```

### Admin suspicious login verification

Admin sign-in risk is scored from multiple signals instead of using a single hard trigger:

- The admin has previous sessions and signs in from an IP address that has not appeared in that admin's session history: `+45`.
- The admin has previous sessions and signs in with a user agent that has not appeared in that admin's session history: `+15`.
- The admin has at least 5 failed password attempts within the failed-login cache window, then enters the correct password: `+70`.

The current step-up verification threshold is `60`. Lower-risk sign-ins, such as using a new browser from a familiar IP address, can still create a session marked with `isSuspicious=true` and send a security notification/email without blocking the login. Higher-risk sign-ins do not create a session or issue access/refresh tokens immediately. The login response contains `suspiciousLoginRequired`, `suspiciousLoginToken`, `suspiciousLoginMethods`, and `suspiciousReasons`. The portal must complete step-up verification before treating the admin as signed in.

Verification endpoint:

```text
POST /api/v1/auth/suspicious-login/verify
```

The endpoint accepts:

```json
{
  "suspiciousLoginToken": "<token from login response>",
  "method": "email",
  "code": "123456"
}
```

Supported methods are:

- `email`: always available. A 6-digit code is queued through the email queue with job name `admin-suspicious-login`.
- `totp`: available only when the admin has two-factor authentication enabled.
- `backup_code`: available only when the admin has two-factor authentication enabled.

After successful verification, the API creates the admin session, marks it with `isSuspicious=true`, stores `suspiciousReasons`, creates a security notification, and returns normal access/refresh tokens. In local development, suspicious login emails are visible in Mailpit at `http://localhost:8025` when Redis, the email worker, and Mailpit are running.

Admin impersonation uses a dedicated user session with `impersonatedBy` set to the admin id. The impersonation token is short lived, can be revoked through normal session revocation, and can be stopped by the user-auth endpoint:

```text
POST /api/v1/auth/impersonate-user
POST /api/v1/user/auth/stop-impersonating
```

`POST /api/v1/auth/impersonate-user` accepts:

```json
{
  "userId": "1",
  "callbackUrl": "https://app.example.com"
}
```

The response includes `accessToken`, `refreshToken`, `tokenExpires`, `expiresAt`, `session`, `callbackUrl`, and `redirectUrl`. The portal can open `redirectUrl` in a new tab after receiving the response.

While an impersonated user session performs mutating actions, successful database changes are written to `impersonate_logs` by the audit subscriber with before/after data and changed fields. Failed mutating requests are written by the request interceptor with `status=failed`. Sensitive request fields such as passwords, secrets, API keys, and tokens are masked before being stored.

Impersonation log endpoints:

```text
GET /api/v1/impersonate-logs
GET /api/v1/impersonate-logs/:id
```

Required permissions:

- `impersonate:USER` to impersonate a user.
- `read:IMPERSONATE_LOG` to view impersonation logs.

## Admin Emails and Email Logs

Admins can send or schedule emails through the email queue. All admin-created emails use the configured system sender from `MAIL_DEFAULT_EMAIL`/`MAIL_DEFAULT_NAME`; the admin user's own email is never used as the `from` address.

Email queue jobs are logged in the `email_logs` table with recipients, subject, body, status, schedule time, sent time, failure message, queue job id, and the admin who created the email when applicable. System emails such as verification and forgot-password emails are also logged on a best-effort basis without changing the existing send flow.

Admin email endpoints:

```text
POST /api/v1/emails
GET  /api/v1/emails/my
GET  /api/v1/emails/:id
PATCH /api/v1/emails/:id
POST /api/v1/emails/:id/cancel
GET  /api/v1/emails/recipients
```

Email log endpoints:

```text
GET /api/v1/email-logs
GET /api/v1/email-logs/:id
```

Required permissions:

- `create:EMAIL` to send or schedule an email.
- `read:EMAIL` to view emails created by the current admin.
- `update:EMAIL` to edit scheduled emails.
- `delete:EMAIL` to cancel scheduled emails.
- `read:EMAIL_LOG` to view the global email log audit pages.

After adding or changing email permissions in `src/utils/permissions.constant.ts`, run the permission sync command from the RBAC section. Scheduled emails require Redis and the BullMQ email worker to be running.

## Tests

Jest loads test environment values from `.env.testing` through `setup-jest.mjs`.

Run tests inside Docker:

```bash
docker compose run --rm app pnpm test
docker compose run --rm app pnpm test:e2e
```

Run linting inside Docker:

```bash
docker compose run --rm app pnpm exec eslint "{src,apps,libs,test}/**/*.ts"
```

## Docker Image

Build the production image locally:

```bash
docker build --target production -t api:local .
```

Run the production image against the local Compose dependencies for a smoke test:

```bash
docker compose up -d postgres redis mailpit
docker run --rm --env-file .env --network web-server-pgsql_app-network -p 3000:3000 api:local
```

## Production Compose

`docker-compose.prod.yml` is intended for simple self-hosted production deployments. It runs only the API, PostgreSQL, and Redis. It does not include pgAdmin or Mailpit, and it does not expose PostgreSQL or Redis ports to the host.

Prepare the server environment:

```bash
cp .env.production.example .env
```

Edit `.env` and set real values, especially:

- `APP_IMAGE`
- database credentials
- Redis password
- JWT and auth secrets
- SMTP credentials
- CORS and public URLs

Pull and start the production stack:

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

View production logs:

```bash
docker compose -f docker-compose.prod.yml logs -f app
```

Stop production containers without deleting data:

```bash
docker compose -f docker-compose.prod.yml down
```

Run production migrations explicitly as a release step:

```bash
docker compose -f docker-compose.prod.yml run --rm app pnpm migration:run:prod
```

Sync the permission catalog after migrations whenever `src/utils/permissions.constant.ts` changes:

```bash
docker compose -f docker-compose.prod.yml run --rm app pnpm permissions:sync:prod
```

Do not bake production secrets into the image or commit them to the repository. For larger deployments, reuse the same `Dockerfile` production target with your orchestrator and provide environment variables through your platform or secret manager. The production migration command inside the built image is:

```bash
node node_modules/typeorm/cli.js --dataSource=dist/database/data-source.js migration:run
```

## Git Hooks and Commit Rules

Husky is enabled through the `prepare` script. After installing dependencies, Git hooks are installed automatically:

```bash
pnpm install
```

Active hooks:

- `pre-commit`: runs `lint-staged`
- `commit-msg`: runs `commitlint`

`lint-staged` runs ESLint and Prettier only on staged files.

Commit messages must follow Conventional Commits:

```text
<type>(optional-scope): <description>
```

Allowed common types:

- `feat`: new feature
- `fix`: bug fix
- `docs`: documentation-only change
- `style`: formatting or code style only
- `refactor`: code change without feature or bug fix
- `perf`: performance improvement
- `test`: tests
- `build`: build system or dependency changes
- `ci`: CI/CD changes
- `chore`: maintenance
- `revert`: revert a previous commit

Examples:

```text
feat(auth): add refresh token rotation
fix(docker): correct redis healthcheck
docs: update local setup guide
ci: publish docker image to ghcr
```

## CI/CD

The GitHub Actions workflow is defined in `.github/workflows/ci-cd.yml`:

- The `ci` job installs dependencies, lints, runs unit tests, runs e2e tests, builds the app, and validates the Docker build.
- The `docker` job builds with Docker Buildx, caches Docker layers, and pushes to GitHub Container Registry after CI passes on pushes to `main` or version tags.

The Docker job uses `GITHUB_TOKEN` for GitHub Container Registry. Add deployment credentials and production environment variables as GitHub secrets in the repository or environment settings when wiring an actual deploy job.
