/**
 * Idempotent schema DDL, applied on first DB open. Column names must stay in
 * lockstep with the Drizzle definitions in ../schema. Schema changes get a new
 * `ALTER ... IF NOT EXISTS`-style statement appended here (boring migrations
 * for a boring storage layer; revisit when the schema churns faster).
 */
export const CORE_DDL = `
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

CREATE TABLE IF NOT EXISTS follow_ups (
  id text PRIMARY KEY,
  contact_id text NOT NULL REFERENCES contacts(id),
  action text NOT NULL,
  due_hint text,
  status text NOT NULL DEFAULT 'open',
  source_note_id text REFERENCES notes(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS tags jsonb NOT NULL DEFAULT '[]';
CREATE INDEX IF NOT EXISTS contacts_tags_gin_idx ON contacts USING GIN (tags);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS reach_out_every_days integer;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_reached_out_at timestamptz;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS watched_for_signals boolean NOT NULL DEFAULT false;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS signals_scanned_at timestamptz;
ALTER TABLE events ADD COLUMN IF NOT EXISTS geohash text;

CREATE TABLE IF NOT EXISTS ai_actions (
  id text PRIMARY KEY,
  feature text NOT NULL,
  model text NOT NULL,
  input_tokens integer NOT NULL,
  output_tokens integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS card_images (
  id text PRIMARY KEY,
  contact_id text NOT NULL REFERENCES contacts(id),
  note_id text REFERENCES notes(id),
  media_type text NOT NULL,
  data_base64 text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS signals (
  id text PRIMARY KEY,
  contact_id text NOT NULL REFERENCES contacts(id),
  kind text NOT NULL,
  headline text NOT NULL,
  detail text NOT NULL,
  source_url text,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
`;
