import type { SyncableContact, SyncField } from "@dhaga/core";

/** Field-level helpers for the reconcile, split out to keep ./index.ts to the
 *  orchestration itself. */

export interface ReconcileOptions {
  /**
   * Also offer Dhaga contacts that have NO link on this provider as creates.
   * Off by default — see offerUnlinkedCreates in ../sweep.ts.
   */
  pushUnlinked?: boolean;
  /**
   * Fields this provider's data model cannot represent, which must therefore
   * not participate in the merge at all.
   *
   * This exists to stop a specific, silent data loss. Microsoft Graph has ONE
   * url slot and only a `birthday`, so a contact with two links reads back as
   * having none. Left alone the merge would do exactly the wrong thing twice:
   * round one sees Dhaga-only additions and tries to push them; round two — now
   * that the base snapshot records them as synced — sees them missing from the
   * remote and honours it as a DELETION, destroying links the user never
   * touched.
   *
   * Neutralising is deliberately done by copying the local value over the
   * observed one rather than by skipping the field: that way base, local and
   * remote agree on it forever, so it is never pulled, never pushed, never
   * flagged, and the base snapshot stays truthful about what was actually
   * synced.
   */
  unsupportedFields?: readonly SyncField[];
}

/** The merged value of exactly the fields that moved. Partial by contract: the
 *  client applies these and leaves every other field on the record untouched. */
export function pickFields(
  contact: SyncableContact,
  fields: readonly SyncField[],
): Partial<SyncableContact> {
  const out: Partial<SyncableContact> = {};
  for (const field of fields) Object.assign(out, { [field]: contact[field] });
  return out;
}

/** Make `fields` invisible to the merge by giving the remote the local value. */
export function neutralise(
  remote: SyncableContact,
  local: SyncableContact | undefined,
  fields: readonly SyncField[] | undefined,
): SyncableContact {
  if (!fields?.length || !local) return remote;
  const out: SyncableContact = { ...remote };
  for (const field of fields) Object.assign(out, { [field]: local[field] });
  return out;
}
