import type { McpServer } from "@modelcontextprotocol/server";
import { registerSearchTools } from "./search";
import { registerFollowUpTools } from "./follow-ups";

/**
 * The read half of the MCP surface. Every handler resolves the user from the
 * verified token and runs its reads inside a single `withUserDb` scope — never
 * a fan-out, because the tenant pool caps at three.
 *
 * Deliberately no AI tool here: the connected client is already a model, so it
 * gets retrieval with receipts and reasons itself — no AI credits are spent.
 *
 * Split per the 150-line rule: ./search (dhaga_search, dhaga_list_contacts,
 * dhaga_get_contact) and ./follow-ups (dhaga_list_follow_ups,
 * dhaga_find_warm_path, dhaga_list_upcoming_dates). Import path stays
 * `../reads`.
 */
export function registerReadTools(server: McpServer): void {
  registerSearchTools(server);
  registerFollowUpTools(server);
}
