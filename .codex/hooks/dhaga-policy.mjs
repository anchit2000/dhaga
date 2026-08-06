import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { systemOps } from "./common.mjs";
import { evaluatePostEdit } from "./post-edit.mjs";
import { evaluatePreTool } from "./pre-tool.mjs";
import { evaluateStop } from "./stop.mjs";

const SOURCE_FILE = fileURLToPath(import.meta.url);

function dispatch(mode, payload) {
  if (mode === "pre-tool") return evaluatePreTool(payload, systemOps);
  if (mode === "post-edit") return evaluatePostEdit(payload, systemOps);
  if (mode === "stop") return evaluateStop(payload, systemOps);
  throw new Error(`Unknown hook mode: ${mode}`);
}

async function readStdin() {
  let input = "";
  for await (const chunk of process.stdin) input += chunk;
  return input ? JSON.parse(input) : {};
}

async function main() {
  const mode = process.argv[2];
  let payload;
  let hookMode = mode;
  if (mode === "--dry-run") {
    hookMode = process.argv[3];
    const fixture = process.argv[4];
    if (!hookMode || !fixture) {
      throw new Error("Usage: dhaga-policy.mjs --dry-run <mode> <fixture.json>");
    }
    payload = JSON.parse(readFileSync(resolve(fixture), "utf8"));
  } else {
    payload = await readStdin();
  }
  const output = dispatch(hookMode, payload);
  if (output) process.stdout.write(`${JSON.stringify(output)}\n`);
}

if (resolve(process.argv[1] ?? "") === SOURCE_FILE) {
  main().catch((error) => {
    process.stderr.write(`Dhaga hook failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}
