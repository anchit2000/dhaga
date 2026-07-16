/**
 * Core graph entities, in dependency order: companies/contacts and the tables
 * that FK into them (events, notes, facts, edges, edge_suggestions). Applied
 * before extend.ts / meta.ts, which reference these. Idempotent DDL.
 */
export const GRAPH_DDL = `
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Preserve existing installs while adopting the clearer networking-domain name.
DO $$
BEGIN
  IF to_regclass('public.events') IS NULL AND to_regclass('public.sessions') IS NOT NULL THEN
    ALTER TABLE sessions RENAME TO events;
  END IF;
  IF to_regclass('public.event_contacts') IS NULL AND to_regclass('public.session_contacts') IS NOT NULL THEN
    ALTER TABLE session_contacts RENAME COLUMN session_id TO event_id;
    ALTER TABLE session_contacts RENAME TO event_contacts;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS companies (
  id text PRIMARY KEY,
  name text NOT NULL,
  domain text,
  sector text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contacts (
  id text PRIMARY KEY,
  name text NOT NULL,
  title text,
  company_id text REFERENCES companies(id),
  emails jsonb NOT NULL DEFAULT '[]',
  phones jsonb NOT NULL DEFAULT '[]',
  links jsonb NOT NULL DEFAULT '[]',
  location text,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contacts_companyId_name_idx ON contacts (company_id, name);
CREATE INDEX IF NOT EXISTS contacts_location_idx ON contacts (location);
CREATE INDEX IF NOT EXISTS contacts_createdAt_idx ON contacts (created_at DESC);
CREATE INDEX IF NOT EXISTS contacts_title_idx ON contacts (title) WHERE title IS NOT NULL;
CREATE INDEX IF NOT EXISTS contacts_name_trgm_idx ON contacts USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS companies_name_idx ON companies (name);

CREATE TABLE IF NOT EXISTS events (
  id text PRIMARY KEY,
  name text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS event_contacts (
  event_id text NOT NULL REFERENCES events(id),
  contact_id text NOT NULL REFERENCES contacts(id),
  scanned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, contact_id)
);

CREATE INDEX IF NOT EXISTS event_contacts_contactId_idx ON event_contacts (contact_id);

CREATE TABLE IF NOT EXISTS notes (
  id text PRIMARY KEY,
  contact_id text NOT NULL REFERENCES contacts(id),
  kind text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS facts (
  id text PRIMARY KEY,
  contact_id text NOT NULL REFERENCES contacts(id),
  type text NOT NULL,
  text text NOT NULL,
  confidence real NOT NULL,
  source_note_id text REFERENCES notes(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS edges (
  id text PRIMARY KEY,
  src_type text NOT NULL,
  src_id text NOT NULL,
  predicate text NOT NULL,
  dst_type text NOT NULL,
  dst_id text NOT NULL,
  source_note_id text REFERENCES notes(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS edges_srcId_idx ON edges (src_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS edges_dstId_idx ON edges (dst_id) WHERE deleted_at IS NULL;

-- Pending person→person relationships awaiting the user's "which contact?"
-- confirmation before an edge is written (see repo/edge-suggestions.ts).
CREATE TABLE IF NOT EXISTS edge_suggestions (
  id text PRIMARY KEY,
  src_contact_id text NOT NULL REFERENCES contacts(id),
  predicate text NOT NULL,
  object_name text NOT NULL,
  object_type text NOT NULL,
  candidate_ids jsonb NOT NULL DEFAULT '[]',
  status text NOT NULL DEFAULT 'pending',
  source_note_id text REFERENCES notes(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS edge_suggestions_pending_idx ON edge_suggestions (created_at DESC) WHERE status = 'pending';
`;
