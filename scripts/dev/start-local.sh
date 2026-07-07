#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

APP_PORT="${PORT:-3000}"
APP_URL="http://localhost:${APP_PORT}"
LOG_DIR="$ROOT_DIR/.malviz"
WORKER_LOG="$LOG_DIR/worker.log"
COMPOSE_BASE="docker compose --project-directory $ROOT_DIR -f $ROOT_DIR/infra/docker/compose.yml"

mkdir -p "$LOG_DIR"

bold() {
  printf "\033[1m%s\033[0m\n" "$1"
}

info() {
  printf "\033[36m%s\033[0m %s\n" "=>" "$1"
}

success() {
  printf "\033[32m%s\033[0m %s\n" "OK" "$1"
}

fail() {
  printf "\033[31m%s\033[0m %s\n" "ERROR" "$1" >&2
  exit 1
}

need_command() {
  command -v "$1" >/dev/null 2>&1 || fail "$1 is required but was not found."
}

wait_for() {
  local name="$1"
  local command="$2"
  local attempts="${3:-60}"

  info "Waiting for ${name}..."
  for ((i = 1; i <= attempts; i++)); do
    if bash -lc "$command" >/dev/null 2>&1; then
      success "${name} is ready"
      return 0
    fi
    sleep 2
  done

  fail "${name} did not become ready in time."
}

cleanup() {
  if [[ -n "${WORKER_PID:-}" ]] && kill -0 "$WORKER_PID" >/dev/null 2>&1; then
    info "Stopping Python worker..."
    kill "$WORKER_PID" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM

bold "MalViz local startup"
bold "Database setup is included in this command"
need_command bun
need_command docker
need_command python3

set_env_var() {
  local key="$1"
  local value="$2"
  local tmp_file

  tmp_file="$(mktemp)"
  if grep -q "^${key}=" .env 2>/dev/null; then
    awk -v key="$key" -v value="$value" '
      BEGIN { quote = sprintf("%c", 34) }
      $0 ~ "^" key "=" { $0 = key "=" quote value quote }
      { print }
    ' .env >"$tmp_file"
    mv "$tmp_file" .env
  else
    cat .env >"$tmp_file" 2>/dev/null || true
    printf '%s="%s"\n' "$key" "$value" >>"$tmp_file"
    mv "$tmp_file" .env
  fi
}

if [[ ! -f .env ]]; then
  info "Creating .env from .env.example"
  cp .env.example .env
fi

info "Ensuring local service URLs avoid common port conflicts"
set_env_var "DATABASE_URL" "postgresql://malviz:malviz@localhost:55432/malviz?schema=public"
set_env_var "REDIS_URL" "redis://localhost:56379"
set_env_var "APP_URL" "$APP_URL"
set_env_var "MALVIZ_QUARANTINE_DIR" "${MALVIZ_QUARANTINE_DIR:-/tmp/malviz-quarantine}"
set_env_var "MAX_UPLOAD_SIZE_MB" "${MAX_UPLOAD_SIZE_MB:-25}"

info "Installing Bun dependencies"
bun install

info "Starting Postgres and Redis with Docker Compose"
info "This may pull Docker images on the first run."
# The compose files live under infra/ so the repository root stays approachable on GitHub.
COMPOSE_PARALLEL_LIMIT="${COMPOSE_PARALLEL_LIMIT:-1}" $COMPOSE_BASE up -d --wait --wait-timeout 240

wait_for "Postgres" "$COMPOSE_BASE exec -T postgres pg_isready -U malviz -d malviz"
wait_for "Redis" "$COMPOSE_BASE exec -T redis redis-cli ping | grep -q PONG"

info "Generating Prisma client"
bun run db:generate

info "Applying database migrations"
bunx prisma migrate deploy --config config/prisma.config.ts

info "Seeding demo users"
bun run db:seed

info "Verifying seeded demo login identities"
bunx tsx backend/scripts/db/verify-seed.ts

if [[ ! -x backend/worker/python/.venv/bin/python ]]; then
  info "Creating Python virtual environment"
  python3 -m venv backend/worker/python/.venv
fi

info "Installing Python worker dependencies"
backend/worker/python/.venv/bin/pip install -r backend/worker/python/requirements.txt

info "Starting Python analysis worker"
backend/worker/python/.venv/bin/python backend/worker/python/main.py >"$WORKER_LOG" 2>&1 &
WORKER_PID="$!"
success "Worker started with PID ${WORKER_PID}; logs: ${WORKER_LOG}"

printf "\n"
bold "MalViz links"
printf "  Landing/login:  %s/\n" "$APP_URL"
printf "  Dashboard:      %s/dashboard\n" "$APP_URL"
printf "  Upload:         %s/upload\n" "$APP_URL"
printf "  Scans:          %s/scans\n" "$APP_URL"
printf "  Admin review:   %s/admin\n" "$APP_URL"
printf "\n"
bold "Local services"
printf "  Postgres:       postgresql://malviz:malviz@localhost:55432/malviz\n"
printf "  Redis:          redis://localhost:56379\n"
printf "  Worker logs:    %s\n" "$WORKER_LOG"
printf "\n"
info "Starting Next.js on ${APP_URL}"
bun run dev -- -p "$APP_PORT"
