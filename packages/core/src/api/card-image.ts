/**
 * Contract for GET /api/card-image/[id] — serves a stored card photo (the
 * visual receipt). Types only: deep-import this module directly, same as
 * capture.ts.
 *
 * Success responses are raw image bytes (Content-Type set to the stored
 * mediaType), not JSON, so only the route param and error shape are
 * modeled here.
 */

export interface CardImageParams {
  id: string;
}

/** Error body for all non-2xx statuses (401/404). */
export interface CardImageErrorResponse {
  error: string;
}
