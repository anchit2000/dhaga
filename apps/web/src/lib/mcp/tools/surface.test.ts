import type { McpServer, ToolAnnotations } from "@modelcontextprotocol/server";
import { describe, expect, it } from "vitest";
import { registerDhagaTools } from "../index";

/**
 * The MCP tool list is a security boundary, not just an API. Whatever is
 * registered here is callable by third-party software — and by a model that
 * software is steering, which may be reading prompt-injected text out of the
 * user's own notes. These tests exist so widening that surface has to be a
 * deliberate, reviewed act rather than a side effect of adding a helper.
 */

interface Registered {
  name: string;
  annotations: ToolAnnotations | undefined;
}

function registeredTools(): Registered[] {
  const tools: Registered[] = [];
  const recorder = {
    registerTool(name: string, config: { annotations?: ToolAnnotations }) {
      tools.push({ name, annotations: config.annotations });
    },
  };
  registerDhagaTools(recorder as unknown as McpServer);
  return tools;
}

const READ_TOOLS = [
  "dhaga_search",
  "dhaga_list_contacts",
  "dhaga_get_contact",
  "dhaga_list_follow_ups",
  "dhaga_find_warm_path",
  "dhaga_list_upcoming_dates",
];

const WRITE_TOOLS = [
  "dhaga_add_note",
  "dhaga_create_contact",
  "dhaga_create_follow_up",
  "dhaga_close_follow_up",
];

describe("the MCP tool surface", () => {
  it("is exactly the ten tools we intend to expose", () => {
    // A snapshot of the whole surface. Adding a tool without updating this
    // list fails here, which is the point: the diff that widens what a
    // stranger's AI can do to the graph should be impossible to miss.
    expect(registeredTools().map((tool) => tool.name).sort()).toEqual(
      [...READ_TOOLS, ...WRITE_TOOLS].sort(),
    );
  });

  it("exposes no tool that can destroy data", () => {
    // Contact deletion cascades to notes, facts, edges, and embeddings, and
    // merges are not reversible either. Neither belongs behind a token held by
    // software we do not control, however convenient it would be.
    const names = registeredTools().map((tool) => tool.name);
    for (const forbidden of ["delete", "forget", "merge", "bulk", "export", "admin"]) {
      expect(names.filter((name) => name.includes(forbidden))).toEqual([]);
    }
  });

  it("marks every read tool read-only so clients can auto-approve them", () => {
    // Clients gate on readOnlyHint to decide what runs without a confirmation
    // prompt. A read tool missing the hint gets needlessly interrupted; a write
    // tool wrongly carrying it gets silently auto-approved, which is the one
    // that actually hurts.
    const byName = new Map(registeredTools().map((tool) => [tool.name, tool.annotations]));
    for (const name of READ_TOOLS) {
      expect(byName.get(name)?.readOnlyHint).toBe(true);
    }
    for (const name of WRITE_TOOLS) {
      expect(byName.get(name)?.readOnlyHint).toBe(false);
    }
  });

  it("declares no write tool destructive, because none of them are", () => {
    // Every write is additive or a status change. If this ever fails, a
    // genuinely destructive operation reached the surface and the second test
    // above should have caught it first.
    const byName = new Map(registeredTools().map((tool) => [tool.name, tool.annotations]));
    for (const name of WRITE_TOOLS) {
      expect(byName.get(name)?.destructiveHint).toBe(false);
    }
  });
});
