# Deployment Guide

This guide explains how to deploy the monorepo applications:

- API: `apps/api`
- Client website: `apps/client`
- Admin portal: `apps/web`

The repository is a pnpm workspace. Build and deploy commands should be run from the repository root unless noted otherwise.

## Requirements

- Node.js `20.19.0`
- pnpm `10.30.3`
- Docker Buildx
- PostgreSQL 16+
- Redis 7+
- SMTP provider
- Object storage, optional depending on `FILESYSTEM_DISK`

Enable the pinned package manager:

```bash
corepack enable
corepack prepare pnpm@10.30.3 --activate
```

## Production Environment Files

Create production env files from examples:

```bash
cp apps/api/.env.production.example apps/api/.env
cp apps/client/.env.example apps/client/.env
cp apps/web/.env.example apps/web/.env
```

Review every value before deploying. Important API variables:

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
- `AWS_*` when using S3
- `SENTRY_*` when Sentry is enabled

Important client website variables are listed in `apps/client/.env.example`.
Important admin portal variables are listed in `apps/web/.env.example`.

## Install and Validate

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm check-types
pnpm --filter nestjs-boilerplate test:ci
pnpm --filter client test:ci
pnpm --filter admin-template test:coverage
pnpm build
```

## Database Deployment

Run these commands after configuring `apps/api/.env` for the target database:

```bash
pnpm --filter nestjs-boilerplate build
pnpm --filter nestjs-boilerplate db:create
pnpm --filter nestjs-boilerplate migration:run:prod
pnpm --filter nestjs-boilerplate seed:run:relational:prod
pnpm --filter nestjs-boilerplate permissions:sync:prod
```

Notes:

- `db:create` is idempotent and skips existing databases.
- TypeORM migrations skip migrations that already ran.
- Seed scripts are designed to avoid duplicating seeded users/admins.
- Permission sync updates permissions from `permissions.constant.ts`.

## Docker Build

Build API image from the repository root:

```bash
docker build -f apps/api/Dockerfile --target production -t boilerplate-api .
```

Build web image from the repository root:

```bash
docker build -f apps/web/Dockerfile --target production -t boilerplate-web .
```

Build client website image from the repository root:

```bash
docker build -f apps/client/Dockerfile --target production -t boilerplate-client .
```

The API image starts:

```bash
node dist/main.js
```

The web image serves static Vite output through nginx on port `80`.
The client image runs the Next.js standalone server on port `3000`.

## Docker Compose Production

The production compose file currently covers the API, PostgreSQL, and Redis.

```bash
APP_IMAGE=ghcr.io/<owner>/<repo>-api:<tag> \
docker compose -f apps/api/docker-compose.prod.yml up -d
```

For the web apps, deploy the published images separately behind your reverse proxy or platform:

```bash
docker run -d --name boilerplate-web -p 80:80 ghcr.io/<owner>/<repo>-web:<tag>
docker run -d --name boilerplate-client -p 3000:3000 ghcr.io/<owner>/<repo>-client:<tag>
```

## GitHub Actions

The workflow lives at:

```text
.github/workflows/ci-cd.yml
```

It runs:

- API lint, type-check, unit tests, e2e tests, build, Docker build validation.
- Client lint, type-check, tests, build, Docker build validation.
- Web lint, type-check, coverage tests, build, Docker build validation.
- Docker publish on `main` and version tags.

Images are published to:

```text
ghcr.io/<owner>/<repo>-api
ghcr.io/<owner>/<repo>-client
ghcr.io/<owner>/<repo>-web
```

## Release Flow

1. Merge to `main`.
2. Wait for CI/CD to publish API, client, and web images.
3. Pull the new image tags on the server.
4. Run database migrations.
5. Restart API and web containers.
6. Verify health checks and login flow.

Example:

```bash
docker pull ghcr.io/<owner>/<repo>-api:<tag>
docker pull ghcr.io/<owner>/<repo>-client:<tag>
docker pull ghcr.io/<owner>/<repo>-web:<tag>

pnpm --filter nestjs-boilerplate migration:run:prod
pnpm --filter nestjs-boilerplate permissions:sync:prod

APP_IMAGE=ghcr.io/<owner>/<repo>-api:<tag> \
docker compose -f apps/api/docker-compose.prod.yml up -d
```

## Rollback

1. Redeploy the previous API, client, and web image tags.
2. Revert database migration only when the migration is explicitly reversible and the rollback is safe.
3. Re-run smoke tests after rollback.

```bash
APP_IMAGE=ghcr.io/<owner>/<repo>-api:<previous-tag> \
docker compose -f apps/api/docker-compose.prod.yml up -d

docker run -d --name boilerplate-web -p 80:80 ghcr.io/<owner>/<repo>-web:<previous-tag>
docker run -d --name boilerplate-client -p 3000:3000 ghcr.io/<owner>/<repo>-client:<previous-tag>
```

## Smoke Checks

After deployment:

```bash
curl -f https://api.example.com/api/v1/health
curl -f https://www.example.com
curl -f https://portal.example.com
```

Then verify:

- Admin login.
- `/me` API response.
- Permissions loading.
- File upload if storage is enabled.
- Email sending if SMTP is enabled.
- WebSocket connection if realtime features are enabled.
