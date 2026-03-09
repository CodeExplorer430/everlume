ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS protected_media_consent_title text NOT NULL DEFAULT 'Media Viewing Notice',
  ADD COLUMN IF NOT EXISTS protected_media_consent_body text NOT NULL DEFAULT 'The family has protected this memorial''s photos and videos for respectful viewing. Continuing confirms that access to protected media is recorded for family oversight.',
  ADD COLUMN IF NOT EXISTS protected_media_consent_version integer NOT NULL DEFAULT 1;

ALTER TABLE public.pages
  ADD COLUMN IF NOT EXISTS media_consent_revoked_at timestamptz;

ALTER TABLE public.media_access_consents
  ADD COLUMN IF NOT EXISTS consent_version integer NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS pages_media_consent_revoked_at_idx
  ON public.pages (media_consent_revoked_at);
