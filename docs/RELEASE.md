# 🚀 Release Process & Semantic Release Guide

This document provides a detailed guide on the automated release workflow (**Semantic Release**) in this Monorepo project.

---

## 📋 1. Release Process Overview

The project uses **`semantic-release`** integrated with **GitHub Actions** to fully automate releases:

- Analyzes commit messages following the [Conventional Commits](https://www.conventionalcommits.org/) specification.
- Calculates the next version according to [Semantic Versioning (SemVer)](https://semver.org/).
- Automatically generates and updates release notes in `CHANGELOG.md`.
- Automatically bumps the version in `package.json`.
- Automatically publishes **Git Tags** and **GitHub Releases** on the repository.

---

## 📝 2. Commit Message Rules (Conventional Commits)

To ensure accurate version calculation, **all commit messages pushed or merged to `main` must adhere to**:

```text
<type>(<scope>): <description>
```

### Version Impact Table:

| Prefix (`type`)                     | Meaning                                | Release Type   | Version Example    |
| :---------------------------------- | :------------------------------------- | :------------- | :----------------- |
| **`fix`**                           | Bug fixes                              | **PATCH**      | `1.0.0` ➡️ `1.0.1` |
| **`feat`**                          | New features                           | **MINOR**      | `1.0.0` ➡️ `1.1.0` |
| **`refactor`** / **`perf`**         | Refactoring / Performance improvements | **PATCH**      | `1.0.0` ➡️ `1.0.1` |
| **`BREAKING CHANGE`**               | Breaking changes                       | **MAJOR**      | `1.0.0` ➡️ `2.0.0` |
| **`docs`**                          | Documentation updates                  | **PATCH**      | `1.0.0` ➡️ `1.0.1` |
| **`chore`** / **`test`** / **`ci`** | Maintenance, testing, CI/CD            | **No Release** | _(Unchanged)_      |

### Valid Commit Examples:

- **Bug fix (Patch release):**
  ```bash
  git commit -m "fix(api): fix user authentication token expiration"
  ```
- **New feature (Minor release):**
  ```bash
  git commit -m "feat(client): add google oauth social login"
  ```
- **Breaking change (Major release):**
  ```bash
  git commit -m "feat(api)!: migrate all REST endpoints to v2"
  # Or include 'BREAKING CHANGE:' in the commit body
  ```

---

## 🛠️ 3. Local Commands

### A. Dry-run Mode:

Test locally to preview the next version and release notes without making any actual changes:

```bash
pnpm release:dry-run
```

### B. Manual Release:

_(Typically for maintainers releasing directly from a local machine with `GITHUB_TOKEN`)_:

```bash
GITHUB_TOKEN=<your-github-personal-access-token> pnpm release
```

---

## ⚙️ 4. GitHub Actions Automation

The workflow configuration is located at [../.github/workflows/release.yml](../.github/workflows/release.yml):

1. **Branch & Develop:** Create a feature branch (e.g., `feat/user-profile`), write code, and make conventional commits.
2. **Create Pull Request:** Open a PR targeting `main`. CI checks (Lint, Type-check, Build, Test) are automatically triggered.
3. **Merge to `main`:** When the PR is merged:
   - The GitHub Actions **Release** workflow runs automatically.
   - Analyzes commits added since the last release.
   - Creates a new git tag, updates `CHANGELOG.md` and `package.json`.
   - Publishes an official **GitHub Release**.

---

## 📄 5. Configuration (.releaserc.js)

The configuration file is located at [../.releaserc.js](../.releaserc.js):

- **`branches`**: Releases from `main`, `master`, `beta`, `alpha`.
- **`plugins`**:
  - `@semantic-release/commit-analyzer`: Analyzes commit messages.
  - `@semantic-release/release-notes-generator`: Generates detailed changelog notes.
  - `@semantic-release/changelog`: Updates `CHANGELOG.md`.
  - `@semantic-release/npm`: Updates `package.json` (`npmPublish: false`).
  - `@semantic-release/git`: Commits modified files back to the git repository.
  - `@semantic-release/github`: Publishes the release to GitHub Releases.
