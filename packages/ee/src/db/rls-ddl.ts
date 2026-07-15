/**
 * Tables that hold per-tenant data in the shared schema core owns. Kept as
 * a plain list (not introspected) so adding a new core table is a deliberate
 * one-line decision here, not something that happens silently.
 */
const TENANT_TABLES = [
  "companies",
  "contacts",
  "events",
  "event_contacts",
  "notes",
  "facts",
  "edges",
  "follow_ups",
  "embeddings",
  "card_images",
  "ai_actions",
  "signals",
  "extraction_jobs",
  "calendar_connections",
] as const;

/**
 * Row-Level Security, applied on top of core's own schema — never touches
 * apps/web/src/lib/db/ddl. `user_id` defaults from a session variable so
 * core's INSERT statements (which never mention tenancy) still land with
 * the right owner. The policy also honors `app.bypass_rls` for the admin/
 * webhook connection (see admin-db.ts) — simpler than provisioning a
 * BYPASSRLS Postgres role, which most hosted Postgres free tiers don't grant.
 */
export const RLS_DDL = `
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[${TENANT_TABLES.map((t) => `'${t}'`).join(", ")}]
  LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS user_id text', tbl);
    EXECUTE format(
      'ALTER TABLE %I ALTER COLUMN user_id SET DEFAULT current_setting(''app.current_user_id'', true)',
      tbl
    );
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (user_id)', tbl || '_user_id_idx', tbl);
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl AND policyname = 'tenant_isolation'
    ) THEN
      EXECUTE format(
        'CREATE POLICY tenant_isolation ON %I USING (' ||
        'current_setting(''app.bypass_rls'', true) = ''true'' OR ' ||
        'user_id = current_setting(''app.current_user_id'', true))',
        tbl
      );
    END IF;
  END LOOP;
END $$;

-- settings is keyed (key) globally today; make it per-user (user_id, key).
ALTER TABLE settings ADD COLUMN IF NOT EXISTS user_id text;
ALTER TABLE settings ALTER COLUMN user_id SET DEFAULT current_setting('app.current_user_id', true);
CREATE INDEX IF NOT EXISTS settings_user_id_idx ON settings (user_id);
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.key_column_usage
    WHERE table_name = 'settings' AND constraint_name = 'settings_pkey' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_pkey;
    ALTER TABLE settings ADD PRIMARY KEY (user_id, key);
  END IF;
END $$;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings FORCE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'settings' AND policyname = 'tenant_isolation') THEN
    CREATE POLICY tenant_isolation ON settings USING (
      current_setting('app.bypass_rls', true) = 'true' OR
      user_id = current_setting('app.current_user_id', true)
    );
  END IF;
END $$;
`;
