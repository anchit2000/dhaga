/**
 * Tables that hold per-tenant data in the shared schema core owns. Kept as
 * a plain list (not introspected) so adding a new core table is a deliberate
 * one-line decision here, not something that happens silently.
 */
export const TENANT_TABLES = [
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
  // The user's current objective and the contacts matched to it. Per-tenant for
  // two reasons: goal_members is contact-derived PII, and goals.objective is the
  // user's private intent in their own words ("find a co-founder", "line up a
  // new job") — the single most sensitive free-text field outside notes.
  "goals",
  "goal_members",
  // In-app feedback the user typed. Per-tenant because `message` is user-authored
  // free text — the user is writing to the maintainer, not publishing, and one
  // tenant must never read another's report. The RLS `user_id` this adds is also
  // the only way to reply, and it is what the admin screen joins on (admin reads
  // go through openAdminConnection's explicit bypass, never a missing policy).
  "feedback",
] as const;

/**
 * Row-Level Security, applied on top of core's own schema — never touches
 * apps/web/src/lib/db/ddl. `user_id` defaults from a session variable so
 * core's INSERT statements (which never mention tenancy) still land with
 * the right owner. The policy also honors `app.bypass_rls` for the admin/
 * webhook connection (see admin-db.ts) — simpler than provisioning a
 * BYPASSRLS Postgres role, which most hosted Postgres free tiers don't grant.
 */
export const TENANT_TABLE_RLS_DDL = `
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
`;
