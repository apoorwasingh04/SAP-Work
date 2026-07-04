#!/bin/sh
# Release step (schema + seed deploy) then run step - kept separate per 12-factor V.
# cds reads Postgres credentials from CDS_REQUIRES_DB_CREDENTIALS_* env vars.
set -e

echo "[entrypoint] ${SERVICE_NAME:-vendor-service}: deploying schema + seed to Postgres..."
n=0
until npx cds deploy; do
  n=$((n + 1))
  if [ "$n" -ge 10 ]; then echo "[entrypoint] deploy failed after $n attempts"; exit 1; fi
  echo "[entrypoint] database not ready, retry $n/10..."; sleep 3
done

echo "[entrypoint] starting server on port ${PORT:-4004}..."
exec npx cds-serve
