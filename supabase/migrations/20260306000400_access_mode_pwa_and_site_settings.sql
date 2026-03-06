ALTER TABLE pages
  ADD COLUMN IF NOT EXISTS access_mode text NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS password_hash text,
  ADD COLUMN IF NOT EXISTS password_updated_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'pages_access_mode_check'
  ) THEN
    ALTER TABLE pages
      ADD CONSTRAINT pages_access_mode_check
      CHECK (access_mode IN ('public', 'private', 'password'));
  END IF;
END
$$;

UPDATE pages
SET access_mode = CASE
  WHEN privacy = 'public' THEN 'public'
  ELSE 'private'
END
WHERE access_mode IS NULL OR access_mode NOT IN ('public', 'private', 'password');

CREATE TABLE IF NOT EXISTS site_settings (
  id smallint PRIMARY KEY DEFAULT 1,
  home_directory_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (id = 1)
);

INSERT INTO site_settings (id, home_directory_enabled)
VALUES (1, false)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Site settings are publicly readable." ON site_settings;
CREATE POLICY "Site settings are publicly readable." ON site_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can update site settings." ON site_settings;
CREATE POLICY "Admins can update site settings." ON site_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
        AND profiles.is_active = true
    )
  );
