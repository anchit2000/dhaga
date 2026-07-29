import type { MicrosoftIdResponse } from "./graph-types";

/**
 * The Graph transport shared by ./read and ./write. Everything here is plumbing:
 * base URL, timeout, auth header. Callers turn a non-ok Response into an error
 * carrying the HTTP status ONLY — event subjects, locations and attendees are
 * third-party PII and must never reach a log line or an error message.
 */

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";
const TIMEOUT_MS = 15_000;

/** Graph answers a missing resource with either; both mean "already gone". */
export const GONE_STATUSES = [404, 410];

export function graphGet(path: string, accessToken: string): Promise<Response> {
  return fetch(`${GRAPH_BASE}${path}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}`, Prefer: 'outlook.timezone="UTC"' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

export function graphSend(
  method: "POST" | "PATCH" | "DELETE",
  path: string,
  accessToken: string,
  payload?: unknown,
): Promise<Response> {
  return fetch(`${GRAPH_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(payload === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: payload === undefined ? undefined : JSON.stringify(payload),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

/** The id Graph echoes back from a create/update, with no other field read. */
export async function readId(response: Response): Promise<string> {
  const body = (await response.json()) as MicrosoftIdResponse;
  return body.id;
}
