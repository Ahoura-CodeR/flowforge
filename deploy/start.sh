#!/usr/bin/env bash
# Ephemeral demo boot: fresh postgres -> migrations+seed -> API -> web -> proxy on $PORT.
set -euo pipefail

export PGDATA=/tmp/pg PGPORT=5433
export DB_HOST=127.0.0.1 DB_PORT=5433 DB_USER=flowforge DB_PASSWORD= DB_NAME=flowforge
export JWT_SECRET="${JWT_SECRET:-demo-only-secret-please-do-not-reuse-0123456789}"
export SEED_ADMIN_EMAIL=admin@flowforge.local SEED_ADMIN_PASSWORD=admin12345
export NODE_ENV=production PORT=4000 CORS_ORIGIN="*"
WEB_PORT="${PORT:-7860}"

# Debian keeps the server binaries outside PATH.
PGBIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | head -1)"
if [ -z "$PGBIN" ]; then echo "[boot] postgres server binaries not found"; exit 1; fi
export PATH="$PGBIN:$PATH"

# Postgres will not run as root, so drop to the postgres user when we are root.
if [ "$(id -u)" = "0" ]; then PG="su postgres -c"; mkdir -p "$PGDATA" && chown -R postgres:postgres "$PGDATA"
else PG="bash -c"; mkdir -p "$PGDATA"; fi

if [ ! -f "$PGDATA/PG_VERSION" ]; then
  echo "[boot] initdb ($PGBIN)"
  $PG "$PGBIN/initdb -D '$PGDATA' -U flowforge -A trust -E UTF8"
fi

echo "[boot] postgres"
# Tuned for a 512 MB instance.
$PG "$PGBIN/pg_ctl -D '$PGDATA' -o '-p 5433 -c shared_buffers=48MB -c max_connections=20' -l /tmp/pg.log -w start"
until "$PGBIN/pg_isready" -h 127.0.0.1 -p 5433 -U flowforge >/dev/null 2>&1; do sleep 1; done
$PG "$PGBIN/createdb -h 127.0.0.1 -p 5433 -U flowforge flowforge" 2>/dev/null || true

echo "[boot] api"
cd /app/backend
node dist/main.js > /tmp/api.log 2>&1 &
for _ in $(seq 1 45); do curl -fsS http://127.0.0.1:4000/api/health >/dev/null 2>&1 && break; sleep 2; done

echo "[boot] seed"
node dist/database/seed.js || true
node /demo.js || true

echo "[boot] web"
cd /app/frontend
npx next start -p 3000 > /tmp/web.log 2>&1 &
for _ in $(seq 1 45); do curl -fsS http://127.0.0.1:3000/login >/dev/null 2>&1 && break; sleep 2; done

echo "[boot] ready on port $WEB_PORT"
exec node /proxy.js
