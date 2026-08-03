/**
 * Goal-driven curation: the user's current objective in their own words, and
 * the contacts a nightly match pass judged relevant to it. Applied after
 * graph.ts — goal_members references contacts(id).
 */
export const GOALS_DDL = `
-- objective is stored VERBATIM: it is both the prompt the match pass reasons
-- over and the line the user reads back on Home, so a normalised or re-worded
-- copy would mean the surface explains itself in words the user never wrote.
-- Only one goal is active at a time today (MAX_ACTIVE_GOALS in
-- utils/constants/goals.ts) — that is a write guard, not a schema limit.
CREATE TABLE IF NOT EXISTS goals (
  id text PRIMARY KEY,
  objective text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Every read starts "the active goal, newest first". Partial on status keeps
-- the index to the one live row per user, not the archive.
CREATE INDEX IF NOT EXISTS goals_active_idx ON goals (created_at DESC) WHERE status = 'active';

-- One row per (goal, contact) the match pass judged relevant.
--
-- Synthetic text PK rather than the natural (goal_id, contact_id) composite:
-- natural-key PKs have to be juggled across the self-host/EE-RLS split, because
-- EE adds a user_id column on top of core's schema and a natural key that does
-- not include it is wrong the moment the table is multi-tenant. ddl/core/meta.ts
-- documents the pain twice — the settings table needed a DO $$ block to retrofit
-- a PK it should have had, and voice_vocab made exactly this call (synthetic id,
-- uniqueness enforced by an index rather than the PK). Same shape here: the
-- UNIQUE index below carries the "one row per pair" guarantee.
--
-- rank is the model's fit 0..100, FROZEN at match time. It is not recomputed on
-- read: the daily slice has to be stable within a run, and a rank that drifts
-- under the user would reshuffle a list they are working through.
--
-- state has deliberately NO 'done' value. Done is DERIVED — a member is done
-- when the contact's last touch moved past matched_at, read through the
-- existing lastTouchSql (lib/repo/last-touch.ts). This is the design's
-- load-bearing decision: reaching out is already recorded as a note, an event
-- scan, or an explicit "I reached out", so a stored 'done' flag would be a
-- second source of truth that goes stale the moment the user acts anywhere
-- other than this tile. 'skipped' IS stored, because "not this person" is a
-- judgment nothing else in the graph records.
CREATE TABLE IF NOT EXISTS goal_members (
  id text PRIMARY KEY,
  goal_id text NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  contact_id text NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  state text NOT NULL DEFAULT 'pending',
  rank integer NOT NULL DEFAULT 0,
  matched_at timestamptz NOT NULL DEFAULT now()
);

-- Carries the "one row per (goal, contact)" guarantee the composite PK would
-- have, and lets the match pass re-run as an idempotent upsert.
CREATE UNIQUE INDEX IF NOT EXISTS goal_members_goal_contact_idx ON goal_members (goal_id, contact_id);

-- The daily slice: best-fit pending members of one goal. Partial on state, so
-- the index shrinks as the user works through the cohort.
CREATE INDEX IF NOT EXISTS goal_members_pending_idx ON goal_members (goal_id, rank DESC) WHERE state = 'pending';
`;
