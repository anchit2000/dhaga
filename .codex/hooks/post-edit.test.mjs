import assert from "node:assert/strict";
import { join } from "node:path";
import test from "node:test";

import { evaluatePostEdit, extractPatchPaths } from "./post-edit.mjs";
import { evaluateStop } from "./stop.mjs";
import { fakeOps, fixture, ROOT } from "./test-helpers.mjs";

test("fixture extracts every patch target because Codex has no file_path field", () => {
  const payload = fixture("post-edit.json");
  assert.deepEqual(extractPatchPaths(payload.tool_input.command), [
    "apps/web/src/example.ts",
    "apps/web/src/moved.ts",
  ]);
});

test("post-edit feedback applies the universal 150-line rule", () => {
  const path = join(ROOT, "example.md");
  const payload = {
    cwd: ROOT,
    tool_input: { command: "*** Begin Patch\n*** Update File: example.md\n*** End Patch" },
  };
  const output = evaluatePostEdit(
    payload,
    fakeOps({ files: { [path]: Array.from({ length: 151 }, () => "line").join("\n") } }),
  );
  assert.equal(output.hookSpecificOutput.hookEventName, "PostToolUse");
  assert.match(output.hookSpecificOutput.additionalContext, /151 lines/);
});

test("Stop is advisory and reports dirty plus unpushed state", () => {
  const output = evaluateStop(
    { cwd: ROOT },
    fakeOps({ dirty: " M file.ts", ahead: 2 }),
  );
  assert.match(output.systemMessage, /uncommitted changes \+ 2 unpushed commit/);
  assert.equal(output.decision, undefined);
});
