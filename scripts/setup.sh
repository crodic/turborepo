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

set_env_val() {
  local file="$1"
  local key="$2"
  local val="$3"

  if [[ ! -f "$file" ]]; then
    return
  fi

  node -e '
    const fs = require("fs");
    const file = process.argv[1];
    const key = process.argv[2];
    const val = process.argv[3];
    if (!fs.existsSync(file)) process.exit(0);
    let content = fs.readFileSync(file, "utf8");
    const reg = new RegExp(`^${key}=.*$`, "m");
    if (reg.test(content)) {
      content = content.replace(reg, `${key}=${val}`);
    } else {
      content = content.trimEnd() + `\n${key}=${val}\n`;
    }
    fs.writeFileSync(file, content);
  ' "$file" "$key" "$val"
}

OPT_API_PORT=""
OPT_CLIENT_PORT=""
OPT_WEB_PORT=""
ACTUAL_API_PORT="8000"
ACTUAL_CLIENT_PORT="3000"
ACTUAL_WEB_PORT="5173"

step_configure_ports() {
  local default_api_port="8000"
  local default_client_port="3000"
  local default_web_port="5173"

  if [[ -f "$API_DIR/.env" ]]; then
    local p
    p=$(grep -E "^APP_PORT=" "$API_DIR/.env" 2>/dev/null | cut -d= -f2 || true)
    default_api_port="${p:-$default_api_port}"
  fi

  if [[ -f "$CLIENT_DIR/.env" ]]; then
    local p
    p=$(grep -E "^PORT=" "$CLIENT_DIR/.env" 2>/dev/null | cut -d= -f2 || true)
    default_client_port="${p:-$default_client_port}"
  fi

  if [[ -f "$WEB_DIR/.env" ]]; then
    local p
    p=$(grep -E "^PORT=" "$WEB_DIR/.env" 2>/dev/null | cut -d= -f2 || true)
    default_web_port="${p:-$default_web_port}"
  fi

  local target_api_port="${OPT_API_PORT:-}"
  local target_client_port="${OPT_CLIENT_PORT:-}"
  local target_web_port="${OPT_WEB_PORT:-}"

  if [[ -t 0 && -t 1 ]] && [[ -z "$target_api_port" || -z "$target_client_port" || -z "$target_web_port" ]]; then
    printf '\n\033[1;36m[setup]\033[0m Application Ports Configuration (Press Enter to keep defaults):\n'
    if [[ -z "$target_api_port" ]]; then
      read -r -p "  API Server port [default: ${default_api_port}]: " input_val || true
      target_api_port="${input_val:-$default_api_port}"
    fi

    if [[ -z "$target_client_port" ]]; then
      read -r -p "  Client Website port [default: ${default_client_port}]: " input_val || true
      target_client_port="${input_val:-$default_client_port}"
    fi

    if [[ -z "$target_web_port" ]]; then
      read -r -p "  Admin Portal (Web) port [default: ${default_web_port}]: " input_val || true
      target_web_port="${input_val:-$default_web_port}"
    fi
  else
    target_api_port="${target_api_port:-$default_api_port}"
    target_client_port="${target_client_port:-$default_client_port}"
    target_web_port="${target_web_port:-$default_web_port}"
  fi

  ACTUAL_API_PORT="$target_api_port"
  ACTUAL_CLIENT_PORT="$target_client_port"
  ACTUAL_WEB_PORT="$target_web_port"

  log "Synchronizing ports & cross-service URLs (API: ${target_api_port}, Client: ${target_client_port}, Web: ${target_web_port})"

  # 1. Update apps/api/.env
  set_env_val "$API_DIR/.env" "APP_PORT" "$target_api_port"
  set_env_val "$API_DIR/.env" "APP_URL" "http://localhost:${target_api_port}"
  set_env_val "$API_DIR/.env" "APP_CORS_ORIGIN" "http://localhost:${target_web_port},http://localhost:${target_client_port}"
  set_env_val "$API_DIR/.env" "APP_SECURE_HEADER_ORIGIN" "http://localhost:${target_client_port},http://localhost:${target_web_port}"
  set_env_val "$API_DIR/.env" "AUTH_PORTAL_URL" "http://localhost:${target_web_port}"
  set_env_val "$API_DIR/.env" "AUTH_PORTAL_RESET_PASSWORD_URL" "http://localhost:${target_web_port}/reset-password"
  set_env_val "$API_DIR/.env" "USER_AUTH_CLIENT_URL" "http://localhost:${target_client_port}"
  set_env_val "$API_DIR/.env" "USER_AUTH_CLIENT_RESET_PASSWORD_URL" "http://localhost:${target_client_port}/auth/reset-password"
  set_env_val "$API_DIR/.env" "GOOGLE_OAUTH_CALLBACK_URL" "http://localhost:${target_api_port}/api/v1/user/auth/social/google/callback"

  # 2. Update apps/client/.env
  set_env_val "$CLIENT_DIR/.env" "PORT" "$target_client_port"
  set_env_val "$CLIENT_DIR/.env" "NEXT_PUBLIC_APP_URL" "http://localhost:${target_client_port}"
  set_env_val "$CLIENT_DIR/.env" "NEXT_PUBLIC_API_URL" "http://localhost:${target_api_port}"
  set_env_val "$CLIENT_DIR/.env" "NEXT_PUBLIC_SOCKET_URL" "http://localhost:${target_api_port}"
  set_env_val "$CLIENT_DIR/.env" "NEXT_PUBLIC_ADMIN_PORTAL_URL" "http://localhost:${target_web_port}"
  set_env_val "$CLIENT_DIR/.env" "SERVER_API_URL" "http://localhost:${target_api_port}"

  # 3. Update apps/web/.env
  set_env_val "$WEB_DIR/.env" "PORT" "$target_web_port"
  set_env_val "$WEB_DIR/.env" "VITE_API_URL" "http://localhost:${target_api_port}/api/v1"
  set_env_val "$WEB_DIR/.env" "VITE_SOCKET_URL" "http://localhost:${target_api_port}"
  set_env_val "$WEB_DIR/.env" "VITE_CLIENT_URL" "http://localhost:${target_client_port}"
}

