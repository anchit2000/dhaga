import { join } from "node:path";

import {
  findDependency,
  PR_CHECKLIST,
  repoForDirectory,
  trimmed,
} from "./common.mjs";
import { commandIntent, commitChecks } from "./commit-policy.mjs";

function pushChecks(ops, root) {
  const denied = [];
  const advice = [];
  const web = join(root, "apps/web");
  if (!ops.exists(web)) return { denied, advice };
  const tsc = findDependency(ops, web, root, "typescript/bin/tsc");
  const eslint = findDependency(ops, web, root, "eslint/bin/eslint.js");
  if (!tsc || !eslint) {
    advice.push("Pre-push typecheck/lint could not run because dependencies are not installed.");
    return { denied, advice };
  }
  const typecheck = ops.run(process.execPath, [tsc, "--noEmit"], web);
  if (typecheck.status !== 0) denied.push(`TYPECHECK FAILED:\n${trimmed(typecheck.output)}`);
  const lint = ops.run(process.execPath, [eslint, "src"], web);
  if (lint.status !== 0) denied.push(`LINT FAILED:\n${trimmed(lint.output)}`);
  return { denied, advice };
}

function output(denied, advice) {
  if (denied.length) {
    const suffix = advice.length ? `\n\nAdvisory:\n${advice.join("\n")}` : "";
    return {
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: `${denied.join("\n\n")}${suffix}`,
      },
    };
  }
  return advice.length
    ? {
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          additionalContext: advice.join("\n\n"),
        },
      }
    : null;
}

export function evaluatePreTool(payload, ops) {
  const command = String(payload.tool_input?.command ?? "");
  const cwd = payload.cwd || process.cwd();
  const intent = commandIntent(command);
  const denied = [];
  const advice = [];
  if (intent.commitDirectory !== null) {
    const result = commitChecks(ops, repoForDirectory(ops, cwd, intent.commitDirectory));
    denied.push(...result.denied);
    advice.push(...result.advice);
  }
  if (intent.pushDirectory !== null) {
    const result = pushChecks(ops, repoForDirectory(ops, cwd, intent.pushDirectory));
    denied.push(...result.denied);
    advice.push(...result.advice);
  }
  if (intent.createsPr) advice.push(PR_CHECKLIST);
  return output(denied, advice);
}
