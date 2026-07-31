import { fetchWithSyncRetry } from "../http";

/** Microsoft Graph transport: auth header, JSON, and the shared bounded retry. */

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

/**
 * One Graph call. `url` may be absolute, because Graph hands back whole URLs
 * for `@odata.nextLink` and `@odata.deltaLink` rather than tokens to splice in.
 *
 * The error label carries the method and nothing else: a deltaLink URL embeds
 * the resume token, and the response body can quote the user's contacts.
 */
export async function callGraph<T>(
  accessToken: string,
  url: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetchWithSyncRetry(
    url.startsWith("http") ? url : `${GRAPH_BASE}${url}`,
    {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
    },
    `Microsoft Graph ${init.method ?? "GET"}`,
  );
  // DELETE and some PATCHes answer 204 with no body.
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}
