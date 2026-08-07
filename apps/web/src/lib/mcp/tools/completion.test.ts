import type { AuthInfo, CallToolResult, McpServer, ToolCallback } from "@modelcontextprotocol/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerWriteTools } from "./writes";

const mockSetFollowUpStatus = vi.fn();
vi.mock("@/lib/repo/notes", () => ({
  addNote: vi.fn(),
  setFollowUpStatus: (...args: unknown[]) => mockSetFollowUpStatus(...args),
}));
vi.mock("@/lib/db/request-scope", () => ({
  withUserDb: async <T>(_userId: string, work: () => Promise<T>) => work(),
}));

function closeCallback(): ToolCallback<never> {
  let callback: ToolCallback<never> | undefined;
  const recorder = {
    registerTool(name: string, _config: unknown, cb: ToolCallback<never>) {
      if (name === "dhaga_close_follow_up") callback = cb;
    },
  };
  registerWriteTools(recorder as unknown as McpServer);
  if (!callback) throw new Error("close tool is not registered");
  return callback;
}

function context(): { http: { authInfo: AuthInfo } } {
  return {
    http: { authInfo: { token: "t", clientId: "c", scopes: [], extra: { userId: "user-a" } } },
  };
}

async function close(args: object): Promise<CallToolResult> {
  const invoke = closeCallback() as unknown as (...args: unknown[]) => Promise<CallToolResult>;
  return invoke(args, context());
}

beforeEach(() => {
  mockSetFollowUpStatus.mockReset().mockResolvedValue({ advancedTo: null, changed: true });
});

describe("MCP recurring completion", () => {
  it("reports a stale occurrence as a tool error and propagates its expected date", async () => {
    mockSetFollowUpStatus.mockResolvedValue({
      advancedTo: new Date("2026-08-14T00:00:00Z"),
      changed: false,
    });
    const result = await close({
      followUpId: "fu-1", status: "done", expectedDueDate: "2026-08-07",
    });
    expect(result.isError).toBe(true);
    expect(mockSetFollowUpStatus).toHaveBeenCalledWith(
      "fu-1", "done", new Date("2026-08-07T00:00:00Z"),
    );
  });

  it("returns an explicit changed flag after a successful completion", async () => {
    const result = await close({
      followUpId: "fu-1", status: "done", expectedDueDate: "2026-08-07",
    });
    const block = result.content.find((item) => item.type === "text");
    expect(block?.type === "text" ? JSON.parse(block.text) : null).toMatchObject({
      followUpId: "fu-1", status: "done", changed: true,
    });
  });
});
