/**
 * Standalone side tables: AI metering, key/value settings (with the PK
 * self-heal), stored card images, and signals. No ordering dependency beyond
 * the contacts/notes tables created in graph.ts.
 */
export const META_DDL = `
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

-- Self-heals databases where "settings" pre-dates this table's primary key
-- (CREATE TABLE IF NOT EXISTS above is a no-op against an existing table,
-- so it can never retroactively add a missing constraint on its own).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conrelid = 'settings'::regclass AND contype = 'p'
  ) THEN
    ALTER TABLE settings ADD PRIMARY KEY (key);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS card_images (
  id text PRIMARY KEY,
  contact_id text NOT NULL REFERENCES contacts(id),
  note_id text REFERENCES notes(id),
  media_type text NOT NULL,
  data_base64 text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- The person page's card-photo strip fetches by contact. Especially worth
-- indexing here: rows carry inline base64 image data, so a seq scan drags the
-- whole blob column through memory.
CREATE INDEX IF NOT EXISTS card_images_contactId_idx ON card_images (contact_id, created_at DESC);

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

-- The person page's signal list fetches a contact's signals newest-first.
CREATE INDEX IF NOT EXISTS signals_contactId_idx ON signals (contact_id, created_at DESC);

-- Taught dictation vocabulary (voice teaching). Synthetic text PK so there's no
-- natural-key constraint to juggle across the self-host/EE-RLS split — per-user
-- uniqueness of term_lc is enforced in the repo (lookup-then-upsert), not by a
-- DB constraint. No user_id here; EE's rls-ddl adds user_id + RLS + the tenant
-- default (packages/ee/src/db/rls-ddl.ts). keys are precomputed double-metaphone
-- codes for term + aliases (see @dhaga/core/src/voice/teaching/phonetic).
CREATE TABLE IF NOT EXISTS voice_vocab (
  id text PRIMARY KEY,
  term text NOT NULL,
  term_lc text NOT NULL,
  aliases jsonb NOT NULL DEFAULT '[]',
  keys jsonb NOT NULL DEFAULT '[]',
  boost integer NOT NULL DEFAULT 8,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Self-heals a voice_vocab that pre-dates this primary key (CREATE TABLE IF NOT
-- EXISTS above is a no-op against an existing table, so it can never add a
-- missing constraint on its own). Same idempotent pattern as settings.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conrelid = 'voice_vocab'::regclass AND contype = 'p'
  ) THEN
    ALTER TABLE voice_vocab ADD PRIMARY KEY (id);
  END IF;
END $$;
`;
