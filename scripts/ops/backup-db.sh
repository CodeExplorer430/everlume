#!/usr/bin/env bash

set -euo pipefail

if [[ -z "${DB_URL:-}" ]]; then
  echo "DB_URL is required."
  exit 1
fi

backup_dir="${1:-/tmp/everlume-backups}"
backup_kind="${BACKUP_KIND:-manual}"
backup_prefix="${BACKUP_PREFIX:-everlume/db-backups}"
timestamp="$(date -u +"%Y%m%dT%H%M%SZ")"
base_name="everlume_${backup_kind}_${timestamp}"

mkdir -p "$backup_dir"

sql_file="${backup_dir}/${base_name}.sql"
backup_gz="${backup_dir}/${base_name}.sql.gz"
checksum_file="${backup_dir}/${base_name}.sha256"
manifest_file="${backup_dir}/${base_name}.json"
object_key="${backup_prefix}/${backup_kind}/${base_name}.sql.gz"
checksum_key="${backup_prefix}/${backup_kind}/${base_name}.sha256"
manifest_key="${backup_prefix}/${backup_kind}/${base_name}.json"

pg_dump "$DB_URL" --format=plain --no-owner --no-privileges --clean --if-exists --file "$sql_file"
gzip -c "$sql_file" > "$backup_gz"
sha256sum "$backup_gz" > "$checksum_file"

byte_size="$(wc -c < "$backup_gz" | tr -d ' ')"
checksum_value="$(cut -d ' ' -f1 "$checksum_file")"

cat > "$manifest_file" <<EOF
{
  "name": "${base_name}",
  "kind": "${backup_kind}",
  "timestamp_utc": "${timestamp}",
  "object_key": "${object_key}",
  "bytes": ${byte_size},
  "sha256": "${checksum_value}"
}
EOF

rm -f "$sql_file"

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  {
    echo "backup_gz=${backup_gz}"
    echo "checksum_file=${checksum_file}"
    echo "manifest_file=${manifest_file}"
    echo "object_key=${object_key}"
    echo "checksum_key=${checksum_key}"
    echo "manifest_key=${manifest_key}"
    echo "backup_kind=${backup_kind}"
    echo "timestamp=${timestamp}"
  } >> "$GITHUB_OUTPUT"
fi

echo "Created backup: ${backup_gz}"
echo "Checksum: ${checksum_file}"
echo "Manifest: ${manifest_file}"
