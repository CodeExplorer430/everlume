# Backup and Recovery Runbook

## Goal
Automate durable offsite database backups and verify restore readiness regularly.

## Workflows
- `.github/workflows/backup-db.yml`
  - Daily backup: `17 2 * * *` (UTC)
  - Weekly backup: `5 3 * * 0` (UTC)
  - Supports manual dispatch.
- `.github/workflows/backup-restore-drill.yml`
  - Quarterly restore drill: `20 4 1 */3 *` (UTC)
  - Supports manual dispatch.

## Required GitHub Secrets
- `SUPABASE_DB_URL`: Postgres connection string for backups (least privilege recommended).
- `R2_ENDPOINT`: Cloudflare R2 S3 endpoint.
- `R2_BUCKET`: Target backup bucket.
- `R2_ACCESS_KEY_ID`: R2 API token access key.
- `R2_SECRET_ACCESS_KEY`: R2 API token secret key.

## Optional GitHub Variables
- `BACKUP_PREFIX` (default: `everlume/db-backups`)
- `DAILY_RETENTION_DAYS` (default: `30`)
- `WEEKLY_RETENTION_WEEKS` (default: `12`)

## Object Layout
- `${BACKUP_PREFIX}/daily/everlume_daily_<timestamp>.sql.gz`
- `${BACKUP_PREFIX}/weekly/everlume_weekly_<timestamp>.sql.gz`
- Matching `.sha256` and `.json` manifest files per backup.

## Manual Backup Run
1. Open Actions -> `Backup Database`.
2. Click **Run workflow** and choose `daily` or `weekly`.
3. Confirm uploaded object + checksum + manifest in R2.

## Manual Restore Drill
1. Open Actions -> `Backup Restore Drill`.
2. Click **Run workflow**.
3. Confirm artifact `restore-drill-report-*` is generated and status is success.

## Recovery Procedure (Incident)
1. Pick a backup object key from R2.
2. Download backup locally:
```bash
aws --endpoint-url "$R2_ENDPOINT" s3 cp "s3://$R2_BUCKET/<key>.sql.gz" /tmp/restore.sql.gz
```
3. Restore to target DB:
```bash
gunzip -c /tmp/restore.sql.gz | psql "$TARGET_DB_URL"
```
4. Validate core tables:
```bash
psql "$TARGET_DB_URL" -Atc "select to_regclass('public.pages') is not null;"
psql "$TARGET_DB_URL" -Atc "select to_regclass('public.photos') is not null;"
psql "$TARGET_DB_URL" -Atc "select to_regclass('public.guestbook') is not null;"
```

## Operational Cadence
- Review backup workflow success weekly.
- Run restore drill at least quarterly.
- Rotate R2 credentials when team/security policy requires.
