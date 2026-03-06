CREATE TABLE IF NOT EXISTS media_optimization_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id uuid REFERENCES photos(id) ON DELETE CASCADE,
  status text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status IN ('success', 'partial', 'error'))
);

CREATE INDEX IF NOT EXISTS idx_media_optimization_runs_photo_id_created_at
  ON media_optimization_runs (photo_id, created_at DESC);

ALTER TABLE media_optimization_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can view optimization runs for their pages." ON media_optimization_runs;
CREATE POLICY "Owners can view optimization runs for their pages." ON media_optimization_runs
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM photos
      JOIN pages ON pages.id = photos.page_id
      WHERE photos.id = media_optimization_runs.photo_id
        AND pages.owner_id = auth.uid()
    )
  );
