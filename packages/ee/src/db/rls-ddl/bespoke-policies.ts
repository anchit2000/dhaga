/**
 * One-off RLS/tenancy DDL blocks that don't fit the generic per-table loop in
 * tenant-tables.ts — either because they backfill `user_id` on rows that
 * predate that loop, or because the table needs a policy shape the generic
 * `tenant_isolation` policy can't express. Runs after tenant-tables.ts's
 * `TENANT_TABLE_RLS_DDL` (see rls-ddl/index.ts), since several of these blocks
 * depend on the `user_id` column it adds.
 */
export const BESPOKE_POLICIES_DDL = `
-- ai_actions specifically also gets a composite (user_id, created_at, id) index:
-- the generic per-table index just above is (user_id) alone, which is enough for
-- the tenant filter but not for the credits history page's keyset pagination
-- (WHERE user_id = ... AND (created_at, id) < cursor ORDER BY created_at DESC, id
-- DESC) — that still needs created_at/id in the index to avoid an in-memory sort
-- of every one of a tenant's rows on each page.
CREATE INDEX IF NOT EXISTS ai_actions_user_created_idx
  ON ai_actions (user_id, created_at DESC, id DESC);

-- positions joined the tenant list after rows already existed (it shipped
-- with the rich-contact work without RLS registration). The generic loop
-- above leaves those pre-existing rows with user_id NULL — invisible to
-- every tenant — so derive the owner from the contact each position belongs
-- to. bypass_rls is transaction-local, same pattern as ddl/kg.ts: without it
-- this UPDATE would itself be filtered to zero rows by the policy just added.
DO $$
BEGIN
  PERFORM set_config('app.bypass_rls', 'true', true);
  UPDATE positions p SET user_id = c.user_id
  FROM contacts c
  WHERE p.contact_id = c.id AND p.user_id IS NULL AND c.user_id IS NOT NULL;
END $$;

-- Same story for confirmations: core's ddl/confirmations.ts backfills pending
-- edge_suggestions into it BEFORE this loop adds user_id, so those migrated
-- rows arrive user_id NULL — invisible to every tenant. Derive the owner from
-- the contact each row points at (contact_id = the source contact), exactly
-- like positions above. bypass_rls is transaction-local; without it this
-- UPDATE would itself be filtered to zero rows by the policy just added.
DO $$
BEGIN
  PERFORM set_config('app.bypass_rls', 'true', true);
  UPDATE confirmations cf SET user_id = c.user_id
  FROM contacts c
  WHERE cf.contact_id = c.id AND cf.user_id IS NULL AND c.user_id IS NOT NULL;
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

-- ai_credit_grants gets a BESPOKE policy rather than joining TENANT_TABLES: a
-- grant row with user_id NULL means "every user on this instance", and the
-- generic tenant_isolation policy (user_id = <tenant>) hides NULL from
-- everybody — an instance-wide grant would silently apply to nobody. Adding
-- "user_id IS NULL" is what makes it apply to everybody instead. Note also that
-- NO user_id DEFAULT is set here (unlike the generic loop): every write goes
-- through the admin bypass connection with an explicit user_id, or an explicit
-- NULL for an instance-wide grant. Core creates the table (apps/web/src/lib/db/
-- ddl/ai-budget.ts); this only adds tenancy. ai_budget_settings is absent on
-- purpose — it is operator configuration, identical for every tenant.
ALTER TABLE ai_credit_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_credit_grants FORCE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_credit_grants' AND policyname = 'tenant_isolation') THEN
    CREATE POLICY tenant_isolation ON ai_credit_grants USING (
      current_setting('app.bypass_rls', true) = 'true' OR
      user_id IS NULL OR
      user_id = current_setting('app.current_user_id', true)
    );
  END IF;
END $$;

-- graph_layouts is one row per (user, key) under multi-tenancy. Core ships
-- UNIQUE (key) (fine single-user); swap it for (user_id, key) KEEPING THE
-- SAME NAME — repo upserts target the constraint by name, exactly like the
-- settings_pkey pattern above. Runs after the generic loop added user_id.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.key_column_usage
    WHERE table_name = 'graph_layouts' AND constraint_name = 'graph_layouts_scope_key' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE graph_layouts DROP CONSTRAINT IF EXISTS graph_layouts_scope_key;
    ALTER TABLE graph_layouts ADD CONSTRAINT graph_layouts_scope_key UNIQUE (user_id, key);
  END IF;
END $$;
`;
