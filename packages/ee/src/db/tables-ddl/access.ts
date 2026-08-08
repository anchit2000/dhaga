/**
 * Access requests, the pending-approval column, and the one-shot migration
 * marker table every backfill in this directory gates itself on. Ordered first
 * in ./index because `dhaga_ee_migrations` must exist before anything uses it.
 */
export const ACCESS_DDL = `
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS access_requests (
  email text PRIMARY KEY,
  status text NOT NULL DEFAULT 'pending',
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by text,
  approval_token text
);

-- One-time normalization: the write path now stores email lowercased
-- (access-requests/repo.ts), but pre-existing rows may hold a mixed-case email.
-- Every lookup (isEmailApproved / reviewAccessRequest) matches on lower(email)
-- and Postgres text equality is case-sensitive, so a mixed-case row is
-- unreachable — stuck "pending" forever. Lowercase existing rows to match.
-- email is the PRIMARY KEY, so lowercasing can COLLIDE with another row that
-- already normalizes to the same value (a mixed-case row vs an existing
-- lowercase one, OR two mixed-case variants of each other). Collapse each
-- lower(email) group to one canonical row FIRST — an already-lowercase row
-- wins; otherwise the earliest-requested, tiebroken lexically for determinism —
-- then lowercase the survivors. Idempotent: once every row is lowercase and
-- unique per lower(email), the DELETE finds no rn>1 rows and the UPDATE finds
-- nothing to change, so re-running (on every DDL replay) is a no-op.
DO $$
BEGIN
  DELETE FROM access_requests
  WHERE ctid IN (
    SELECT ctid FROM (
      SELECT ctid,
             row_number() OVER (
               PARTITION BY lower(email)
               ORDER BY (email = lower(email)) DESC, requested_at ASC, email ASC
             ) AS rn
      FROM access_requests
    ) ranked
    WHERE rn > 1
  );
  UPDATE access_requests SET email = lower(email) WHERE email <> lower(email);
END $$;

-- Pending-approval gate ("payment is the invite"). Signup is open, but a hosted
-- account only reaches /app once approved_at is set — by an admin approving the
-- access request, by a confirmed payment, or by an admin comp. EE-owned and
-- additive: core's AUTH_DDL never adds this column, so a self-hosted instance
-- without packages/ee has no gate at all (ApprovalGate's permissive default).
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS approved_at timestamptz;

-- BACKFILL, exactly once. Every account that existed when the gate shipped was
-- created under the old "approval happens before signup" wall, so all of them
-- are already approved — leaving them null would lock out every real user on
-- the next deploy. It must not repeat: a plain UPDATE ... WHERE approved_at IS
-- NULL would re-approve everyone still legitimately pending on the next DDL
-- replay (this whole script re-runs whenever its text changes). A marker row
-- makes it one-shot and idempotent, same pattern as core's
-- grandfather-email-verification-v1.
CREATE TABLE IF NOT EXISTS dhaga_ee_migrations (
  id text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
WITH applied AS (
  INSERT INTO dhaga_ee_migrations (id)
  VALUES ('backfill-user-approval-v1')
  ON CONFLICT DO NOTHING
  RETURNING id
)
UPDATE "user"
SET approved_at = now()
WHERE approved_at IS NULL
  AND EXISTS (SELECT 1 FROM applied);

CREATE INDEX IF NOT EXISTS access_requests_status_requested_idx ON access_requests (status, requested_at DESC);
CREATE INDEX IF NOT EXISTS ee_user_created_idx ON "user" (created_at DESC);
CREATE INDEX IF NOT EXISTS ee_user_name_trgm_idx ON "user" USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS ee_user_email_trgm_idx ON "user" USING GIN (email gin_trgm_ops);
`;
