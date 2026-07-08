/**
 * Request/response contract for PATCH /api/sessions/[id] — renames a session.
 * Mobile-callable counterpart to the web's renameSessionAction server action
 * (that's a form action, unreachable from non-browser clients); this is what
 * the "Name this event?" prompt after M2 auto event grouping calls.
 * Types only: deep-import this module directly, same as capture.ts.
 */

export interface SessionRenameRequest {
  name: string;
}

export interface SessionRenameResponse {
  id: string;
  name: string;
}

/** Error body for all non-2xx statuses (400/401/404). */
export interface SessionErrorResponse {
  error: string;
}
