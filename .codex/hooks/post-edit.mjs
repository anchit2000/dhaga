import { dirname, isAbsolute, resolve } from "node:path";

import {
  CODE_EXTENSIONS,
  extension,
  findDependency,
  isInside,
  lineCount,
  MAX_FILE_LINES,
  nearestFile,
  trimmed,
} from "./common.mjs";

export function extractPatchPaths(command) {
  const paths = new Set();
  let match;
  const header = /^\*\*\* (?:Add|Update|Delete) File: (.+)$/gm;
  while ((match = header.exec(command)) !== null) paths.add(match[1].trim());
  const moved = /^\*\*\* Move to: (.+)$/gm;
  while ((match = moved.exec(command)) !== null) paths.add(match[1].trim());
  return [...paths];
}

function editedFiles(payload, ops, root) {
  const cwd = payload.cwd || process.cwd();
  return extractPatchPaths(String(payload.tool_input?.command ?? ""))
    .map((path) => isAbsolute(path) ? path : resolve(cwd, path))
    .filter((path) => isInside(root, path))
    .filter((path) => !path.includes("node_modules") && ops.exists(path));
}

function collectConfigs(files, ops, root, advice) {
  const tsconfigs = new Map();
  const lintConfigs = new Map();
  for (const file of files) {
    const count = lineCount(ops.read(file));
    if (count > MAX_FILE_LINES) {
      advice.push(`FILE TOO LONG: ${file} has ${count} lines; split it per CLAUDE.md.`);
    }
    if (!CODE_EXTENSIONS.has(extension(file))) continue;
    const tsconfig = nearestFile(ops, dirname(file), root, "tsconfig.json");
    if (tsconfig) tsconfigs.set(tsconfig, dirname(tsconfig));
    const eslint = nearestFile(ops, dirname(file), root, "eslint.config.mjs");
    if (!eslint) continue;
    const list = lintConfigs.get(eslint) ?? [];
    list.push(file);
    lintConfigs.set(eslint, list);
  }
  return { tsconfigs, lintConfigs };
}

function runTypechecks(configs, ops, root, advice) {
  for (const [tsconfig, directory] of configs) {
    const tsc = findDependency(ops, directory, root, "typescript/bin/tsc");
    if (!tsc) continue;
    const run = ops.run(process.execPath, [tsc, "--noEmit", "-p", tsconfig], directory);
    if (run.status !== 0) advice.push(`TypeScript errors after edit:\n${trimmed(run.output)}`);
  }
}

function runLint(configs, ops, root, advice) {
  for (const [config, files] of configs) {
    const directory = dirname(config);
    const eslint = findDependency(ops, directory, root, "eslint/bin/eslint.js");
    if (!eslint) continue;
    const run = ops.run(process.execPath, [eslint, ...files], directory);
    if (run.status !== 0) advice.push(`ESLint errors after edit:\n${trimmed(run.output)}`);
  }
}

export function evaluatePostEdit(payload, ops) {
  const root = ops.root(payload.cwd || process.cwd());
  const files = editedFiles(payload, ops, root);
  if (!files.length) return null;
  const advice = [];
  const configs = collectConfigs(files, ops, root, advice);
  runTypechecks(configs.tsconfigs, ops, root, advice);
  runLint(configs.lintConfigs, ops, root, advice);
  return advice.length
    ? {
        hookSpecificOutput: {
          hookEventName: "PostToolUse",
          additionalContext: advice.join("\n\n"),
        },
      }
    : null;
}
