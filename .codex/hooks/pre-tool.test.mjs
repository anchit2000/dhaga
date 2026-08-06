import assert from "node:assert/strict";
import { join } from "node:path";
import test from "node:test";

import { colorViolations, commandIntent } from "./commit-policy.mjs";
import { evaluatePreTool } from "./pre-tool.mjs";
import { fakeOps, fixture, ROOT } from "./test-helpers.mjs";

test("command parsing keeps git -C worktree targets", () => {
  assert.deepEqual(commandIntent("git -C '../work tree' commit -m fix && gh pr create"), {
    commitDirectory: "../work tree",
    pushDirectory: null,
    createsPr: true,
  });
});

test("main branch commits are deterministically denied", () => {
  const output = evaluatePreTool(fixture("pre-tool-commit.json"), fakeOps({ branch: "main" }));
  assert.equal(output.hookSpecificOutput.permissionDecision, "deny");
  assert.match(output.hookSpecificOutput.permissionDecisionReason, /directly on main/);
});

test("source-without-docs and PR checklist are advisory, never unsupported ask", () => {
  const payload = fixture("pre-tool-commit.json");
  payload.tool_input.command += " && gh pr create";
  const output = evaluatePreTool(payload, fakeOps({ staged: "apps/web/src/example.ts" }));
  assert.equal(output.hookSpecificOutput.permissionDecision, undefined);
  assert.match(output.hookSpecificOutput.additionalContext, /Rule 13/);
  assert.match(output.hookSpecificOutput.additionalContext, /Pre-PR checklist/);
});

test("staged palette bypasses are deterministically denied", () => {
  const path = join(ROOT, "apps/web/src/example.tsx");
  const output = evaluatePreTool(
    fixture("pre-tool-commit.json"),
    fakeOps({
      staged: "apps/web/src/example.tsx",
      files: { [path]: "export const Bad = () => <p className=\"text-red-400\">bad</p>;" },
    }),
  );
  assert.equal(output.hookSpecificOutput.permissionDecision, "deny");
  assert.match(output.hookSpecificOutput.permissionDecisionReason, /text-red-400/);
});

test("content commits regenerate and deny when generated llms files changed", () => {
  const generator = join(ROOT, "apps/web/scripts/generate-llms-txt.mjs");
  const output = evaluatePreTool(
    fixture("pre-tool-commit.json"),
    fakeOps({
      staged: "apps/web/content/docs/guide/example.mdx",
      stale: "apps/web/public/llms.txt",
      files: { [generator]: "// fixture" },
    }),
  );
  assert.equal(output.hookSpecificOutput.permissionDecision, "deny");
  assert.match(output.hookSpecificOutput.permissionDecisionReason, /have been regenerated/);
});

test("push is denied when the automatic typecheck or lint gate fails", () => {
  const web = join(ROOT, "apps/web");
  const tsc = join(web, "node_modules/typescript/bin/tsc");
  const eslint = join(web, "node_modules/eslint/bin/eslint.js");
  const output = evaluatePreTool(
    { cwd: ROOT, tool_input: { command: "git push origin HEAD" } },
    fakeOps({
      files: { [web]: "", [tsc]: "", [eslint]: "" },
      run: { status: 1, output: "fixture failure" },
    }),
  );
  assert.equal(output.hookSpecificOutput.permissionDecision, "deny");
  assert.match(output.hookSpecificOutput.permissionDecisionReason, /TYPECHECK FAILED/);
  assert.match(output.hookSpecificOutput.permissionDecisionReason, /LINT FAILED/);
});

test("semantic amber variants are accepted while text-amber is rejected", () => {
  const violations = colorViolations([
    { path: "ok.tsx", content: 'const a = "text-amber-lift";' },
    { path: "bad.tsx", content: 'const b = "text-amber";' },
  ]);
  assert.equal(violations.length, 1);
  assert.match(violations[0], /bad\.tsx/);
});