# Modular steps
step_prepare_env() {
  log "Preparing environment files (.env)"
  copy_env_if_missing "$API_DIR/.env.example" "$API_DIR/.env"
  copy_env_if_missing "$CLIENT_DIR/.env.example" "$CLIENT_DIR/.env"
  copy_env_if_missing "$WEB_DIR/.env.example" "$WEB_DIR/.env"
  step_configure_ports
}

step_install_deps() {
  log "Installing workspace dependencies"
  run_pnpm install
}

step_start_docker() {
  if has_docker; then
    log "Starting PostgreSQL, Redis, Mailpit, and pgAdmin with Docker Compose"
    local compose_args=()
    if [[ -f "$API_DIR/.env" ]]; then
      compose_args+=(--env-file "$API_DIR/.env")
    fi
    docker compose "${compose_args[@]}" -f "$API_DIR/docker-compose.yml" up -d postgres redis mailpit pgadmin
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
    local compose_args=()
    if [[ -f "$API_DIR/.env" ]]; then
      compose_args+=(--env-file "$API_DIR/.env")
    fi
    docker compose "${compose_args[@]}" -f "$API_DIR/docker-compose.yml" up -d postgres redis mailpit
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

step_generate_i18n_types() {
  log "Regenerating next-intl message type declarations"
  node -e '
    const fs = require("fs");
    const path = require("path");
    const clientDir = process.argv[1];
    const srcJson = path.join(clientDir, "messages/en.json");
    const destTs  = path.join(clientDir, "messages/en.d.json.ts");
    if (!fs.existsSync(srcJson)) { console.log("  Skipped: en.json not found"); process.exit(0); }
    const messages = JSON.parse(fs.readFileSync(srcJson, "utf8"));
    function toTypeString(obj, indent) {
      const pad = "  ".repeat(indent);
      const entries = Object.entries(obj).map(([k, v]) => {
        const quoted = JSON.stringify(k);
        if (typeof v === "object" && v !== null) {
          return pad + "  " + quoted + ": " + toTypeString(v, indent + 1);
        }
        return pad + "  " + quoted + ": " + JSON.stringify(String(v));
      });
      return "{\n" + entries.join(",\n") + "\n" + pad + "}";
    }
    const header = "// This file is auto-generated by next-intl, do not edit directly.\n// See: https://next-intl.dev/docs/workflows/typescript#messages-arguments\n";
    const body = "declare const messages: " + toTypeString(messages, 0) + ";\nexport default messages;\n";
    fs.writeFileSync(destTs, header + "\n" + body);
    console.log("  Updated " + path.relative(process.cwd(), destTs));
  ' "$CLIENT_DIR"
}

step_check_types() {
  log "Running workspace type checks"
  rm -rf "$CLIENT_DIR/.next/types" "$CLIENT_DIR/.next/dev/types"
  step_generate_i18n_types
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
      --api-port <p>  Custom port for NestJS API (default: 8000)
      --client-port <p> Custom port for Next.js Client (default: 3000)
      --web-port <p>  Custom port for Vite Admin Portal (default: 5173)
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
      --api-port)
        OPT_API_PORT="$2"
        shift 2
        ;;
      --client-port)
        OPT_CLIENT_PORT="$2"
        shift 2
        ;;
      --web-port)
        OPT_WEB_PORT="$2"
        shift 2
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
  printf '  - API Server:   \033[1;32mpnpm --filter api start:dev\033[0m  (http://localhost:%s)\n' "$ACTUAL_API_PORT"
  printf '  - Client App:   \033[1;32mpnpm --filter client dev\033[0m     (http://localhost:%s)\n' "$ACTUAL_CLIENT_PORT"
  printf '  - Admin Portal: \033[1;32mpnpm --filter web-portal dev\033[0m (http://localhost:%s)\n' "$ACTUAL_WEB_PORT"
  printf '  - All at once:  \033[1;32mpnpm dev\033[0m\n\n'
}

main "$@"
