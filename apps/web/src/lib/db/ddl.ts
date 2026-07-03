/**
 * Idempotent schema DDL, applied on first DB open. Column names must stay in
 * lockstep with the Drizzle definitions in ./schema. Schema changes get a new
 * `ALTER ... IF NOT EXISTS`-style statement appended here (boring migrations
 * for a boring storage layer; revisit when the schema churns faster).
 */
export const DDL = `
CREATE EXTENSION IF NOT EXISTS vector;

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

CREATE TABLE IF NOT EXISTS sessions (
  id text PRIMARY KEY,
  name text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS session_contacts (
  session_id text NOT NULL REFERENCES sessions(id),
  contact_id text NOT NULL REFERENCES contacts(id),
  scanned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, contact_id)
);

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
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS reach_out_every_days integer;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_reached_out_at timestamptz;

CREATE TABLE IF NOT EXISTS embeddings (
  owner_type text NOT NULL,
  owner_id text NOT NULL,
  contact_id text NOT NULL,
  content text NOT NULL,
  embedding vector(384) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_type, owner_id)
);

CREATE TABLE IF NOT EXISTS waitlist (
  email text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

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
`;
