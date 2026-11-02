#!/usr/bin/env bash
# Ephemeral demo boot: fresh postgres -> migrations+seed -> API -> web -> proxy on $PORT.
set -euo pipefail

# Any failure prints the logs it produced, so the deploy log explains itself.
trap 'echo "[boot] FAILED at line $LINENO"; tail -n 40 /tmp/pg.log /tmp/api.log /tmp/web.log 2>/dev/null || true' ERR

# Turns a silent hang into a failure that explains itself in the deploy log.
wait_for() {
  local url=$1 label=$2 log=$3
  for _ in $(seq 1 60); do curl -fsS "$url" >/dev/null 2>&1 && return 0; sleep 2; done
  echo "[boot] $label never became ready at $url"
  tail -n 60 "$log" 2>/dev/null || true
  exit 1
}

export PGDATA=/tmp/pg PGPORT=5433
export DB_HOST=127.0.0.1 DB_PORT=5433 DB_USER=flowforge DB_PASSWORD= DB_NAME=flowforge
export JWT_SECRET="${JWT_SECRET:-demo-only-secret-please-do-not-reuse-0123456789}"
export SEED_ADMIN_EMAIL=admin@flowforge.local SEED_ADMIN_PASSWORD=admin12345
PUBLIC_PORT="${PORT:-7860}"
rm -f /tmp/ready
# Open the public port immediately; the proxy serves a "starting" page until /tmp/ready exists.
PORT="$PUBLIC_PORT" node /proxy.js &
export NODE_ENV=production PORT=4000 CORS_ORIGIN="*"
# 512 MB for everything: keep each node process small instead of letting the OOM killer choose.
export NODE_OPTIONS="--max-old-space-size=180"

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
$PG "$PGBIN/pg_ctl -D '$PGDATA' -o '-p 5433 -k /tmp -c shared_buffers=32MB -c max_connections=10 -c work_mem=2MB -c maintenance_work_mem=16MB -c fsync=off' -l /tmp/pg.log -w start"
until "$PGBIN/pg_isready" -h 127.0.0.1 -p 5433 -U flowforge >/dev/null 2>&1; do sleep 1; done
$PG "$PGBIN/createdb -h 127.0.0.1 -p 5433 -U flowforge flowforge" 2>/dev/null || true

echo "[boot] api"
cd /app/backend
node dist/main.js > /tmp/api.log 2>&1 &
wait_for http://127.0.0.1:4000/api/health "api" /tmp/api.log

echo "[boot] seed"
node dist/database/seed.js || true
node /demo.js || true

echo "[boot] web"
cd /app/frontend
npx next start -p 3000 > /tmp/web.log 2>&1 &
wait_for http://127.0.0.1:3000/login "web" /tmp/web.log

touch /tmp/ready
echo "[boot] ready on port $PUBLIC_PORT"
( free -m 2>/dev/null || true; ps -o pid,rss,comm -C node 2>/dev/null || true ) | sed 's/^/[mem] /'
wait
