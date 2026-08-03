/**
 * In-app feedback: what the user typed, plus the small fixed set of debugging
 * context attached to it. References nothing, so its position in CORE_DDL is
 * free.
 *
 * The columns ARE the privacy allow-list, and that is why this table has no
 * jsonb blob. CLAUDE.md forbids storing contact PII, note text or extraction
 * output; a `context jsonb` column would make adding a forbidden field a
 * zero-diff change to the schema, so every captured signal gets a named column
 * here and anything absent from this list cannot be persisted at all.
 */
export const FEEDBACK_DDL = `
CREATE TABLE IF NOT EXISTS feedback (
  id text PRIMARY KEY,
  -- The user's own words. This is the ONLY free text on the table, and it is
  -- authored deliberately for the maintainer — unlike a note or a search query,
  -- which are private and never leave the graph.
  message text NOT NULL,
  -- The ROUTE PATTERN, never the concrete path: /app/people/[id], not
  -- /app/people/<a real contact id>. lib/feedback/context.ts does the
  -- substitution client-side, so no contact identifier reaches this column.
  -- Query strings are excluded for the same reason — ?q= carries search terms.
  route text NOT NULL,
  -- "375x812". Layout bugs are width bugs; this is the first thing needed to
  -- reproduce one.
  viewport text,
  user_agent text,
  -- BCP-47 tag and IANA zone: date/number formatting bugs are unreproducible
  -- without them.
  locale text,
  timezone text,
  -- Deploy the report came from, when the host exposes one (NULL self-hosted).
  app_version text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- The admin table reads newest-first and pages with limit/offset; there is no
-- other access path.
CREATE INDEX IF NOT EXISTS feedback_created_at_idx ON feedback (created_at DESC);
`;
