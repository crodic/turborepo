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

## 3. UI Component & Design System Guidelines

- **Radix UI**: The repository uses the unified `radix-ui` package. Import primitives directly from `"radix-ui"` (e.g., `import { Dialog, RadioGroup, Slot } from "radix-ui"`). Do not install individual `@radix-ui/react-*` packages.
- **Styling**: TailwindCSS is used for styling. Keep design consistent with existing UI components in `components/ui`.

## 4. Git & Release Workflow

- **Commit Convention**: Commit messages MUST follow Conventional Commits (e.g., `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`).
- **Release Automation**: Releases are managed by `semantic-release` via [.releaserc.js](file:///.releaserc.js) and GitHub Actions [.github/workflows/release.yml](file:///.github/workflows/release.yml). Refer to [RELEASE.md](file:///RELEASE.md) for full release guidelines.
- **Scripts**: Helper scripts are stored in `./scripts/` (`setup.sh`, `config.sh`, `clear-storage.sh`). Always execute scripts via `pnpm run setup` or `pnpm run config`.
