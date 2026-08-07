import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";

export const MAX_FILE_LINES = 150;
export const MAX_OUTPUT_CHARS = 12_000;
export const CODE_EXTENSIONS = new Set([".ts", ".tsx"]);
export const GENERATED_LLMS_FILES = [
  "apps/web/public/llms.txt",
  "apps/web/public/llms-full.txt",
];
export const PR_CHECKLIST = [
  "Pre-PR checklist (confirm each passed on this branch):",
  "1. Typecheck apps/web and each touched package.",
  "2. Run lint with zero errors.",
  "3. Run Vitest serially (`--no-file-parallelism`).",
  "4. Run the production build.",
  "5. Update affected docs; regenerate llms files after content changes.",
  "6. For UI changes, verify light and dark themes at 375px.",
].join("\n");

export function trimmed(value) {
  const text = String(value ?? "").trim();
  return text.length <= MAX_OUTPUT_CHARS
    ? text
    : `${text.slice(0, MAX_OUTPUT_CHARS)}\n... output truncated by hook`;
}

export function unquote(value) {
  if (!value) return null;
  const first = value[0];
  const last = value[value.length - 1];
  return (first === last && (first === '"' || first === "'"))
    ? value.slice(1, -1)
    : value;
}

export function lineCount(content) {
  if (!content) return 0;
  const lines = content.split(/\r\n|\r|\n/);
  if (lines.at(-1) === "") lines.pop();
  return lines.length;
}

export function extension(path) {
  return path.match(/(\.[^.\/]+)$/)?.[1] ?? "";
}

export function isInside(root, path) {
  const result = relative(root, path);
  return result === "" || (!result.startsWith("..") && !isAbsolute(result));
}

export function gitLines(ops, root, args) {
  const output = ops.git(root, args).trim();
  return output ? output.split(/\r?\n/) : [];
}

export function nearestFile(ops, start, root, name) {
  let current = start;
  while (isInside(root, current)) {
    const candidate = join(current, name);
    if (ops.exists(candidate)) return candidate;
    if (current === root) break;
    current = dirname(current);
  }
  return null;
}

export function findDependency(ops, start, root, relativePath) {
  let current = start;
  while (isInside(root, current)) {
    const candidate = join(current, "node_modules", relativePath);
    if (ops.exists(candidate)) return candidate;
    if (current === root) break;
    current = dirname(current);
  }
  return null;
}

export function repoForDirectory(ops, cwd, directory) {
  return ops.root(directory ? resolve(cwd, directory) : cwd);
}

export function stagedFiles(ops, root) {
  return gitLines(ops, root, ["diff", "--cached", "--name-only", "--diff-filter=ACMRD"]);
}

export const systemOps = {
  exists: existsSync,
  read: (path) => readFileSync(path, "utf8"),
  root: (cwd) => execFileSync(
    "git",
    ["-C", cwd, "rev-parse", "--show-toplevel"],
    { encoding: "utf8" },
  ).trim(),
  git: (root, args) => execFileSync(
    "git",
    ["-C", root, ...args],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  ),
  run: (executable, args, cwd) => {
    const result = spawnSync(executable, args, { cwd, encoding: "utf8" });
    return {
      status: result.status ?? 1,
      output: `${result.stdout ?? ""}${result.stderr ?? ""}`,
    };
  },
};
