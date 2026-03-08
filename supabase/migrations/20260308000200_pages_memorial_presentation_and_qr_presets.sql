ALTER TABLE pages
  ADD COLUMN IF NOT EXISTS memorial_theme text NOT NULL DEFAULT 'classic',
  ADD COLUMN IF NOT EXISTS memorial_slideshow_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS memorial_slideshow_interval_ms integer NOT NULL DEFAULT 4500,
  ADD COLUMN IF NOT EXISTS memorial_video_layout text NOT NULL DEFAULT 'grid',
  ADD COLUMN IF NOT EXISTS qr_template text NOT NULL DEFAULT 'classic',
  ADD COLUMN IF NOT EXISTS qr_caption text NOT NULL DEFAULT 'Scan me!';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'pages_memorial_theme_check'
  ) THEN
    ALTER TABLE pages
      ADD CONSTRAINT pages_memorial_theme_check
      CHECK (memorial_theme IN ('classic', 'serene', 'editorial'));
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'pages_memorial_slideshow_interval_ms_check'
  ) THEN
    ALTER TABLE pages
      ADD CONSTRAINT pages_memorial_slideshow_interval_ms_check
      CHECK (memorial_slideshow_interval_ms BETWEEN 2000 AND 12000);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'pages_memorial_video_layout_check'
  ) THEN
    ALTER TABLE pages
      ADD CONSTRAINT pages_memorial_video_layout_check
      CHECK (memorial_video_layout IN ('grid', 'featured'));
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'pages_qr_template_check'
  ) THEN
    ALTER TABLE pages
      ADD CONSTRAINT pages_qr_template_check
      CHECK (qr_template IN ('classic', 'minimal', 'warm'));
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'pages_qr_caption_length_check'
  ) THEN
    ALTER TABLE pages
      ADD CONSTRAINT pages_qr_caption_length_check
      CHECK (char_length(qr_caption) BETWEEN 2 AND 40);
  END IF;
END
$$;
