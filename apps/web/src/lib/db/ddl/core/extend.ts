/**
 * Follow-ups, background extraction jobs, and the additive ALTERs that grew the
 * contacts/events tables plus the positions (employment history) table. Applied
 * after graph.ts, whose tables these reference.
 */
export const EXTEND_DDL = `
CREATE TABLE IF NOT EXISTS follow_ups (
  id text PRIMARY KEY,
  user_id text,
  contact_id text REFERENCES contacts(id),
  company_id text REFERENCES companies(id),
  action text NOT NULL,
  due_hint text,
  due_date timestamptz,
  recurrence_frequency text,
  recurrence_interval integer,
  recurrence_weekday integer,
  recurrence_month_day integer,
  recurrence_month integer,
  status text NOT NULL DEFAULT 'open',
  source_note_id text REFERENCES notes(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Additive for pre-existing tables: manual follow-ups store a machine date here
-- (the date picker); due_hint stays for the LLM's free-text timing prose.
ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS due_date timestamptz;
ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS user_id text;

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
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS starred boolean NOT NULL DEFAULT false;
-- Partial index: the Saved page's Starred tab lists only starred contacts,
-- newest-first, so the index stays tiny (just the favourited rows).
CREATE INDEX IF NOT EXISTS contacts_starred_idx ON contacts (created_at DESC) WHERE starred = true;

-- Is this row a person at all? Bulk address-book imports drag in "Vegetable
-- Vendor" and "Ola Support", which are real rows the user wants to keep and
-- search, but noise on a proactive surface. Three values, not two, because NULL
-- and 'unknown' are NOT the same instruction even though both read as
-- not-suppressed: NULL means "never judged — batch it", 'unknown' means "the
-- model looked and declined". Without 'unknown' the sweep is forced to guess on
-- a row that says only a first name, and a wrong 'service' guess invisibly
-- removes a real person from every proactive surface. ONLY 'service'
-- suppresses.
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS person_kind text;
-- Who ruled. 'user' is a LOCK, not an audit field: the nightly sweep skips any
-- row the user ruled on, so a correction is never silently overwritten by the
-- next batch. Defaults to 'model' so a pre-existing row is re-judgeable.
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS person_kind_by text NOT NULL DEFAULT 'model';
-- Model certainty 0..1, NULL when the user set the kind (a user ruling has no
-- confidence — it is the answer). Orders the review list so the shakiest
-- suppressions are reviewed first. It NEVER decides suppression: person_kind
-- alone does that, or a threshold change would silently move the whole graph.
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS person_kind_confidence real;
-- Sweep stamp, exact analogue of signals_scanned_at above: lets the nightly
-- classification pass pick up where it left off instead of re-judging the graph.
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS person_classified_at timestamptz;
-- Partial index: serves the review screen ONLY (list the suppressed rows,
-- least-confident first). Deliberately NOT an index for the read paths — they
-- ask the NEGATIVE (person_kind IS DISTINCT FROM 'service', see
-- lib/repo/contacts/surfaceable.ts), which matches nearly every row and so
-- takes a seq scan on purpose. Do not "fix" that by widening this index; an
-- index over the whole table would be scanned in full anyway.
CREATE INDEX IF NOT EXISTS contacts_person_kind_review_idx ON contacts (person_kind_confidence, created_at DESC) WHERE person_kind = 'service';
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

-- Affiliation predicate (studied_at, interned_at, board_member_of, …). NULL is
-- a plain employment role; app code derives works_at/worked_at from is_current.
ALTER TABLE positions ADD COLUMN IF NOT EXISTS relation text;

-- Receipt, like facts/edges/follow_ups: the note an extracted job or degree came
-- from, so a deleted note's derived positions can be cleared and re-run. NULL
-- for rows the user typed or imported.
ALTER TABLE positions ADD COLUMN IF NOT EXISTS source_note_id text REFERENCES notes(id);
CREATE INDEX IF NOT EXISTS positions_sourceNoteId_idx ON positions (source_note_id);
`;
