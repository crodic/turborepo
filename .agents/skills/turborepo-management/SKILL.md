---
name: turborepo-management
description: Guidelines and helper commands for developing, managing, and maintaining this Turborepo monorepo codebase.
---

# Turborepo Workspace Management Skill

This skill provides step-by-step guidance for developing, testing, and adding features to this Turborepo monorepo.

## Common Workspace Commands

### Development

- Run all apps concurrently: `pnpm dev`
- Run specific app: `pnpm --filter api dev`, `pnpm --filter client dev`, `pnpm --filter web-portal dev`

### Building & Checking

- Build all workspaces: `pnpm build`
- Type check: `pnpm check-types`
- Lint code: `pnpm lint`
- Run test suites: `pnpm test`

### Database Tasks (API Workspace)

- Create local database: `pnpm --filter api db:create`
- Run migrations: `pnpm --filter api migration:run`
- Run relational seeds: `pnpm --filter api seed:run:relational`
- Sync permissions: `pnpm --filter api permissions:sync`

## Dependency Management Rules

- Add runtime dependency to an app: `pnpm --filter <app-name> add <package>`
- Add dev dependency to an app: `pnpm --filter <app-name> add -D <package>`
- Add root-level dev tool: `pnpm add -D -w <package>`
- Add workspace package dependency: `pnpm --filter <app-name> add @repo/<package-name>@workspace:*`
