import type { ContactSyncTarget } from "./types";

export type {
  ChangedSide,
  ContactSyncTarget,
  ExternalContact,
  ExternalRef,
  PersistedSyncConflict,
  SyncConflict,
  SyncMergeInput,
  SyncMergeResult,
  MultiField,
  ScalarField,
  SyncableContact,
  SyncContainer,
  SyncField,
} from "./types";
export { MULTI_FIELDS, SCALAR_FIELDS } from "./types";
export {
  CONTACT_SYNC_NO_ACCESS,
  type ContactSyncCapabilities,
  type ContactSyncProvider,
  type ContactSyncProviderInfo,
  type ContactSyncTokens,
} from "./provider-types";
export {
  contactSyncCapabilities,
  getContactSyncProvider,
  hasContactSyncProvider,
  listContactSyncProviders,
  registerContactSyncProvider,
} from "./providers";
export { mergeSyncedContact, mergeMultiField, mergeScalarField, sameSyncFieldValue } from "./merge";
export { entriesEqual, entryKey, indexByKey } from "./keys";

/**
 * Contact-sync gateway — the same registry shape as the messaging gateway
 * (../messaging), which likewise holds MULTIPLE simultaneously-active targets
 * selected by id rather than a single default: a user can have the device
 * address book, Google and Outlook all linked at once.
 *
 * Unlike messaging, this registry seeds NOTHING. The device target depends on
 * expo-contacts, which is mobile-only and would break the web build if it were
 * reachable from a module the web bundle imports. Every target therefore
 * self-registers from the app that owns its dependencies: apps/mobile registers
 * the device target, apps/web registers Google/Microsoft.
 *
 * The merge core above is pure — no I/O, no native modules — so it is safe to
 * re-export from the package root; the TARGETS are deep-import-only.
 */
const targetStore = globalThis as unknown as {
  __dhagaContactSyncTargets?: Map<string, ContactSyncTarget>;
};

function syncTargets(): Map<string, ContactSyncTarget> {
  if (!targetStore.__dhagaContactSyncTargets) {
    targetStore.__dhagaContactSyncTargets = new Map<string, ContactSyncTarget>();
  }
  return targetStore.__dhagaContactSyncTargets;
}

/** Register an address-book target. Returns a disposer. */
export function registerContactSyncTarget(target: ContactSyncTarget): () => void {
  if (!target.id.trim()) throw new Error("Contact sync target id cannot be empty");
  syncTargets().set(target.id, target);
  return () => {
    syncTargets().delete(target.id);
  };
}

/** Look up a registered target by id; throws if none is registered under that id. */
export function getContactSyncTarget(id: string): ContactSyncTarget {
  const target = syncTargets().get(id);
  if (!target) throw new Error(`Unknown contact sync target "${id}"`);
  return target;
}

export function hasContactSyncTarget(id: string): boolean {
  return syncTargets().has(id);
}

export function listContactSyncTargets(): ContactSyncTarget[] {
  return [...syncTargets().values()];
}
