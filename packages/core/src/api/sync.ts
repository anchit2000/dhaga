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
  /**
   * What the client observed. MAY be empty: an address book the user has
   * emptied still has to be reportable, and refusing the request outright would
   * make "I deleted everyone on my phone" the one change sync could not see.
   * An empty list on its own reconciles nothing and sweeps nothing — see
   * `observedEmpty` for the signal that makes it mean something.
   */
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

  /**
   * A POSITIVE claim that this container is empty: enumeration ran, succeeded,
   * and found nothing. Only meaningful alongside an empty `contacts`.
   *
   * It exists because neither of the signals above can say this. `full: true`
   * with no contacts and `observedExternalIds: []` are both what a FAILED
   * enumeration looks like — a revoked permission, a container id that no
   * longer resolves, a provider page that errored — and honouring either would
   * unlink a user's whole address book on a transient fault. A dedicated flag
   * cannot be produced by accident, so the client has to mean it.
   */
  observedEmpty?: boolean;
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
  /**
   * Eligible contacts this run did NOT offer as creates because it reached the
   * per-run ceiling on them. Counts only contacts that WOULD have been offered —
   * everything an unbounded run would have written out — so an AI-inferred stub,
   * an imported row or an already-linked contact never inflates it. Anything
   * else would report a backlog the user could never drain, which is worse than
   * reporting nothing. 0 means nothing was held back, including on every run
   * that never asked to push outward.
   *
   * A SNAPSHOT of this run, not a stable backlog: it moves as the user adds and
   * deletes people, so read it as "left over just now" and re-read it from the
   * next run. Never store it and count it down.
   */
  remaining: number;
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
