#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_DIR="$ROOT_DIR/apps/api"
CLIENT_DIR="$ROOT_DIR/apps/client"
WEB_DIR="$ROOT_DIR/apps/web"

# Styling helpers
log() {
  printf '\033[1;34m[setup]\033[0m %s\n' "$*"
}

info() {
  printf '\033[1;36m[setup]\033[0m %s\n' "$*"
}

warn() {
  printf '\033[1;33m[setup]\033[0m %s\n' "$*"
}

fail() {
  printf '\033[1;31m[setup]\033[0m %s\n' "$*" >&2
  exit 1
}

has_docker() {
  command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1
}

run_pnpm() {
  (cd "$ROOT_DIR" && pnpm "$@")
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
      fail "Could not connect to PostgreSQL. Check apps/api/.env or running services."
    fi

    printf '.'
    sleep 2
  done
}

# Modular steps
step_prepare_env() {
  log "Preparing environment files (.env)"
  copy_env_if_missing "$API_DIR/.env.example" "$API_DIR/.env"
  copy_env_if_missing "$CLIENT_DIR/.env.example" "$CLIENT_DIR/.env"
  copy_env_if_missing "$WEB_DIR/.env.example" "$WEB_DIR/.env"
}

step_install_deps() {
  log "Installing workspace dependencies"
  run_pnpm install
}

step_start_docker() {
  if has_docker; then
    log "Starting PostgreSQL, Redis, Mailpit, and pgAdmin with Docker Compose"
    docker compose -f "$API_DIR/docker-compose.yml" up -d postgres redis mailpit pgadmin
  else
    warn "Docker Compose is not available. Skipping container startup."
    warn "Make sure PostgreSQL and Redis are reachable using apps/api/.env."
  fi
}

step_setup_database() {
  log "Creating database if needed"
  wait_for_api_database
  printf '\n'

  log "Running database migrations"
  run_pnpm --filter api migration:run

  log "Running relational seeds"
  run_pnpm --filter api seed:run

  log "Syncing permissions"
  run_pnpm --filter api permissions:sync
}

step_reset_database() {
  local force="${1:-false}"

  warn "⚠️  CAUTION: This will DROP all tables and permanently ERASE all data in the database!"
  if [[ "$force" == false ]]; then
    if ! prompt_yn "Are you sure you want to completely reset the database?" "N"; then
      info "Database reset cancelled."
      exit 0
    fi
  fi

  if has_docker; then
    log "Ensuring PostgreSQL is running with Docker Compose"
    docker compose -f "$API_DIR/docker-compose.yml" up -d postgres redis mailpit
  fi

  log "Waiting for database connection"
  wait_for_api_database
  printf '\n'

  log "Dropping existing database schema"
  run_pnpm --filter api schema:drop

  log "Running fresh database migrations"
  run_pnpm --filter api migration:run

  log "Running relational seeds"
  run_pnpm --filter api seed:run

  log "Syncing permissions"
  run_pnpm --filter api permissions:sync

  step_clear_storage
  log "✨ Database reset completed successfully!"
}

step_clear_storage() {
  log "Clearing local storage cache"
  bash "$ROOT_DIR/scripts/clear-storage.sh"
}

step_check_types() {
  log "Running workspace type checks"
  run_pnpm check-types
}

show_help() {
  cat <<'EOF'
Turborepo Setup Wizard

Usage:
  pnpm run setup [options]
  bash scripts/setup.sh [options]

Options:
  -d, --docker        Full setup with Docker (Postgres, Redis, Mailpit, pgAdmin)
  -l, --no-docker     Setup without Docker (uses local Postgres & Redis)
      --local         Alias for --no-docker
      --db-only       Run database migrations, seeds, permission sync, and clear storage
      --reset-db      Reset database: drop all tables, fresh migrations & seeds
  -f, --force         Skip confirmation prompts (used with --reset-db)
      --skip-types    Skip the type check step
  -h, --help          Show this help message

Interactive Mode:
  When run without options in a terminal, an interactive menu will be presented.
EOF
}

prompt_yn() {
  local prompt_text="$1"
  local default_choice="${2:-Y}"
  local response

  if [[ "$default_choice" =~ ^[Yy]$ ]]; then
    read -r -p "$prompt_text [Y/n]: " response || return 1
    response="${response:-y}"
  else
    read -r -p "$prompt_text [y/N]: " response || return 1
    response="${response:-n}"
  fi

  [[ "$response" =~ ^[Yy]$ ]]
}

