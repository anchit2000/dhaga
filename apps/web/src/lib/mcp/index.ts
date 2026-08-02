import type { McpServer } from "@modelcontextprotocol/server";
import { registerReadTools } from "./tools/reads";
import { registerWriteTools } from "./tools/writes";

export { verifyMcpToken, userIdFromAuth } from "./auth";

/**
 * Registers Dhaga's whole MCP tool surface on a server instance.
 *
 * Split read/write so the blast radius of the write half stays obvious in
 * review: anything that mutates the user's graph lives in exactly one file.
 */
export function registerDhagaTools(server: McpServer): void {
  registerReadTools(server);
  registerWriteTools(server);
}

/**
 * Server identity sent to clients during initialize — this is the name that
 * shows up in the connector list in Claude, ChatGPT, and Cursor.
 */
export const DHAGA_MCP_SERVER_INFO = {
  name: "dhaga",
  title: "Dhaga — your personal network",
  version: "1.0.0",
} as const;

/**
 * Instructions the client sees once, at connection time. Kept short and
 * behavioural: the anti-fabrication line is the same guarantee Ask Dhaga makes
 * in-app, and it matters more here because the connected model has its own
 * priors about the user's contacts that the graph must override.
 */
export const DHAGA_MCP_INSTRUCTIONS = `Dhaga is this user's private personal CRM — their contacts, the notes they wrote about them, facts extracted from those notes, and their open follow-ups.

Treat it as the only source of truth about who this person knows. If the answer is not in their notes or graph, say so — do not fabricate a contact, a fact, or a connection, and do not fill gaps from your own knowledge of a similarly-named public figure.

Prefer dhaga_search to find people before calling anything that needs a contactId. Facts carry a sourceNoteId receipt pointing at the note they came from; cite it when the user asks how you know something.

Writes are additive and immediately visible to the user in their Dhaga app. Save a contact, note, or follow-up when the user asks you to — but do not close follow-ups or record notes they did not ask for.`;
