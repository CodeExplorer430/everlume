ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS memorial_slideshow_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS memorial_slideshow_interval_ms integer NOT NULL DEFAULT 4500,
  ADD COLUMN IF NOT EXISTS memorial_video_layout text NOT NULL DEFAULT 'grid';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'site_settings_memorial_slideshow_interval_ms_check'
  ) THEN
    ALTER TABLE site_settings
      ADD CONSTRAINT site_settings_memorial_slideshow_interval_ms_check
      CHECK (memorial_slideshow_interval_ms BETWEEN 2000 AND 12000);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'site_settings_memorial_video_layout_check'
  ) THEN
    ALTER TABLE site_settings
      ADD CONSTRAINT site_settings_memorial_video_layout_check
      CHECK (memorial_video_layout IN ('grid', 'featured'));
  END IF;
END
$$;
