#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_DIR="$ROOT_DIR/apps/api"
CLIENT_DIR="$ROOT_DIR/apps/client"
WEB_DIR="$ROOT_DIR/apps/web"

log() {
  printf '\033[1;34m[config]\033[0m %s\n' "$*"
}

warn() {
  printf '\033[1;33m[config]\033[0m %s\n' "$*"
}

fail() {
  printf '\033[1;31m[config]\033[0m %s\n' "$*" >&2
  exit 1
}

copy_env_if_missing() {
  local example_file="$1"
  local target_file="$2"

  if [[ ! -f "$example_file" ]]; then
    fail "Missing env example: $example_file"
  fi

  if [[ -f "$target_file" ]]; then
    log "Keeping existing ${target_file#$ROOT_DIR/}"
    return
  fi

  cp "$example_file" "$target_file"
  log "Created ${target_file#$ROOT_DIR/}"
}

run_pnpm() {
  (cd "$ROOT_DIR" && pnpm "$@")
}

wait_for_api_database() {
  local attempts=30

  for ((i = 1; i <= attempts; i++)); do
    if run_pnpm --filter api db:create >/tmp/turborepo-config-db.log 2>&1; then
      cat /tmp/turborepo-config-db.log
      rm -f /tmp/turborepo-config-db.log
      return
    fi

    if ((i == attempts)); then
      cat /tmp/turborepo-config-db.log >&2 || true
      rm -f /tmp/turborepo-config-db.log
      fail "Could not connect to PostgreSQL. Check apps/api/.env and make sure local services are running."
    fi

    printf '.'
    sleep 2
  done
}

main() {
  cd "$ROOT_DIR"

  command -v node >/dev/null 2>&1 || fail "Node.js is required."
  command -v pnpm >/dev/null 2>&1 || fail "pnpm is required. Run: corepack enable && corepack prepare pnpm@10.30.3 --activate"

  log "Preparing env files"
  copy_env_if_missing "$API_DIR/.env.example" "$API_DIR/.env"
  copy_env_if_missing "$CLIENT_DIR/.env.example" "$CLIENT_DIR/.env"
  copy_env_if_missing "$WEB_DIR/.env.example" "$WEB_DIR/.env"

  warn "This script does not start Docker services."
  warn "Make sure PostgreSQL, Redis, and any optional local services are already running and match apps/api/.env."

  log "Installing dependencies"
  run_pnpm install

  log "Creating database if needed"
  wait_for_api_database
  printf '\n'

  log "Clearing local storage"
  bash "$ROOT_DIR/scripts/clear-storage.sh"

  log "Running database migrations"
  run_pnpm --filter api migration:run

  log "Running relational seeds"
  run_pnpm --filter api seed:run:relational

  log "Syncing permissions"
  run_pnpm --filter api permissions:sync

  log "Running type checks"
  run_pnpm check-types

  log "Local configuration completed successfully"
  log "API: pnpm --filter api start:dev"
  log "Client: pnpm --filter client dev"
  log "Web: pnpm --filter web-portal dev"
}

main "$@"
