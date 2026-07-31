/**
 * Two-way contact-sync DDL, kept separate from core.ts the same way auth/
 * calendar/search DDL are (concatenated in ./index.ts). Idempotent, boot-time
 * applied — the project's "boring migrations" convention (CLAUDE.md principle 5).
 *
 * `contact_links` is the missing join that makes resync possible at all: until
 * now the only provenance a contact carried was `contacts.source = 'import'`,
 * which does not even record which provider it came from, so a second import
 * created duplicates rather than updating. One row here maps one Dhaga contact
 * to its counterpart in one external address book.
 *
 * `base_snapshot` holds the last-synced copy of the syncable fields. It is what
 * turns this from a lossy overwrite into a real 3-way merge (see
 * packages/core/src/sync/merge/): comparing local-vs-base and remote-vs-base
 * tells us which SIDE changed, which per-contact timestamps cannot — neither
 * iOS nor Android exposes per-field modification times.
 *
 * `conflicts` holds the divergences that merge could not resolve without
 * discarding a Dhaga value. The merge adopts the phone's value deliberately, so
 * without this column the value the user had in Dhaga lived only in the push
 * RESPONSE and died with it — the one data-loss the whole 3-way design exists to
 * prevent. Kept here, it survives the request and can be reviewed and restored
 * (repo/sync/conflicts.ts). Entries are rewritten on every reconcile of the
 * link, so a divergence that goes away clears itself rather than piling up.
 *
 * Deliberately NO unique index on (provider, external_id): under EE every row
 * also carries a `user_id` (added by packages/ee rls-ddl.ts TENANT_TABLES), and
 * Android contact ids are small integers drawn from the device's own sequence,
 * so two users WILL collide on the same external_id. Core cannot see the
 * tenancy column, so a core-side unique index would be wrong. Uniqueness is
 * enforced in app code instead — the same call company_aliases makes.
 *
 * `contact_sync_tombstones` records that the user deleted a Dhaga contact which
 * WAS linked to an external record. It has to be a separate table precisely
 * because contact_links.contact_id cascades: forgetting the contact takes its
 * links with it, and on the next sync the phone's record looks like a stranger
 * — unknown external id, no contact left for the dedup ladder to match — so it
 * was re-created and the user's deletion silently undid itself. This survives
 * the cascade and is consulted before any create.
 *
 * It deliberately stores NO identity: provider + external id and a timestamp,
 * nothing about the person. A "forget this person" that kept their name or
 * email in a side table would not be a deletion. The id alone is enough,
 * because all this table ever answers is "may this record create a contact?".
 */
export const SYNC_DDL = `
CREATE TABLE IF NOT EXISTS contact_links (
  id text PRIMARY KEY,
  contact_id text NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  provider text NOT NULL,
  external_id text NOT NULL,
  container_id text,
  etag text,
  base_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  conflicts jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_pulled_at timestamptz,
  last_pushed_at timestamptz,
  state text NOT NULL DEFAULT 'linked',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS contact_links_contact_idx ON contact_links (contact_id);
CREATE INDEX IF NOT EXISTS contact_links_lookup_idx ON contact_links (provider, external_id);
ALTER TABLE contact_links ADD COLUMN IF NOT EXISTS conflicts jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS contact_sync_tombstones (
  id text PRIMARY KEY,
  provider text NOT NULL,
  external_id text NOT NULL,
  deleted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS contact_sync_tombstones_lookup_idx
  ON contact_sync_tombstones (provider, external_id);
`;
