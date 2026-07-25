/**
 * Knowledge-graph rewrite DDL: user-defined node types, custom entities, and
 * user-defined relationship predicates. Same idempotent self-heal style as
 * core.ts (CREATE ... IF NOT EXISTS + repeatable ALTER/UPDATE); applied right
 * after CORE_DDL (see ./index.ts) because it alters notes/edges.
 */
export const KG_DDL = `
CREATE TABLE IF NOT EXISTS node_types (
  id text PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL,
  color text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS entities (
  id text PRIMARY KEY,
  type_id text NOT NULL REFERENCES node_types(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS entities_typeId_idx ON entities (type_id);

CREATE TABLE IF NOT EXISTS relationship_types (
  id text PRIMARY KEY,
  slug text NOT NULL,
  forward_label text NOT NULL,
  inverse_label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- A note now belongs to exactly one of contact/entity (app-enforced), so
-- contact_id loses its NOT NULL (DROP NOT NULL is a no-op when already done).
ALTER TABLE notes ADD COLUMN IF NOT EXISTS entity_id text REFERENCES entities(id);
ALTER TABLE notes ALTER COLUMN contact_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS notes_entityId_idx ON notes (entity_id) WHERE deleted_at IS NULL;

-- Edge endpoint types are 'contact' | 'company' | 'event' | 'entity'; the
-- legacy 'person' value is normalized so every reader can filter on 'contact'.
-- Hosted installs force RLS on edges (packages/ee), which would silently
-- no-op a bare UPDATE run from the boot connection — the tenant policy
-- honors app.bypass_rls, so set it transaction-locally (is_local = true;
-- multi-statement DDL runs as one implicit transaction). Harmless where RLS
-- was never enabled: the setting is simply never read.
DO $$
BEGIN
  PERFORM set_config('app.bypass_rls', 'true', true);
  UPDATE edges SET dst_type = 'contact' WHERE dst_type = 'person';
  UPDATE edges SET src_type = 'contact' WHERE src_type = 'person';
  PERFORM set_config('app.bypass_rls', '', true);
END $$;

-- Bare relative/role references ("his son", "her manager") captured before the
-- object_is_named discriminator existed were minted as "mentioned" stubs named
-- literally after the phrase. Relabel each UNAMBIGUOUS one off its owner
-- ("his son" ⇒ "Prashant's son"), matching the new resolveObject behavior,
-- WITHOUT dropping the stub or its edge — the placeholder stays renameable. To
-- avoid corrupting anything with real history, only a stub that is clearly a
-- bare reference AND has a single, unambiguous real owner qualifies: it must have
-- no notes, no facts, exactly one inbound live edge, and never be an edge src —
-- and that one inbound edge's src must be a non-mentioned contact. Same RLS-bypass
-- guard as the block above (a bare UPDATE would no-op under EE's forced RLS).
-- Idempotent: a renamed stub no longer starts with a possessive, so a re-run
-- matches nothing. \\s / \\w survive the JS template as literal \\s / \\w for Postgres.
DO $$
BEGIN
  PERFORM set_config('app.bypass_rls', 'true', true);
  UPDATE contacts AS stub
  SET name = split_part(owner.name, ' ', 1) || '''s ' ||
             regexp_replace(stub.name, '^(his|her|their|hers)\\s+', '', 'i')
  FROM edges AS e
  JOIN contacts AS owner
    ON owner.id = e.src_id
   AND owner.source <> 'mentioned'
  WHERE stub.source = 'mentioned'
    AND stub.name ~* '^(his|her|their|hers)\\s+\\w'
    AND e.dst_type = 'contact'
    AND e.dst_id = stub.id
    AND e.src_type = 'contact'
    AND e.deleted_at IS NULL
    AND (SELECT count(*) FROM edges d
           WHERE d.dst_type = 'contact' AND d.dst_id = stub.id AND d.deleted_at IS NULL) = 1
    AND NOT EXISTS (SELECT 1 FROM edges s
           WHERE s.src_type = 'contact' AND s.src_id = stub.id AND s.deleted_at IS NULL)
    AND NOT EXISTS (SELECT 1 FROM notes n WHERE n.contact_id = stub.id)
    AND NOT EXISTS (SELECT 1 FROM facts f WHERE f.contact_id = stub.id);
  PERFORM set_config('app.bypass_rls', '', true);
END $$;

-- Extraction can now propose custom-entity relationships (object_type
-- 'entity'); the suggestion carries the extractor's node-type guess so the
-- inbox's "create new entity" path can preselect a type.
ALTER TABLE edge_suggestions ADD COLUMN IF NOT EXISTS entity_type_hint text;

-- Server-persisted graph layout: the settled FA2 positions for one graph
-- state (graph_hash), so a returning user on ANY device skips the layout
-- pass. One row per user for now ('default' key; key exists so named
-- layouts can ship without a migration). positions is {nodeId: [x, y]}.
CREATE TABLE IF NOT EXISTS graph_layouts (
  id text PRIMARY KEY,
  key text NOT NULL DEFAULT 'default',
  graph_hash text NOT NULL,
  positions jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Upserts target this constraint BY NAME (repo/graph-layouts.ts), because
-- its columns differ by mode: UNIQUE (key) when self-hosted (single user),
-- upgraded to UNIQUE (user_id, key) under EE's per-tenant RLS — the same
-- constraint-name pattern settings_pkey uses (packages/ee/src/db/rls-ddl.ts).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'graph_layouts'::regclass AND conname = 'graph_layouts_scope_key'
  ) THEN
    ALTER TABLE graph_layouts ADD CONSTRAINT graph_layouts_scope_key UNIQUE (key);
  END IF;
END $$;
`;
