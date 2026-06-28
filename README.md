# Boilerplate Turborepo

Monorepo for the backend API, admin portal, shared configs, and shared packages.

## Workspaces

- `apps/api`: NestJS API, PostgreSQL, Redis, queues, mail, storage, admin/user auth.
- `apps/client`: Next.js client-facing website with i18n.
- `apps/web`: Vite React admin portal.
- `packages/eslint-config`: Shared ESLint configs.
- `packages/typescript-config`: Shared TypeScript configs.
- `packages/prettier-config`: Shared Prettier configs.
- `packages/commitlint-config`: Shared commitlint config.

## Requirements

- Node.js `20.19.0`
- pnpm `10.30.3`
- Docker Desktop or Docker Engine, optional but recommended for API dependencies

Use the repo-pinned versions:

```bash
nvm use
corepack enable
corepack prepare pnpm@10.30.3 --activate
```

## Install

Always install from the repository root:

```bash
pnpm install
```

The repo uses one root `pnpm-lock.yaml`. Do not run a separate install that creates nested lockfiles inside `apps/api`, `apps/client`, or `apps/web`.

## One-command Setup

For a new local machine that should use Docker for local infrastructure, run:

```bash
pnpm run setup
```

The setup script will:

- Copy `apps/api/.env.example` to `apps/api/.env` when missing.
- Copy `apps/client/.env.example` to `apps/client/.env` when missing.
- Copy `apps/web/.env.example` to `apps/web/.env` when missing.
- Install dependencies.
- Start PostgreSQL, Redis, Mailpit, and pgAdmin with Docker Compose when Docker is available.
- Create the database when it does not exist.
- Run migrations.
- Run seeds.
- Sync permissions from source constants.
- Run type checks.

The script is safe to run more than once. It does not overwrite existing `.env` files, TypeORM skips applied migrations, and database creation skips existing databases.

## Setup Without Docker

Use this flow when your machine already has the required services installed and running locally, for example PostgreSQL and Redis.

```bash
pnpm run config
```

The config script will:

- Copy `apps/api/.env.example` to `apps/api/.env` when missing.
- Copy `apps/client/.env.example` to `apps/client/.env` when missing.
- Copy `apps/web/.env.example` to `apps/web/.env` when missing.
- Install dependencies.
- Use the service connection values from `apps/api/.env`.
- Create the database when it does not exist.
- Run migrations.
- Run seeds.
- Sync permissions from source constants.
- Run type checks.

This script never starts Docker services. Before running it, make sure local PostgreSQL and Redis are already running and that `apps/api/.env` points to the correct host, port, username, password, and database name. It is safe to run more than once for the same reasons as `pnpm run setup`.

## Environment Setup

Copy env examples for the apps you want to run:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/client/.env.example apps/client/.env
cp apps/web/.env.example apps/web/.env
```

For API tests, `apps/api/.env.testing` is already included.

## User Google OAuth

The client user app supports Google sign-in and linking one Google account to an existing user account.

Configure these API variables in `apps/api/.env`:

```bash
USER_AUTH_CLIENT_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_OAUTH_CALLBACK_URL=http://localhost:8000/api/v1/user/auth/social/google/callback
```

Register this authorized redirect URI in Google Cloud Console for local development:

```text
http://localhost:8000/api/v1/user/auth/social/google/callback
```

Google OAuth behavior:

- New users can register/sign in with Google when Google returns a verified email.
- Existing users can sign in with Google when the verified Google email matches their account email.
- Logged-in users can link one Google account from the client profile page.
- Linking rejects Google accounts whose email differs from the current user email, which avoids accidentally merging two identities.
- Users created through Google have no password by default; they can configure an initial password from the client profile page and then sign in with either Google or email/password.

## Admin User Impersonation

The admin portal can start a user impersonation session from the user detail page. Configure the admin app callback so the new tab opens the client website:

```bash
VITE_CLIENT_URL=http://localhost:3000
VITE_IMPERSONATION_CALLBACK_URL=http://localhost:3000/auth/impersonation/callback
```

The API creates a short-lived one-time exchange token for the redirect. The client callback exchanges that token with `POST /api/v1/user/auth/impersonation/exchange`, stores the returned tokens in httpOnly cookies, then redirects to `/client-profile`.

The client app renders `ImpersonationBanner` from `apps/client/src/components/impersonation`. To remove impersonation UI later, remove that component from `apps/client/src/app/[locale]/layout.tsx`; the rest of the client pages are not coupled to the banner.

## Run Locally

Run everything through Turborepo:

```bash
pnpm dev
```

Build and start all apps without dev watchers:

```bash
pnpm start
```

Run only one app:

```bash
pnpm --filter api start:dev
pnpm --filter client dev
pnpm --filter web-portal dev
```

Common app URLs:

- API: `http://localhost:8000` when `APP_PORT=8000`
- Client website: `http://localhost:3000`
- Admin portal: `http://localhost:5173`
- Mailpit UI from Docker compose: `http://localhost:8025`
- pgAdmin from Docker compose: `http://localhost:5050`

## Docker Development

