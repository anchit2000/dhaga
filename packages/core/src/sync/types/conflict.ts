import type { SyncableContact, SyncField } from "./contact";

/** Which side moved, as derived from the 3-way comparison against the base. */
export type ChangedSide = "neither" | "local" | "remote" | "both";

/**
 * A divergence the merge could not resolve without discarding a user edit.
 * Surfaced rather than silently resolved — losing an edit the user typed on
 * their phone is the one failure mode this whole design exists to avoid.
 */
export interface SyncConflict {
  field: SyncField;
  kind: "both_edited" | "edited_vs_removed";
  /** What Dhaga held. Kept for the review UI so the losing side is recoverable. */
  local: unknown;
  /** What the external address book held. */
  remote: unknown;
}

/**
 * A `SyncConflict` as it is STORED against the link, so the losing value
 * outlives the HTTP response that reported it.
 *
 * Without this the "nothing is destroyed" promise is false: the merge adopts the
 * phone's value, hands the Dhaga value back in the push response, and the moment
 * the client drops that body the user's value is gone for good. Persisting it is
 * what makes a conflict something the user can come back to and decide.
 *
 * `at` is when the divergence was FIRST recorded, not when the row was last
 * written — it is what lets the review UI say how long a decision has been
 * waiting.
 */
export interface PersistedSyncConflict extends SyncConflict {
  /** ISO-8601. When this divergence was first recorded. */
  at: string;
}

export interface SyncMergeInput {
  /** Last-synced copy. `null` on the very first link, where there is no base. */
  base: Partial<SyncableContact> | null;
  local: SyncableContact;
  remote: SyncableContact;
}

export interface SyncMergeResult {
  merged: SyncableContact;
  conflicts: SyncConflict[];
  /** Fields whose merged value differs from `local` — i.e. what to write to Dhaga. */
  changedLocally: SyncField[];
  /** Fields whose merged value differs from `remote` — i.e. what to push outward. */
  changedRemotely: SyncField[];
}
