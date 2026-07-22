/**
 * Follow-ups, background extraction jobs, and the additive ALTERs that grew the
 * contacts/events tables plus the positions (employment history) table. Applied
 * after graph.ts, whose tables these reference.
 */
export const EXTEND_DDL = `
CREATE TABLE IF NOT EXISTS follow_ups (
  id text PRIMARY KEY,
  contact_id text NOT NULL REFERENCES contacts(id),
  action text NOT NULL,
  due_hint text,
  status text NOT NULL DEFAULT 'open',
  source_note_id text REFERENCES notes(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- The person page lists only a contact's OPEN follow-ups, newest-first. Partial
-- on status keeps the index to the handful of live rows per contact.
CREATE INDEX IF NOT EXISTS follow_ups_contactId_idx ON follow_ups (contact_id, created_at DESC) WHERE status = 'open';

ALTER TABLE facts ADD COLUMN IF NOT EXISTS unverified boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS extraction_jobs (
  id text PRIMARY KEY,
  contact_id text NOT NULL REFERENCES contacts(id),
  note_id text REFERENCES notes(id),
  kind text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  stage text,
  error text,
  fact_count integer NOT NULL DEFAULT 0,
  follow_up_count integer NOT NULL DEFAULT 0,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS extraction_jobs_contact_idx ON extraction_jobs (contact_id, created_at DESC);
CREATE INDEX IF NOT EXISTS extraction_jobs_active_idx ON extraction_jobs (updated_at) WHERE status IN ('pending', 'running');

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS tags jsonb NOT NULL DEFAULT '[]';
CREATE INDEX IF NOT EXISTS contacts_tags_gin_idx ON contacts USING GIN (tags);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS reach_out_every_days integer;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_reached_out_at timestamptz;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS watched_for_signals boolean NOT NULL DEFAULT false;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS signals_scanned_at timestamptz;
ALTER TABLE events ADD COLUMN IF NOT EXISTS geohash text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS color text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS emoji text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS tags jsonb NOT NULL DEFAULT '[]';
CREATE INDEX IF NOT EXISTS events_tags_gin_idx ON events USING GIN (tags);

-- Rich, import-friendly contact fields (people carry several of each). emails/
-- phones/links keep their column but graduate from string[] to
-- {value,label,note}[] — legacy string rows are coerced on read, so no data
-- migration. addresses/important_dates/custom_fields are new; custom_fields is
-- the lossless catch-all for any Google/vCard/device field without a home.
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS nickname text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS addresses jsonb NOT NULL DEFAULT '[]';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS important_dates jsonb NOT NULL DEFAULT '[]';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS custom_fields jsonb NOT NULL DEFAULT '[]';

-- Employment history. Source of truth for jobs; the primary role mirrors into
-- contacts.title / company_id so existing reads keep working.
CREATE TABLE IF NOT EXISTS positions (
  id text PRIMARY KEY,
  contact_id text NOT NULL REFERENCES contacts(id),
  company_id text REFERENCES companies(id),
  title text,
  department text,
  is_current boolean NOT NULL DEFAULT false,
  started_at text,
  ended_at text,
  note text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS positions_contactId_idx ON positions (contact_id);
CREATE INDEX IF NOT EXISTS positions_companyId_idx ON positions (company_id);
`;