The root compose file runs the full local stack as services:

- API: `http://localhost:8000`
- Admin portal: `http://localhost:5173`
- Client website: `http://localhost:3000`
- Mailpit UI: `http://localhost:8025`
- pgAdmin: `http://localhost:5050`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

Start everything:

```bash
pnpm docker:dev
```

Or use Docker Compose directly:

```bash
docker compose up --build
```

Stop the stack:

```bash
pnpm docker:down
```

The root compose file uses the app env files:

- `apps/api/.env`
- `apps/web/.env`
- `apps/client/.env`

For the Next.js client, `NEXT_PUBLIC_API_URL` remains `http://localhost:8000` for browser requests, while `SERVER_API_URL` can point to the internal Docker service URL for server-side middleware calls. The root compose file sets `SERVER_API_URL=http://api:8000` automatically.

## API Dependencies With Docker

The API compose file lives in `apps/api`, but it is monorepo-aware and builds from the repository root.

Start API + PostgreSQL + Redis + Mailpit + pgAdmin:

```bash
docker compose -f apps/api/docker-compose.yml up --build
```

Start only infrastructure services and run the API on the host:

```bash
docker compose -f apps/api/docker-compose.yml up postgres redis mailpit pgadmin
pnpm --filter api start:dev
```

Production compose expects a prebuilt API image:

```bash
APP_IMAGE=ghcr.io/<owner>/<repo>-api:<tag> \
docker compose -f apps/api/docker-compose.prod.yml up -d
```

## Build

Build everything:

```bash
pnpm build
```

Build one app:

```bash
pnpm --filter api build
pnpm --filter client build
pnpm --filter web-portal build
```

Start one built app:

```bash
pnpm --filter api start
pnpm --filter client start
pnpm --filter web-portal start
```

## Lint, Type Check, Test

Run all workspace checks:

```bash
pnpm lint
pnpm check-types
pnpm test
```

Run app-specific checks:

```bash
pnpm --filter api lint
pnpm --filter api check-types
pnpm --filter api test:ci
pnpm --filter api test:e2e

pnpm --filter client lint
pnpm --filter client check-types
pnpm --filter client test:ci

pnpm --filter web-portal lint
pnpm --filter web-portal check-types
pnpm --filter web-portal test:coverage
```

Use fix scripts when you intentionally want automated edits:

```bash
pnpm --filter api lint:fix
pnpm --filter client lint:fix
pnpm --filter web-portal lint:fix
pnpm format
```

## Database Tasks

Run API database commands with the API workspace filter:

```bash
pnpm --filter api db:create
pnpm --filter api migration:run
pnpm --filter api seed:run:relational
pnpm --filter api permissions:sync
```

Production commands:

```bash
pnpm --filter api build
pnpm --filter api migration:run:prod
pnpm --filter api seed:run:relational:prod
pnpm --filter api permissions:sync:prod
```

## Docker Images

Build API image from the repo root:

```bash
docker build -f apps/api/Dockerfile --target production -t api .
```

Build web image from the repo root:

```bash
docker build -f apps/web/Dockerfile --target production -t web-portal .
```

Build client website image from the repo root:

```bash
docker build -f apps/client/Dockerfile --target production -t boilerplate-client .
```

The API image runs `node dist/main.js`. The web image serves `apps/web/dist` with nginx.
The client image runs the Next.js standalone server on port `3000`.

## CI/CD

GitHub Actions workflow:

- `.github/workflows/ci-cd.yml`

The workflow runs:

- API lint, type-check, unit tests, e2e tests, build, Docker build validation.
- Web lint, type-check, coverage tests, build, artifact upload, Docker build validation.
- Docker image publishing to GHCR on `main` or version tags.

Published images:

- `ghcr.io/<owner>/<repo>-api`
- `ghcr.io/<owner>/<repo>-client`
- `ghcr.io/<owner>/<repo>-web`

Deployment instructions are documented in [DELOYMENT.md](./DELOYMENT.md).

## Adding Packages

Install runtime dependencies for one app:

```bash
pnpm --filter api add <package>
pnpm --filter client add <package>
pnpm --filter web-portal add <package>
```

Install dev dependencies for one app:

```bash
pnpm --filter api add -D <package>
pnpm --filter client add -D <package>
pnpm --filter web-portal add -D <package>
```

Install a root-level dev tool:

```bash
pnpm add -D -w <package>
```

Install a dependency for a shared package:

```bash
pnpm --filter @repo/eslint-config add -D <package>
pnpm --filter @repo/prettier-config add <package>
```

Create a new workspace package under `packages/<name>` and add it to an app:

```bash
pnpm --filter web-portal add @repo/<name>@workspace:*
```

## Git Hooks

Husky runs from the root:

- `pre-commit`: `pnpm exec lint-staged`
- `commit-msg`: `pnpm exec commitlint --edit "$1"`

Commit messages follow conventional commits.

## Notes

- Keep shared config in `packages/*`.
- Keep app-specific runtime code inside `apps/api`, `apps/client`, or `apps/web`.
- Keep one lockfile at the root.
- Docker builds must use the repository root as build context.
