/**
 * Unified confirmations feed DDL. Same idempotent self-heal style as kg.ts;
 * applied right after KG_DDL (see ./index.ts) because it FKs notes/contacts.
 * edge_suggestions stays intact — the two feeds COEXIST while writers/UI
 * migrate incrementally; this only backfills, never drops.
 */
export const CONFIRMATIONS_DDL = `
CREATE TABLE IF NOT EXISTS confirmations (
  id text PRIMARY KEY,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  payload jsonb NOT NULL DEFAULT '{}',
  source_note_id text REFERENCES notes(id),
  contact_id text REFERENCES contacts(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS confirmations_pending_idx ON confirmations (created_at DESC) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS confirmations_status_idx ON confirmations (status);
CREATE INDEX IF NOT EXISTS confirmations_sourceNoteId_idx ON confirmations (source_note_id);
CREATE INDEX IF NOT EXISTS confirmations_contactId_idx ON confirmations (contact_id);

-- Backfill: mirror still-pending edge_suggestions into the unified feed as
-- entity_link rows. id is prefixed 'es_' and guarded by NOT EXISTS so a
-- re-run of this idempotent DDL never inserts a second copy. contact_id is set
-- to the source contact so EE can derive user_id from it (see rls-ddl.ts),
-- exactly like the positions backfill.
--
-- Hosted installs FORCE RLS on both tables; a bare INSERT ... SELECT from the
-- boot connection would have its SELECT filtered to zero rows, so bypass RLS
-- transaction-locally (is_local = true) — the same trick ddl/kg.ts uses.
-- Harmless where RLS was never enabled: the setting is simply never read.
DO $$
BEGIN
  PERFORM set_config('app.bypass_rls', 'true', true);
  INSERT INTO confirmations (id, type, status, payload, source_note_id, contact_id, created_at, resolved_at)
  SELECT
    'es_' || es.id,
    'entity_link',
    es.status,
    jsonb_build_object(
      'type', 'entity_link',
      'question', 'Which "' || es.object_name || '" does this refer to?',
      'options', '[]'::jsonb,
      'apply', jsonb_build_object(
        'kind', 'insert_edge',
        'srcContactId', es.src_contact_id,
        'predicate', es.predicate,
        'objectName', es.object_name,
        'objectType', es.object_type,
        'entityTypeHint', es.entity_type_hint
      )
    ),
    es.source_note_id,
    es.src_contact_id,
    es.created_at,
    es.resolved_at
  FROM edge_suggestions es
  WHERE es.status = 'pending'
    AND NOT EXISTS (SELECT 1 FROM confirmations c WHERE c.id = 'es_' || es.id);
  PERFORM set_config('app.bypass_rls', '', true);
END $$;
`;
