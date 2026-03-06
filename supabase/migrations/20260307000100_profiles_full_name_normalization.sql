ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS full_name text;

UPDATE profiles
SET full_name = COALESCE(full_name, name)
WHERE full_name IS NULL
  AND name IS NOT NULL;
