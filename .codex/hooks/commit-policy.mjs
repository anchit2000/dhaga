import { join } from "node:path";

import {
  GENERATED_LLMS_FILES,
  gitLines,
  stagedFiles,
  trimmed,
  unquote,
} from "./common.mjs";

export function commandIntent(command) {
  const gitAction = /\bgit\s+(?:-C\s+((?:"[^"]*"|'[^']*'|\S+))\s+)?(commit|push)\b/g;
  const result = { commitDirectory: null, pushDirectory: null, createsPr: false };
  let match;
  while ((match = gitAction.exec(command)) !== null) {
    if (match[2] === "commit") result.commitDirectory = unquote(match[1]) ?? "";
    if (match[2] === "push") result.pushDirectory = unquote(match[1]) ?? "";
  }
  result.createsPr = /\bgh\s+pr\s+create\b/.test(command);
  return result;
}

export function colorViolations(files) {
  const palette = /(text|bg|border|ring|from|to|via|decoration)-(red|zinc|neutral|gray|slate|stone)-[0-9]/;
  const amberText = /text-amber(?![-a-zA-Z0-9])/;
  const violations = [];
  for (const file of files) {
    file.content.split(/\r?\n/).forEach((line, index) => {
      if (palette.test(line) || amberText.test(line)) {
        violations.push(`  ${file.path}:${index + 1}  ${line.trim()}`);
      }
    });
  }
  return violations;
}

function checkColors(ops, root, staged) {
  const files = staged
    .filter((path) => /\.(ts|tsx)$/.test(path))
    .filter((path) => !/node_modules|__tests__|\/email\/|\/og\/|opengraph|constants\/wrapped/.test(path))
    .filter((path) => ops.exists(join(root, path)))
    .map((path) => ({ path, content: ops.read(join(root, path)) }));
  const violations = colorViolations(files);
  if (!violations.length) return null;
  return [
    "Colour tokens bypassed in staged files. globals.css is the colour source of truth.",
    ...violations,
    "Use semantic tokens; amber text becomes text-ember and errors use text-destructive.",
  ].join("\n");
}

function checkLlmsFiles(ops, root, staged) {
  if (!staged.some((path) => path.startsWith("apps/web/content/"))) return null;
  const web = join(root, "apps/web");
  const generator = join(web, "scripts/generate-llms-txt.mjs");
  if (!ops.exists(generator)) return null;
  const run = ops.run(process.execPath, [generator], web);
  if (run.status !== 0) return `Could not check llms.txt freshness:\n${trimmed(run.output)}`;
  const stale = gitLines(ops, root, ["diff", "--name-only", "--", ...GENERATED_LLMS_FILES]);
  return stale.length
    ? `Generated llms files were stale and have been regenerated. Stage them: ${stale.join(" ")}`
    : null;
}

function docsAdvice(staged) {
  const source = staged.filter(
    (path) => path.startsWith("apps/web/src/") || path.startsWith("packages/"),
  );
  const docs = staged.filter(
    (path) => path.startsWith("docs/") || path.startsWith("apps/web/content/") || /\.mdx?$/.test(path),
  );
  return source.length && !docs.length
    ? `Rule 13: ${source.length} source file(s) are staged without documentation. Proceed only if this is genuinely doc-neutral.`
    : null;
}

export function commitChecks(ops, root) {
  const denied = [];
  const advice = [];
  const branch = ops.git(root, ["rev-parse", "--abbrev-ref", "HEAD"]).trim();
  if (branch === "main" || branch === "master") {
    denied.push(`Refusing to commit directly on ${branch}. Branch from fresh origin/main first.`);
    return { denied, advice };
  }
  const staged = stagedFiles(ops, root);
  const color = checkColors(ops, root, staged);
  const llms = checkLlmsFiles(ops, root, staged);
  const docs = docsAdvice(staged);
  if (color) denied.push(color);
  if (llms) denied.push(llms);
  if (docs) advice.push(docs);
  return { denied, advice };
}
