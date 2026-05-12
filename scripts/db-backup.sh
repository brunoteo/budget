#!/usr/bin/env bash
# Dump linked Supabase project (roles + schema + data) into backups/.
# Output: backups/budget-<UTC-timestamp>-{roles,schema,data}.sql
set -euo pipefail

TS=$(date -u +%Y%m%d-%H%M%S)
DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${DIR}/backups"
PREFIX="${OUT}/budget-${TS}"

mkdir -p "${OUT}"

echo "Dumping linked Supabase project to ${PREFIX}-{roles,schema,data}.sql"

pnpm supabase db dump --linked --role-only -f "${PREFIX}-roles.sql"
pnpm supabase db dump --linked              -f "${PREFIX}-schema.sql"
pnpm supabase db dump --linked --data-only --use-copy -f "${PREFIX}-data.sql"

echo "Done."