main() {
  cd "$ROOT_DIR"

  command -v node >/dev/null 2>&1 || fail "Node.js is required."
  command -v pnpm >/dev/null 2>&1 || fail "pnpm is required. Run: corepack enable && corepack prepare pnpm@10.30.3 --activate"

  local mode=""
  local skip_types=false
  local force=false

  # Parse flags
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -d|--docker)
        mode="docker"
        shift
        ;;
      -l|--no-docker|--local)
        mode="no-docker"
        shift
        ;;
      --db-only)
        mode="db-only"
        shift
        ;;
      --reset-db)
        mode="reset-db"
        shift
        ;;
      -f|--force)
        force=true
        shift
        ;;
      --skip-types)
        skip_types=true
        shift
        ;;
      -h|--help)
        show_help
        exit 0
        ;;
      *)
        fail "Unknown argument: $1. Run 'pnpm run setup --help' for usage."
        ;;
    esac
  done

  # If no mode specified, prompt interactively if in a terminal
  if [[ -z "$mode" ]]; then
    if [[ -t 0 && -t 1 ]]; then
      printf '\n\033[1;35m=======================================================\033[0m\n'
      printf '\033[1;35m   🚀 Turborepo Monorepo Setup Wizard\033[0m\n'
      printf '\033[1;35m=======================================================\033[0m\n\n'
      printf 'Please choose a setup option:\n'
      printf '  \033[1;32m1)\033[0m Full Setup with Docker (Containers for DB, Redis, Mailpit, pgAdmin) \033[1;33m[Recommended]\033[0m\n'
      printf '  \033[1;32m2)\033[0m Local Setup without Docker (Use existing local PostgreSQL & Redis)\n'
      printf '  \033[1;32m3)\033[0m Database & Permissions Refresh Only (Run pending migrations + seeds + RBAC)\n'
      printf '  \033[1;31m4)\033[0m Reset Database (Drop all tables, fresh migrations & seeds) \033[1;31m[⚠️ DATA LOSS]\033[0m\n'
      printf '  \033[1;32m5)\033[0m Custom Setup (Select individual steps)\n'
      printf '  \033[1;32m6)\033[0m Exit\n\n'

      local choice
      read -r -p "Enter selection [1-6] (default: 1): " choice
      choice="${choice:-1}"

      case "$choice" in
        1)
          mode="docker"
          ;;
        2)
          mode="no-docker"
          ;;
        3)
          mode="db-only"
          ;;
        4)
          mode="reset-db"
          ;;
        5)
          mode="custom"
          ;;
        6)
          info "Setup cancelled."
          exit 0
          ;;
        *)
          fail "Invalid choice: $choice"
          ;;
      esac
    else
      # Non-interactive fallback: autodetect Docker
      if has_docker; then
        info "Non-interactive shell detected with Docker available. Running full setup with Docker."
        mode="docker"
      else
        info "Non-interactive shell detected without Docker. Running setup with local services."
        mode="no-docker"
      fi
    fi
  fi

  # Execute selected mode
  case "$mode" in
    docker)
      step_prepare_env
      step_install_deps
      step_start_docker
      step_setup_database
      step_clear_storage
      if [[ "$skip_types" == false ]]; then
        step_check_types
      fi
      ;;

    no-docker)
      step_prepare_env
      warn "Running without Docker. Ensure local PostgreSQL and Redis are active and match apps/api/.env."
      step_install_deps
      step_setup_database
      step_clear_storage
      if [[ "$skip_types" == false ]]; then
        step_check_types
      fi
      ;;

    db-only)
      step_setup_database
      step_clear_storage
      ;;

    reset-db)
      step_reset_database "$force"
      ;;

    custom)
      if prompt_yn "Prepare environment files (.env)?" "Y"; then
        step_prepare_env
      fi

      if prompt_yn "Install workspace dependencies (pnpm install)?" "Y"; then
        step_install_deps
      fi

      if prompt_yn "Start Docker infrastructure (Postgres, Redis, Mailpit, pgAdmin)?" "Y"; then
        step_start_docker
      else
        warn "Skipping Docker. Ensure local PostgreSQL and Redis are running if needed."
      fi

      if prompt_yn "Do you want to completely RESET the database (drop all tables)?" "N"; then
        step_reset_database "$force"
      elif prompt_yn "Initialize database (create, migrate, seed, sync permissions)?" "Y"; then
        step_setup_database
      fi

      if prompt_yn "Clear local storage cache?" "Y"; then
        step_clear_storage
      fi

      if prompt_yn "Run workspace type checks (check-types)?" "Y"; then
        step_check_types
      fi
      ;;
  esac

  printf '\n'
  log "✨ Setup completed successfully!"
  info "Available local applications:"
  printf '  - API Server:   \033[1;32mpnpm --filter api start:dev\033[0m  (http://localhost:8000)\n'
  printf '  - Client App:   \033[1;32mpnpm --filter client dev\033[0m     (http://localhost:3000)\n'
  printf '  - Admin Portal: \033[1;32mpnpm --filter web-portal dev\033[0m (http://localhost:5173)\n'
  printf '  - All at once:  \033[1;32mpnpm dev\033[0m\n\n'
}

main "$@"
