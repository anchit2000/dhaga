import type { Address, ContactMethod, ImportantDate } from "../schemas/contact-fields";

/**
 * The subset of a contact that can round-trip to an external address book.
 *
 * Deliberately narrow. Dhaga holds notes, AI-derived facts, graph edges and
 * signal state; NONE of that belongs here. An address book syncs to a laptop,
 * a car, a watch and sometimes a shared family device, so anything written
 * into it has effectively left the user's control — pushing inferred data
 * there would be a privacy incident, not a feature (CLAUDE.md: privacy
 * violations are bugs). These are the fields vCard/People/Graph all model
 * natively, and nothing more.
 *
 * `company` is the organisation NAME, not a company id: external address books
 * store a string. Resolving that to (or from) the `companies` FK happens at the
 * repo boundary, never inside the merge.
 */
export interface SyncableContact {
  name: string;
  nickname: string | null;
  title: string | null;
  company: string | null;
  emails: ContactMethod[];
  phones: ContactMethod[];
  links: ContactMethod[];
  addresses: Address[];
  importantDates: ImportantDate[];
}

/** Scalar fields merge by ownership; multi-value fields merge additively. */
export type ScalarField = "name" | "nickname" | "title" | "company";
export type MultiField = "emails" | "phones" | "links" | "addresses" | "importantDates";
export type SyncField = ScalarField | MultiField;

export const SCALAR_FIELDS: readonly ScalarField[] = ["name", "nickname", "title", "company"];
export const MULTI_FIELDS: readonly MultiField[] = [
  "emails",
  "phones",
  "links",
  "addresses",
  "importantDates",
];

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

/**
 * Provider-agnostic contract for an address book Dhaga can sync with — the
 * same gateway shape as LLMClient / SearchClient / MessagingClient. Adding
 * CardDAV or a new provider is a new implementation plus one registry call,
 * with zero changes to callers.
 *
 * `patch` is partial by contract: it must write ONLY the supplied fields and
 * leave every other field on the remote record untouched. That is what makes
 * field-level ownership safe — Dhaga never round-trips a whole record and so
 * can never clobber a field it does not manage.
 */
export interface ContactSyncTarget {
  readonly id: string;
  /**
   * Fields this target's data model cannot represent, and which must therefore
   * be excluded from the merge entirely.
   *
   * Absent (the normal case) means the target round-trips all nine. Declaring a
   * field here is not a soft "best effort" — it is load-bearing. A target that
   * silently reports a field as empty because it cannot store it would have the
   * merge honour that emptiness as a DELETION on the second run, once the base
   * snapshot recorded the field as synced. Microsoft Graph is the live example:
   * one url slot, and `birthday` as the only date.
   */
  readonly unsupportedFields?: readonly SyncField[];
  listContainers(): Promise<SyncContainer[]>;
  listChanged(since: Date | null): Promise<ExternalContact[]>;
  /**
   * Enumerate incrementally from the provider's own opaque cursor, returning a
   * fresh one. `null` means "no cursor yet" and must answer with a `"full"`
   * page that also mints one.
   *
   * OPTIONAL, and it stays optional: the mobile device target has no cursor to
   * offer — neither expo-contacts API exposes a modified-since query — and
   * making this required would break it for no gain. A target without it is
   * simply always enumerated in full via `listChanged`, exactly as before.
   *
   * Implementations MUST recover from an expired cursor by re-enumerating in
   * full and returning `mode: "full"`, never by surfacing the expiry as a run
   * failure.
   */
  listChangedSince?(cursor: string | null): Promise<ChangedContactsPage>;
  create(contact: SyncableContact, containerId: string | null): Promise<ExternalRef>;
  patch(
    externalId: string,
    fields: Partial<SyncableContact>,
    etag: string | null,
  ): Promise<ExternalRef>;
}
