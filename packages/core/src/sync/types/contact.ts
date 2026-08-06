import type { Address, ContactMethod, ImportantDate } from "../../schemas/contact-fields";

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
