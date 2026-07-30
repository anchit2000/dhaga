/**
 * Persisted notifications feed DDL. Purely additive. Concatenated LAST in
 * ./index.ts because it references contacts (graph.ts) and extraction_jobs
 * (extend.ts). Both FKs cascade — see the note in db/schema/notifications.ts on
 * why this table diverges from confirmations/signals there.
 */
export const NOTIFICATIONS_DDL = `
CREATE TABLE IF NOT EXISTS notifications (
  id text PRIMARY KEY,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  status text NOT NULL DEFAULT 'unread',
  contact_id text REFERENCES contacts(id) ON DELETE CASCADE,
  job_id text REFERENCES extraction_jobs(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);

-- The bell badge counts unread rows; the partial index keeps it to the handful
-- that are actually unread rather than the whole (append-only) history.
CREATE INDEX IF NOT EXISTS notifications_unread_idx ON notifications (created_at DESC) WHERE status = 'unread';

-- The feed itself lists unread + read, newest first, excluding dismissed.
CREATE INDEX IF NOT EXISTS notifications_feed_idx ON notifications (created_at DESC) WHERE status <> 'dismissed';

CREATE INDEX IF NOT EXISTS notifications_contactId_idx ON notifications (contact_id);
`;
