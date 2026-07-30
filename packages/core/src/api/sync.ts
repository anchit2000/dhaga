/**
 * Request/response contract for the two-way contact-sync endpoints. Types only
 * (no runtime code): clients deep-import this module so the Anthropic SDK
 * re-exported by the package barrel never enters their bundles (mirrors
 * ./import and ./capture).
 *
 * The merge runs on the SERVER, not the client. The server is what holds the
 * per-link base snapshot that the three-way merge needs, and keeping one copy
 * of it avoids two devices disagreeing about what "last synced" means. The
 * client owns only the platform I/O: it reads the address book, ships what it
 * saw, and applies the writes it is handed back.
 */
import type { SyncableContact, SyncConflict } from "../sync/types";

export type ContactSyncProviderId = "device" | "google" | "microsoft";

/** A contact as the client observed it in the external address book. */
export interface ObservedContact extends SyncableContact {
  externalId: string;
  etag: string | null;
}

export interface SyncPushRequest {
  provider: ContactSyncProviderId;
  /** Which account/container these came from (iOS CardDAV container, Android account). */
  containerId: string | null;
  contacts: ObservedContact[];
  /**
   * True when `contacts` is the COMPLETE address book for this container. Only
   * then can the server distinguish "deleted on the device" from "not included
   * in this batch" — a partial batch must never be read as a set of deletions.
   *
   * Only usable when the whole address book fits in one request. Past that,
   * leave it false and use `observedExternalIds` on the final chunk instead.
   */
  full: boolean;

  /**
   * Every external id present in this container, sent ONLY on the final chunk
   * once the client has finished enumerating it. Its presence authorises the
   * deletion sweep for a batch too large to ship in one request.
   *
   * Ids rather than whole contacts, so the sweep costs one small request no
   * matter how big the address book is — and stateless, so the server needs no
   * cross-request session to remember what a chunked run has seen so far.
   * When present this takes precedence over `full`.
   */
  observedExternalIds?: string[] | null;
}

/**
 * One write the client must apply to the external address book. `fields` is
 * partial by contract: apply only these, leave every other field on the record
 * untouched. `externalId: null` means create.
 */
export interface SyncWrite {
  externalId: string | null;
  /** Echoed so the client can report the assigned id back after a create. */
  contactId: string;
  fields: Partial<SyncableContact>;
  etag: string | null;
}

export interface SyncConflictReport {
  contactId: string;
  contactName: string;
  conflicts: SyncConflict[];
}

export interface SyncPushResponse {
  writes: SyncWrite[];
  conflicts: SyncConflictReport[];
  /** Contacts updated inside Dhaga from what the client observed. */
  pulled: number;
  /** Contacts newly created in Dhaga (seen on the device, absent from the graph). */
  created: number;
  /** New contact↔external links established this run. */
  linked: number;
}

/**
 * After applying writes, the client reports the ids the address book assigned.
 * Required because a created record's id does not exist until the platform
 * mints it — without this the next sync would not recognise its own write and
 * would create a duplicate.
 */
export interface SyncAckRequest {
  provider: ContactSyncProviderId;
  results: {
    contactId: string;
    externalId: string;
    etag: string | null;
  }[];
}

export interface SyncAckResponse {
  acknowledged: number;
}
