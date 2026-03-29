#!/usr/bin/env bash
set -euo pipefail

export APP_DATABASE_URL="${APP_DATABASE_URL:-sqlite+aiosqlite:////app/data/db_hub.sqlite3}"
mkdir -p /app/data

python3 -m backend.docker_init

python3 -m uvicorn backend.main:app --host 0.0.0.0 --port "${PORT:-8088}" &
BACKEND_PID=$!

cd /app/frontend
npm run dev -- --host 0.0.0.0 --port "${FRONTEND_PORT:-8099}" &
FRONTEND_PID=$!

cleanup() {
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

wait -n "$BACKEND_PID" "$FRONTEND_PID"
