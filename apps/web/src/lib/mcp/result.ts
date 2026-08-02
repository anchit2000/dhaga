import type { CallToolResult } from "@modelcontextprotocol/server";

/**
 * Renders a tool result as pretty JSON text.
 *
 * MCP clients hand tool output straight to a model, and JSON with explicit ids
 * is what lets the next tool call reference what this one returned. Dates go
 * out as ISO strings via the default `toJSON`, which is what an LLM reasons
 * about most reliably.
 */
export function jsonResult(value: unknown): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] };
}

/**
 * Renders an empty result with a sentence explaining the emptiness.
 *
 * `[]` alone reads to a model as "the tool failed" and invites a retry loop;
 * saying "no contacts match" ends the turn honestly.
 */
export function emptyResult(explanation: string): CallToolResult {
  return { content: [{ type: "text", text: explanation }] };
}

/**
 * Renders a failure the model should see and act on, rather than throwing.
 *
 * Never put an exception message in here verbatim — contact PII and note text
 * must not leak into a client's transcript through an error path.
 */
export function errorResult(message: string): CallToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}
