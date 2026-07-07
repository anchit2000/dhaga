/**
 * Request/response contract for POST /api/access-requests — the public
 * early-access signup form (Dhaga Cloud only, gated behind `packages/ee`
 * and `DHAGA_HOSTED_MODE`). Types only: deep-import this module directly,
 * same as capture.ts.
 */

/** The only accepted field. */
export interface AccessRequestBody {
  email: string;
}

/** Success shape. Duplicate requests are idempotent, so this is the only
 *  success shape — there's no "already requested" variant. */
export interface AccessRequestResponse {
  ok: true;
}

/** Error body for all non-2xx statuses (400/404). */
export interface AccessRequestErrorResponse {
  error: string;
}
