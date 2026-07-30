import { fetchWithSyncRetry } from "../http";

/** People API transport: auth header, JSON, and the shared bounded retry. */

const PEOPLE_BASE = "https://people.googleapis.com/v1";

/**
 * One People API call.
 *
 * The error label drops the query string on purpose. An incremental request
 * carries the syncToken there, and a resume token in an error message is a
 * secret in a log — the same reason the body is never surfaced (it can quote
 * the user's contacts).
 */
export async function callPeople<T>(
  accessToken: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const [route] = path.split("?");
  const response = await fetchWithSyncRetry(
    `${PEOPLE_BASE}${path}`,
    {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
    },
    `Google People ${init.method ?? "GET"} ${route}`,
  );
  return (await response.json()) as T;
}
