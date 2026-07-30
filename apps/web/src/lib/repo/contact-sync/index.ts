/**
 * Server-side contact sync (Google People, Microsoft Graph) — the counterpart to
 * lib/repo/sync, which serves the mobile client. Connections live in
 * ./connections; the run itself is ./run and deliberately reuses lib/repo/sync's
 * reconcile and ack rather than reimplementing the merge.
 */
export {
  deleteContactConnection,
  listContactConnections,
  providerFor,
  saveContactConnection,
  setContactPushUnlinked,
  setContactSyncEnabled,
  syncableConnectionRows,
  usableAccessToken,
  type ContactConnectionSummary,
} from "./connections";
export { runContactSync, type ContactSyncRunResult } from "./run";
