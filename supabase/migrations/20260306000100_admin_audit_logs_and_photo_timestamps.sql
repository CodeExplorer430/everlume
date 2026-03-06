CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id uuid NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS admin_audit_logs_created_at_idx ON admin_audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_logs_actor_id_idx ON admin_audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS admin_audit_logs_entity_idx ON admin_audit_logs (entity, entity_id);

ALTER TABLE photos
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT timezone('utc', now());
