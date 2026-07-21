// Post-processes the TypeDoc-generated Markdown under content/docs/api so it
// fits the Fumadocs content model:
//   1. Adds `title` frontmatter (Fumadocs renders it as the page H1), derived
//      from TypeDoc's leading "# Kind: Name" heading, which is then removed
//      along with its breadcrumb block to avoid a duplicate title.
//   2. Strips the `.mdx` extension from intra-doc links so they resolve as
//      routes (e.g. `../interfaces/LLMClient.mdx` -> `../interfaces/LLMClient`).
//   3. Writes a `meta.json` for the api folder and each kind subfolder so the
//      sidebar is ordered and nicely titled.
// Deterministic: no timestamps, stable ordering. Run via `npm run docs:api`.

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const API_DIR = join(process.cwd(), "content", "docs", "api");

const KIND_TITLES = {
  classes: "Classes",
  interfaces: "Interfaces",
  "type-aliases": "Type Aliases",
  functions: "Functions",
  variables: "Variables",
  enumerations: "Enumerations",
  modules: "Modules",
};

// Order kinds read most-useful-first in the sidebar.
const KIND_ORDER = [
  "index",
  "interfaces",
  "type-aliases",
  "classes",
  "functions",
  "variables",
  "enumerations",
  "modules",
];

function listMdx(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...listMdx(full));
    else if (entry.endsWith(".mdx")) out.push(full);
  }
  return out;
}

function yamlQuote(value) {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function deriveTitle(lines, fallback) {
  const heading = lines.find((line) => /^#\s+/.test(line));
  if (!heading) return fallback;
  return heading
    .replace(/^#\s+/, "")
    .replace(/^(Function|Interface|Class|Type Alias|Variable|Enumeration|Namespace|Module):\s*/, "")
    .trim();
}

function stripLeadingBlock(content) {
  // Drop everything up to and including the first `# ...` heading (TypeDoc's
  // breadcrumb line + `***` rule + the H1), then leading blank lines.
  const idx = content.search(/^#\s+.*$/m);
  if (idx === -1) return content.trimStart();
  const afterHeading = content.slice(idx).replace(/^#\s+.*$\n?/m, "");
  return afterHeading.replace(/^\s+/, "");
}

function rewriteLinks(content) {
  // Strip the `.mdx` extension from link targets, preserving any #anchor.
  return content.replace(/\]\(([^)]+?)\.mdx(#[^)]*)?\)/g, (_m, path, hash) => `](${path}${hash ?? ""})`);
}

// Escape MDX-significant characters that TypeDoc leaves raw inside JSDoc prose
// (e.g. `{subject}` in a comment becomes a JS expression and crashes the
// render). Only touches text OUTSIDE fenced code blocks and inline `code`
// spans, and never double-escapes an already-escaped char.
function escapeInlineProse(line) {
  return line
    .split(/(`+[^`]*`+)/g)
    .map((part, i) =>
      i % 2 === 1
        ? part
        : part
            .replace(/(?<!\\)\{/g, "\\{")
            .replace(/(?<!\\)\}/g, "\\}")
            .replace(/(?<!\\)</g, "\\<"),
    )
    .join("");
}

function escapeMdxProse(content) {
  let inFence = false;
  let marker = "";
  return content
    .split("\n")
    .map((line) => {
      const fence = line.match(/^\s*(`{3,}|~{3,})/);
      if (fence) {
        const ch = fence[1][0];
        if (!inFence) {
          inFence = true;
          marker = ch;
        } else if (marker === ch) {
          inFence = false;
          marker = "";
        }
        return line;
      }
      return inFence ? line : escapeInlineProse(line);
    })
    .join("\n");
}

const INDEX_FILE = join(API_DIR, "index.mdx");

function processFile(file) {
  const raw = readFileSync(file, "utf8");
  const lines = raw.split("\n");
  const title = file === INDEX_FILE ? "API reference" : deriveTitle(lines, "Reference");
  const body = escapeMdxProse(rewriteLinks(stripLeadingBlock(raw)));
  const frontmatter = `---\ntitle: ${yamlQuote(title)}\n---\n\n`;
  writeFileSync(file, frontmatter + body);
}

function writeMeta(dir, meta) {
  writeFileSync(join(dir, "meta.json"), `${JSON.stringify(meta, null, 2)}\n`);
}

function main() {
  if (!existsSync(API_DIR)) {
    throw new Error(`TypeDoc output not found at ${API_DIR} — run \`typedoc\` first`);
  }
  for (const file of listMdx(API_DIR)) processFile(file);

  const subdirs = readdirSync(API_DIR).filter((entry) => statSync(join(API_DIR, entry)).isDirectory());
  const pages = KIND_ORDER.filter((kind) => kind === "index" || subdirs.includes(kind));
  for (const kind of subdirs) if (!pages.includes(kind)) pages.push(kind);
  writeMeta(API_DIR, { title: "API reference", pages });

  for (const kind of subdirs) {
    writeMeta(join(API_DIR, kind), { title: KIND_TITLES[kind] ?? kind });
  }
}

main();
