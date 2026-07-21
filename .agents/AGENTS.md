# Workspace Rules for Antigravity AI Agent

This document defines project-specific guidelines and rules for working with this Monorepo repository.

## 1. Package Manager & Monorepo Structure

- **Package Manager**: Use `pnpm` (v10.30.3). Never run `npm install` or `yarn`. Always manage dependencies from the workspace root using `pnpm --filter <workspace> add <package>`.
- **Root Lockfile**: Maintain a single `pnpm-lock.yaml` at the repository root. Do not generate nested lockfiles inside `apps/` or `packages/`.
- **Orchestration**: Tasks are orchestrated by **Turborepo** (`turbo.json`). Run tasks across all workspaces via `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm check-types`, and `pnpm test`.

## 2. Workspace Applications & Packages

- **`apps/api`**: NestJS backend with PostgreSQL (TypeORM), Redis, Mailpit, Bull Queue, and Swagger.
- **`apps/client`**: Next.js (App Router) client-facing website with i18n support.
- **`apps/web`**: Vite + React admin portal.
- **`packages/*`**: Shared configurations (`eslint-config`, `typescript-config`, `prettier-config`, `commitlint-config`) and shared UI primitives (`ui`).

## 3. UI Component & Frontend Guidelines

- **Radix UI**: The repository uses the unified `radix-ui` package. Import primitives directly from `"radix-ui"` (e.g., `import { Dialog, RadioGroup, Slot } from "radix-ui"`). Do not install individual `@radix-ui/react-*` packages.
- **Styling**: TailwindCSS is used for styling. Keep design consistent with existing UI components in `components/ui`.
- **Form Management & Validation**: ALWAYS use **Zod** schema validation combined with **React Hook Form** (via shadcn `Form` components in `components/ui/form`) for ALL forms in the application, regardless of form size or complexity.
- **State Management & Data Fetching**: Use **React Query (`@tanstack/react-query`)** for all server API data fetching, mutations, and caching. Use **Zustand** only for global client-side UI/session state.
- **Internationalization (i18n)**: Do NOT hardcode user-facing UI text strings. Always use translation keys via `next-intl` (in `apps/client`) or `react-i18next` (in `apps/web`).
- **Error Handling & Feedback**: Never swallow exceptions silently in empty catch blocks. Always inform users of API or submission failures using **Sonner** toasts or inline form validation messages.
- **Component Reusability**: When creating new UI components that are intended to be shared, design them to be highly reusable, loosely coupled, and modular with clean TypeScript props interfaces.
- **Performance Optimization**: Prioritize React performance optimizations. Wrap reusable components with `React.memo` where beneficial, and optimize callbacks and expensive computations using `useCallback` and `useMemo` to avoid unnecessary re-renders.

## 4. Backend Architecture & Development Guidelines (`apps/api`)

- **Modular NestJS Architecture**: Place domain features inside `apps/api/src/api/<feature-name>`. Maintain strict separation between Controllers, Services, DTOs, and Persistence entities.
- **Data Validation & DTOs**: Validate all request payloads using `class-validator` and `class-transformer` decorators inside DTO classes.
- **Database & TypeORM**: Use TypeORM for PostgreSQL persistence. Schema modifications MUST be accompanied by TypeORM migrations (`pnpm --filter api migration:generate` / `migration:run`).
- **Swagger / OpenAPI Documentation**: Annotate all controller endpoints with Swagger decorators (`@ApiTags`, `@ApiOperation`, `@ApiResponse`, `@ApiProperty`).
- **Security & Authorization**: Protect endpoints using JWT Auth Guards and permission decorators (`@RequirePermission(...)` / `@Roles(...)`).

## 5. Git & Release Workflow

- **Commit Convention**: Commit messages MUST follow Conventional Commits (e.g., `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`).
- **Release Automation**: Releases are managed by `semantic-release` via [.releaserc.js](file:///.releaserc.js) and GitHub Actions [.github/workflows/release.yml](file:///.github/workflows/release.yml). Refer to [RELEASE.md](file:///RELEASE.md) for full release guidelines.
- **Scripts**: Helper scripts are stored in `./scripts/` (`setup.sh`, `config.sh`, `clear-storage.sh`). Always execute scripts via `pnpm run setup` or `pnpm run config`.
