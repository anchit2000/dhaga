/**
 * Request/response contract for GET /api/contacts — contact lookup for
 * external surfaces (browser extension's attach-to-contact search; later,
 * mobile). Types only: deep-import this module directly, same as capture.ts.
 */

/** One search hit. Deliberately a subset of the full contact record. */
export interface ContactSummary {
  id: string;
  name: string;
  title: string | null;
  companyName: string | null;
}

/** Success shape. `q` (free-text search) is the only accepted query param. */
export interface ContactsSearchResponse {
  contacts: ContactSummary[];
}

/** Error body for all non-2xx statuses (401). */
export interface ContactsErrorResponse {
  error: string;
}
