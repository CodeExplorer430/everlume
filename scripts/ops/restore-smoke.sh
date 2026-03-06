#!/usr/bin/env bash

set -euo pipefail

if [[ -z "${BACKUP_FILE:-}" ]]; then
  echo "BACKUP_FILE is required."
  exit 1
fi

if [[ -z "${RESTORE_DB_URL:-}" ]]; then
  echo "RESTORE_DB_URL is required."
  exit 1
fi

report_file="${1:-/tmp/restore-smoke-report.txt}"

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "Backup file not found: $BACKUP_FILE"
  exit 1
fi

if [[ "$BACKUP_FILE" == *.gz ]]; then
  gunzip -c "$BACKUP_FILE" | psql "$RESTORE_DB_URL" >/dev/null
else
  psql "$RESTORE_DB_URL" < "$BACKUP_FILE" >/dev/null
fi

required_tables=(
  profiles
  pages
  photos
  guestbook
  redirects
)

{
  echo "restore_smoke_report"
  echo "timestamp_utc=$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo "backup_file=${BACKUP_FILE}"
} > "$report_file"

for table in "${required_tables[@]}"; do
  exists="$(psql "$RESTORE_DB_URL" -Atc "SELECT to_regclass('public.${table}') IS NOT NULL;")"
  if [[ "$exists" != "t" ]]; then
    echo "missing required table: ${table}" | tee -a "$report_file"
    exit 1
  fi
  echo "table_ok=${table}" >> "$report_file"
done

echo "restore smoke checks passed" >> "$report_file"
echo "report: ${report_file}"
