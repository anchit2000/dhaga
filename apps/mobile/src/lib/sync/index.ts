/**
 * Two-way contact sync with the device address book.
 *
 * device-target.ts implements the core ContactSyncTarget contract over
 * expo-contacts and self-registers with the core registry; engine.ts drives one
 * run end to end; containers.ts / writes.ts / fields/ hold the pure logic the
 * unit tests exercise. Importing anything here loads device-target, which is
 * what puts the "device" target in the registry.
 */
export { runContactSync } from "./engine";
export { deviceContactSyncTarget, syncPlatform } from "./device-target";
export { containerNotice, containerSyncsRemotely, contactsInContainer, pickWriteContainer } from "./containers";
export { createPayload, isCreate, toObserved } from "./writes";
export type {
  SyncOutcome,
  SyncPhase,
  SyncPhaseHandler,
  SyncProgress,
  SyncRunResult,
} from "./engine";
export type { SyncPlatform } from "./containers";
export type { SyncWriteFailure } from "./writes";
