/**
 * Full-text search (M6 "Search" tab): a generated, GIN-indexed tsvector per
 * source table so keyword matching stays index-backed as data grows instead
 * of degrading into ILIKE '%word%' sequential scans. Trigram indexes cover
 * the identifier-shaped fields (emails/phones/links/domain) tsvector can't
 * usefully search — Postgres tokenizes an email/URL as a single lexeme, so
 * "freightline" alone would never match "rohan@freightline.com" via tsvector.
 */
export const SEARCH_DDL = `
CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS search_tsv tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(title, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(location, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(tags::text, '[]')), 'B')
) STORED;
CREATE INDEX IF NOT EXISTS contacts_search_tsv_idx ON contacts USING GIN (search_tsv);
CREATE INDEX IF NOT EXISTS contacts_emails_trgm_idx ON contacts USING GIN ((emails::text) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS contacts_phones_trgm_idx ON contacts USING GIN ((phones::text) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS contacts_links_trgm_idx ON contacts USING GIN ((links::text) gin_trgm_ops);

ALTER TABLE companies ADD COLUMN IF NOT EXISTS search_tsv tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(sector, '')), 'B')
) STORED;
CREATE INDEX IF NOT EXISTS companies_search_tsv_idx ON companies USING GIN (search_tsv);
CREATE INDEX IF NOT EXISTS companies_domain_trgm_idx ON companies USING GIN (domain gin_trgm_ops);

ALTER TABLE notes ADD COLUMN IF NOT EXISTS search_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(body, ''))) STORED;
CREATE INDEX IF NOT EXISTS notes_search_tsv_idx ON notes USING GIN (search_tsv);

ALTER TABLE facts ADD COLUMN IF NOT EXISTS search_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(text, ''))) STORED;
CREATE INDEX IF NOT EXISTS facts_search_tsv_idx ON facts USING GIN (search_tsv);

ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS search_tsv tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(action, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(due_hint, '')), 'B')
) STORED;
CREATE INDEX IF NOT EXISTS follow_ups_search_tsv_idx ON follow_ups USING GIN (search_tsv);

ALTER TABLE events ADD COLUMN IF NOT EXISTS search_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(name, ''))) STORED;
CREATE INDEX IF NOT EXISTS events_search_tsv_idx ON events USING GIN (search_tsv);

ALTER TABLE signals ADD COLUMN IF NOT EXISTS search_tsv tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(headline, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(detail, '')), 'B')
) STORED;
CREATE INDEX IF NOT EXISTS signals_search_tsv_idx ON signals USING GIN (search_tsv);
`;
