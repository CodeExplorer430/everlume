ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read audit logs." ON admin_audit_logs;
CREATE POLICY "Admins can read audit logs." ON admin_audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
        AND profiles.is_active = true
    )
  );

DROP POLICY IF EXISTS "Active admins and editors can append audit logs." ON admin_audit_logs;
CREATE POLICY "Active admins and editors can append audit logs." ON admin_audit_logs
  FOR INSERT WITH CHECK (
    actor_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'editor')
        AND profiles.is_active = true
    )
  );

DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON profiles;

DROP POLICY IF EXISTS "Users can view own profile." ON profiles;
CREATE POLICY "Users can view own profile." ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Active admins can view all profiles." ON profiles;
CREATE POLICY "Active admins can view all profiles." ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM profiles p2
      WHERE p2.id = auth.uid()
        AND p2.role = 'admin'
        AND p2.is_active = true
    )
  );

DROP POLICY IF EXISTS "Users can update own profile." ON profiles;
CREATE POLICY "Users can update own profile." ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Active admins can update any profile." ON profiles;
CREATE POLICY "Active admins can update any profile." ON profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM profiles p2
      WHERE p2.id = auth.uid()
        AND p2.role = 'admin'
        AND p2.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles p2
      WHERE p2.id = auth.uid()
        AND p2.role = 'admin'
        AND p2.is_active = true
    )
  );
