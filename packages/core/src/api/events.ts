/**
 * Request/response contract for PATCH /api/events/[id] — renames a event.
 * Mobile-callable counterpart to the web's renameEventAction server action
 * (that's a form action, unreachable from non-browser clients); this is what
 * the "Name this event?" prompt after M2 auto event grouping calls.
 * Types only: deep-import this module directly, same as capture.ts.
 */

export interface EventRenameRequest {
  name: string;
}

export interface EventRenameResponse {
  id: string;
  name: string;
}

/** Error body for all non-2xx statuses (400/401/404). */
export interface EventErrorResponse {
  error: string;
}
