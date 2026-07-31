export interface ContactSyncRunResult {
  connectionId: string;
  provider: string;
  accountEmail: string | null;
  /** Contacts updated in Dhaga from what the provider held. */
  pulled: number;
  /** Contacts newly created in Dhaga. */
  created: number;
  /** New links established. */
  linked: number;
  /** Records written out to the provider. */
  pushed: number;
  /**
   * Dhaga-only contacts this run could not offer because it hit the per-run
   * create ceiling. A snapshot, drained by running again — see
   * SyncPushResponse.remaining.
   */
  remaining: number;
  /** Fields both sides changed; parked for review at /app/sync/conflicts. */
  conflicts: number;
  /** Set when the run could not complete. Never carries provider payloads. */
  error: string | null;
}

export function emptyResult(row: {
  id: string;
  provider: string;
  accountEmail: string | null;
}): ContactSyncRunResult {
  return {
    connectionId: row.id,
    provider: row.provider,
    accountEmail: row.accountEmail,
    pulled: 0,
    created: 0,
    linked: 0,
    pushed: 0,
    remaining: 0,
    conflicts: 0,
    error: null,
  };
}
