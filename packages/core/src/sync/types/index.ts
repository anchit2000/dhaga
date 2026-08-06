// Contact-sync merge core types, split by domain: `./contact` (the syncable
// contact shape + field taxonomy), `./conflict` (3-way merge in/out types),
// `./external` (a contact as an address book represents it) and `./target`
// (the ContactSyncTarget provider contract). Re-exported here so every
// existing `"./sync/types"` / `"../sync/types"` import keeps resolving
// unchanged (CLAUDE.md File Length Rule).
export {
  MULTI_FIELDS,
  SCALAR_FIELDS,
  type MultiField,
  type ScalarField,
  type SyncableContact,
  type SyncField,
} from "./contact";
export type {
  ChangedSide,
  PersistedSyncConflict,
  SyncConflict,
  SyncMergeInput,
  SyncMergeResult,
} from "./conflict";
export type {
  ChangedContactsPage,
  ExternalContact,
  ExternalRef,
  SyncContainer,
} from "./external";
export type { ContactSyncTarget } from "./target";
