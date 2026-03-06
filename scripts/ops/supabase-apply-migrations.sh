#!/usr/bin/env bash
set -euo pipefail

project_ref="${1:-}"

if [[ -z "${project_ref}" ]]; then
  echo "Usage: ./scripts/ops/supabase-apply-migrations.sh <project-ref>"
  exit 1
fi

if ! command -v supabase >/dev/null 2>&1; then
  echo "Supabase CLI is required: https://supabase.com/docs/guides/local-development/cli/getting-started"
  exit 1
fi

echo "Linking project: ${project_ref}"
supabase link --project-ref "${project_ref}"

echo "Pushing migrations to hosted project..."
supabase db push

echo "Done. Verify in Supabase dashboard > Database > Migrations."
