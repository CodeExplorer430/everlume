ALTER TABLE redirects
  ADD COLUMN IF NOT EXISTS print_status text NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS last_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'redirects_print_status_check'
  ) THEN
    ALTER TABLE redirects
      ADD CONSTRAINT redirects_print_status_check
      CHECK (print_status IN ('unverified', 'verified'));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_redirects_shortcode_active
  ON redirects (shortcode, is_active);
