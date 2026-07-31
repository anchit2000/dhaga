/**
 * Tables that hold per-tenant data in the shared schema core owns. Kept as
 * a plain list (not introspected) so adding a new core table is a deliberate
 * one-line decision here, not something that happens silently.
 */
const TENANT_TABLES = [
  "companies",
  "company_aliases",
  "contacts",
  "events",
  "event_contacts",
  "notes",
  "facts",
  "edges",
  "edge_suggestions",
  "confirmations",
  "follow_ups",
  "embeddings",
  "card_images",
  "ai_actions",
  "signals",
  "extraction_jobs",
  // Persisted job notifications. Per-tenant: titles/bodies embed the user's own
  // contact names, so an unscoped read would leak one user's graph to another.
  "notifications",
  "calendar_connections",
  // Which follow-up Dhaga wrote as which event on which connected calendar.
  // Per-tenant: it joins a tenant's follow_ups to a tenant's calendar_connections,
  // and an unscoped read would let one user delete another's calendar event.
  "calendar_event_links",
  "positions",
  "node_types",
  "entities",
  "relationship_types",
  "graph_layouts",
  "voice_vocab",
  // Address-book sync links, and the tombstones that outlive a deleted contact.
  // Per-tenant: external ids collide freely across users (Android hands out
  // small integers from its own sequence), so unscoped reads cross-link tenants.
  "contact_links",
  "contact_sync_tombstones",
  // OAuth grants to a user's Google/Outlook address book. Scoped for the
  // strongest reason on this list: the row holds access and refresh tokens, so
  // an unscoped read is an account-takeover risk, not just a data leak.
  "contact_connections",
  // Forwarded messaging content (contact cards / notes awaiting processing) —
  // per-tenant PII, RLS-scoped. The routing tables (messaging_identities,
  // messaging_link_tokens) are deliberately NOT here: the webhook reads them
  // cross-tenant to resolve which user an inbound message belongs to.
  "messaging_sessions",
  "messaging_session_items",
  // The open "which person did you mean?" question for one chat. Holds the
  // pending note body — per-tenant PII, same reasoning as the session tables.
  "messaging_pending_questions",
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
