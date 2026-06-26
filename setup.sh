#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$ROOT_DIR/apps/api"
CLIENT_DIR="$ROOT_DIR/apps/client"
WEB_DIR="$ROOT_DIR/apps/web"

log() {
  printf '\033[1;34m[setup]\033[0m %s\n' "$*"
}

warn() {
  printf '\033[1;33m[setup]\033[0m %s\n' "$*"
}

fail() {
  printf '\033[1;31m[setup]\033[0m %s\n' "$*" >&2
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

has_docker() {
  command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1
}

run_pnpm() {
  (cd "$ROOT_DIR" && pnpm "$@")
}

wait_for_api_database() {
  local attempts=30

  for ((i = 1; i <= attempts; i++)); do
    if run_pnpm --filter api db:create >/tmp/turborepo-setup-db.log 2>&1; then
      cat /tmp/turborepo-setup-db.log
      rm -f /tmp/turborepo-setup-db.log
      return
    fi

    if ((i == attempts)); then
      cat /tmp/turborepo-setup-db.log >&2 || true
      rm -f /tmp/turborepo-setup-db.log
      fail "Could not connect to PostgreSQL. Check apps/api/.env or Docker services."
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

  log "Installing dependencies"
  run_pnpm install

  if has_docker; then
    log "Starting PostgreSQL, Redis, Mailpit, and pgAdmin with Docker Compose"
    docker compose -f "$API_DIR/docker-compose.yml" up -d postgres redis mailpit pgadmin
  else
    warn "Docker Compose is not available. Skipping infrastructure startup."
    warn "Make sure PostgreSQL and Redis are reachable using apps/api/.env."
  fi

  log "Creating database if needed"
  wait_for_api_database
  printf '\n'

  log "Running database migrations"
  run_pnpm --filter api migration:run

  log "Running relational seeds"
  run_pnpm --filter api seed:run:relational

  log "Syncing permissions"
  run_pnpm --filter api permissions:sync

  log "Running type checks"
  run_pnpm check-types

  log "Setup completed successfully"
  log "API: pnpm --filter api start:dev"
  log "Client: pnpm --filter client dev"
  log "Web: pnpm --filter web-portal dev"
}

main "$@"
