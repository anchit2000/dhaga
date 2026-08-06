import type { SyncableContact } from "./contact";

/** A contact as it exists in an external address book, with its identity. */
export interface ExternalContact extends SyncableContact {
  externalId: string;
  containerId: string | null;
  etag: string | null;
}

/** An account/container within a provider (iOS CardDAV container, Android account). */
export interface SyncContainer {
  id: string;
  name: string;
  /** "cardDAV" (iCloud/Google), "exchange", "local", … — from the platform. */
  type: string;
  /** Whether writes here propagate to a remote account, or stay on-device. */
  syncsRemotely: boolean;
}

export interface ExternalRef {
  externalId: string;
  etag: string | null;
}

/**
 * One enumeration of an external address book, and — crucially — whether it was
 * the WHOLE of one.
 *
 * `mode` is a discriminant rather than a boolean because of what reads it: the
 * caller turns it into reconcile's `full` flag, which authorises the DELETION
 * SWEEP that tombstones every link with no matching record. An incremental
 * batch is only what changed, so treating it as complete would unlink almost
 * the entire address book on the first incremental run. A literal that has to
 * be spelled `"full"` at the exact site that actually enumerated everything is
 * far harder to get wrong than a boolean that defaults, spreads or inverts.
 *
 * Deletions therefore surface only on a `"full"` run. An incremental page must
 * DROP the provider's deletion tombstones rather than pass them on: they arrive
 * as records with no fields, and the merge would honour that emptiness as the
 * user clearing every field they own.
 *
 * `cursor` is the provider's own opaque resume token — Google's syncToken,
 * Graph's deltaLink — never a timestamp, which is why `listChanged(since)`
 * could not express it. `null` means the provider issued none this run, and the
 * caller must then clear whatever it had stored: the cost is a full enumeration
 * next time, which is always safe.
 */
export interface ChangedContactsPage {
  mode: "full" | "incremental";
  contacts: ExternalContact[];
  cursor: string | null;
}
