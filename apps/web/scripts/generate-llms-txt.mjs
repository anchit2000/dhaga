// Generates public/llms.txt and public/llms-full.txt from the real MDX on disk.
//
//   npm run generate:llms-txt
//
// Both files used to be hand-maintained and went stale within a week (dead
// links, whole content directories missing). They are now derived: URLs come
// from the same rules Fumadocs' `loader()` uses (see src/lib/source.ts and
// src/lib/blog-source.ts), titles/descriptions come from MDX frontmatter, and
// the canonical origin comes from src/utils/constants/site.ts so there is only
// one copy of the domain in the repo.
//
// Output is deterministic: no timestamp is embedded and every list is either a
// literal array or a stable sort over one, so re-running on unchanged content
// is a no-op diff. Verify with two runs and a diff before committing.
//
// These files are how ChatGPT/Claude/Perplexity describe Dhaga to a prospect,
// so they are curated, not dumped:
//
//   * llms.txt sections run by what a reader needs first (Start here →
//     comparisons → product guide → self-hosting → engineering → Optional),
//     not by directory. `## Optional` is used for its spec meaning — those
//     URLs "can be skipped if a shorter context is needed" (llmstxt.org).
//   * llms-full.txt inlines exactly the pages listed outside `## Optional`,
//     in the same order, so a consumer that truncates a long fetch still gets
//     the product rather than the blog. It is ~265 KB / ~66k tokens; the older
//     "inline everything" build was 615 KB and led with 336 KB of SEO posts.
//   * The ~153 generated `/docs/api/**` reference pages are excluded — they are
//     TypeDoc output and would drown the signal. `/docs/api` is linked once.
//
// Curation lists (COMPARISON_POSTS, START_HERE_PAGES, START_ORDER) are asserted
// against the content on disk, so a rename fails the run instead of silently
// dropping a page.

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const WEB_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT_DIR = join(WEB_ROOT, "content");
const PUBLIC_DIR = join(WEB_ROOT, "public");

// ---------------------------------------------------------------------------
// Site constants — read from src/utils/constants/site.ts rather than duplicated
// here. Plain text extraction (not an import) so the script stays runnable on
// any Node without TypeScript stripping. Throws loudly if the shape changes.
// ---------------------------------------------------------------------------

function readSiteConstants() {
  const file = join(WEB_ROOT, "src/utils/constants/site.ts");
  const src = readFileSync(file, "utf8");
  const pick = (name, pattern) => {
    const match = pattern.exec(src);
    if (!match) {
      throw new Error(
        `generate-llms-txt: could not read ${name} from ${file} — update the pattern in readSiteConstants()`,
      );
    }
    return match[1];
  };

  // SITE_DESCRIPTION is written as concatenated string literals; join them.
  const descriptionSource = pick(
    "SITE_DESCRIPTION",
    /export const SITE_DESCRIPTION\s*=([\s\S]*?);/,
  );
  const description = [...descriptionSource.matchAll(/"([^"]*)"/g)]
    .map((m) => m[1])
    .join("");
  if (!description) {
    throw new Error("generate-llms-txt: SITE_DESCRIPTION parsed as empty");
  }

  return {
    // The production fallback, not the env override: these files are committed
    // artifacts describing the public site.
    siteUrl: pick(
      "SITE_URL",
      /NEXT_PUBLIC_SITE_URL\s*\?\?\s*"([^"]+)"/,
    ).replace(/\/+$/, ""),
    siteName: pick("SITE_NAME", /export const SITE_NAME\s*=\s*"([^"]+)"/),
    githubUrl: pick(
      "GITHUB_REPO_URL",
      /export const GITHUB_REPO_URL\s*=\s*"([^"]+)"/,
    ),
    description,
  };
}

// ---------------------------------------------------------------------------
// Frontmatter — YAML-lite. Every MDX file in content/ uses flat `key: value`
// pairs (scalars plus one string array), so a full YAML parser would be a
// dependency for nothing. Anything that isn't a flat pair throws.
// ---------------------------------------------------------------------------

function unquote(value) {
  const trimmed = value.trim();
  if (trimmed.length >= 2) {
    const quote = trimmed[0];
    if ((quote === '"' || quote === "'") && trimmed.endsWith(quote)) {
      return trimmed.slice(1, -1).replaceAll(`\\${quote}`, quote);
    }
  }
  return trimmed;
}

function parseFrontmatter(raw, file) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/.exec(raw);
  if (!match) throw new Error(`generate-llms-txt: no frontmatter in ${file}`);

  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const pair = /^([A-Za-z_][\w-]*):[ \t]*(.*)$/.exec(line);
    if (!pair) {
      throw new Error(
        `generate-llms-txt: unsupported frontmatter line in ${file}: ${line}`,
      );
    }
    const [, key, rawValue] = pair;
    data[key] = rawValue.trim().startsWith("[")
      ? [...rawValue.matchAll(/"([^"]*)"|'([^']*)'/g)].map((m) => m[1] ?? m[2])
      : unquote(rawValue);
  }

  return { data, body: raw.slice(match[0].length) };
}

// ---------------------------------------------------------------------------
// URL derivation — mirrors fumadocs-core's `getSlugs()` + `createGetUrl()`:
// folder segments in parentheses are route groups and drop out, `index` files
// resolve to their folder, everything else is the filename without `.mdx`.
// ---------------------------------------------------------------------------

const ROUTE_GROUP = /^\(.+\)$/;

function toUrl(baseUrl, relativePath) {
  const segments = relativePath.split("/");
  const name = segments.pop().replace(/\.mdx$/, "");
  const slugs = segments
    .filter((segment) => segment.length > 0 && !ROUTE_GROUP.test(segment))
    .map(encodeURI);
  if (name !== "index") slugs.push(encodeURI(name));
  return `/${[...baseUrl.split("/"), ...slugs].filter(Boolean).join("/")}`;
}

// ---------------------------------------------------------------------------
// MDX -> plain markdown. Fenced code is preserved verbatim; outside it, MDX
// comments, ESM imports and custom JSX components are removed. Paired
// components keep their inner prose and their title/caption, which is often the
// point of the block.
// ---------------------------------------------------------------------------

const MDX_COMMENT = /\{\/\*[\s\S]*?\*\/\}/g;
const ESM_IMPORT =
  /^import\s+(?:type\s+)?(?:[\w*{][^\n]*?\s+from\s+)?["'][^"'\n]+["'];?[ \t]*$/gm;
// A self-closing component block, e.g. `<FeatureMatrix ... />`. Never crosses a
// blank line, so a stray `<Foo` in prose can't swallow the rest of the page.
const SELF_CLOSING_BLOCK =
  /^[ \t]*<[A-Z][A-Za-z0-9]*\b(?:[^\n]|\n(?![ \t]*\n))*?\/>[ \t]*$/gm;
// `<Card />` is the only self-closing component carrying navigation the text
// version needs — the index pages are little but Cards. Kept as list items.
const CARD_BLOCK = /^[ \t]*<Card\b(?:[^\n]|\n(?![ \t]*\n))*?\/>[ \t]*$/gm;
const OPEN_TAG = /<([A-Z][A-Za-z0-9]*)\b([^>]*)>/g;
const CLOSE_TAG = /<\/[A-Z][A-Za-z0-9]*\s*>/g;
const INLINE_CODE = /`[^`\n]*`/g;
// Sentinel for parked inline-code spans. Printable, and absent from all MDX.
const codeToken = (i) => `%%dhagacode${i}%%`;
const CODE_TOKEN = /%%dhagacode(\d+)%%/g;

function stripMdx(chunk) {
  // Inline code spans hold things like `ExtractOptions<T>` that look like JSX,
  // so park them before the tag passes and restore them afterwards.
  const spans = [];
  let text = chunk.replace(INLINE_CODE, (span) => {
    spans.push(span);
    return codeToken(spans.length - 1);
  });

  text = text
    .replace(MDX_COMMENT, "")
    .replace(ESM_IMPORT, "")
    .replace(CARD_BLOCK, (block) => {
      const attribute = (name) =>
        new RegExp(`\\b${name}="([^"]*)"`).exec(block)?.[1] ?? "";
      const title = attribute("title");
      if (!title) return "";
      const href = attribute("href");
      const description = attribute("description");
      return `- ${href ? `[${title}](${href})` : title}${description ? `: ${description}` : ""}`;
    })
    .replace(SELF_CLOSING_BLOCK, "")
    .replace(OPEN_TAG, (_full, _name, attributes) => {
      const label = /\b(?:title|caption)="([^"]*)"/.exec(attributes);
      return label ? `**${label[1]}**\n\n` : "";
    })
    .replace(CLOSE_TAG, "");

  return text.replace(CODE_TOKEN, (_full, i) => spans[Number(i)]);
}

const FENCE = /^[ \t]*(`{3,}|~{3,})/;

function mdxToMarkdown(body) {
  const out = [];
  let prose = [];
  let fence = null;

  const flush = () => {
    if (prose.length) out.push(stripMdx(prose.join("\n")));
    prose = [];
  };

  for (const line of body.split(/\r?\n/)) {
    const marker = FENCE.exec(line);
    if (fence) {
      out.push(line);
      if (marker && line.trim().startsWith(fence)) fence = null;
      continue;
    }
    if (marker) {
      flush();
      fence = marker[1];
      out.push(line);
      continue;
    }
    prose.push(line);
  }
  flush();

  return out
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ---------------------------------------------------------------------------
// Page collection
// ---------------------------------------------------------------------------

function listMdx(dir, prefix = "") {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...listMdx(join(dir, entry.name), relative));
    } else if (entry.name.endsWith(".mdx")) {
      files.push(relative);
    }
  }
  return files;
}

const byUrl = (a, b) => (a.url < b.url ? -1 : a.url > b.url ? 1 : 0);

function collectPages(contentSubdir, baseUrl, exclude = () => false) {
  const root = join(CONTENT_DIR, contentSubdir);
  return listMdx(root)
    .filter((relative) => !exclude(relative))
    .map((relative) => {
      const file = join(root, relative);
      const { data, body } = parseFrontmatter(readFileSync(file, "utf8"), file);
      if (!data.title)
        throw new Error(`generate-llms-txt: no title in ${file}`);
      return {
        url: toUrl(baseUrl, relative),
        title: data.title,
        description: data.description ?? "",
        date: data.date ?? "",
        markdown: mdxToMarkdown(body),
      };
    })
    .sort(byUrl);
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

const site = readSiteConstants();
const abs = (path) => `${site.siteUrl}${path}`;
// The two files this script writes — also the two paths it is allowed to link
// to without finding a page component on disk.
const OUTPUT_NAMES = ["llms.txt", "llms-full.txt"];
const summary = `${site.description} Open-core: the whole CRM is AGPL and runs fully self-hosted, with a source-available cloud tier.`;

// The llms.txt spec allows "zero or more markdown sections ... of any type
// except headings" between the blockquote and the first H2. That prose is the
// only place in the file that can carry positioning — who this is for, how it
// differs, what it costs — so it is not left empty. Every claim here must stay
// true; these files are how an assistant describes Dhaga to a prospect.
const positioning = [
  `Dhaga (धागा — Hindi for "thread") is built for people whose work *is* their network: founders, investors, recruiters, real-estate and financial advisors, consultants, community builders. Scan a business card, paste an email, forward a WhatsApp or Telegram voice note, dictate into the browser, clip a page with the extension, or import an address book — Dhaga extracts the people, companies and facts, files them in a private knowledge graph, and answers questions like "who do I know at a fintech in Bangalore?" in plain language. Every AI-derived fact keeps a receipt back to the note it came from, so you can verify it or delete it.`,
  `What separates it from Dex, Monica or a notes app: the whole CRM is AGPL-licensed and self-hostable, every external dependency (LLM, web search, embeddings, vector store, messaging) sits behind a swappable provider gateway so you can point it at a local model or your own API key, enrichment only ever runs when you ask for it, and full export always works. The free tier is a complete CRM at $0 forever with unlimited capture and notes; cloud AI is the paid feature, from $8/month billed yearly. Start free at ${abs("/signup")}.`,
];

// The spec reserves H2 sections for file lists only — "how to interpret the
// provided files" belongs in this pre-H2 prose, not inside `## Optional`, so a
// strict parser still sees clean lists. Emitted after the positioning above so
// the first 200 words stay product, not metadata.
const readerNote = `Sections run in order of what a reader needs first, not by directory. \`## Optional\` carries its llms.txt meaning — those URLs are secondary and can be skipped when context is tight: SEO/how-to guides, the per-profession landing pages (each restates the same product for a different job), and internal engineering documents that change weekly. Everything outside \`## Optional\` is inlined in full at ${abs("/llms-full.txt")}.`;

// ---------------------------------------------------------------------------
// Curation
//
// Sections are ordered by what a reader most needs first, not by directory
// layout. `Optional` is load-bearing, not a leftovers bin: llmstxt.org gives
// that exact heading a machine-readable meaning — "the URLs provided there can
// be skipped if a shorter context is needed" — so it is also, by definition,
// the set whose full text llms-full.txt leaves out.
// ---------------------------------------------------------------------------

const SECTIONS = [
  ["start", "Start here"],
  ["compare", "How Dhaga compares"],
  ["guide", "Using Dhaga"],
  ["selfhost", "Self-hosting, extending & contributing"],
  ["engineering", "Engineering deep dives"],
  ["optional", "Optional"],
];

// Highest commercial intent on the whole site: these are the pages a prospect
// is actually asking an assistant about ("is Dhaga better than Monica?"), so
// they get a labelled section instead of being buried alphabetically in a
// 37-item blog list.
const COMPARISON_POSTS = [
  "/blog/guides/dhaga-vs-dex",
  "/blog/guides/dhaga-vs-louisa",
  "/blog/guides/dhaga-vs-monica",
  "/blog/guides/dhaga-vs-openvc",
  "/blog/guides/dhaga-vs-yourpond",
  "/blog/guides/personal-crm-vs-linkedin",
];

// Pulled out of their directories into `Start here` by hand.
const START_HERE_PAGES = [
  "/docs",
  "/blog/general/why-i-built-dhaga",
  "/docs/roadmap/roadmap",
];

// `Start here` is the one section whose first five lines decide what an
// assistant says about Dhaga, so it is hand-ordered by intent (what is it →
// what does it cost → how do I start) instead of sorted by URL. Every item
// routed to the section must appear here or the build fails.
const START_ORDER = [
  "/",
  "/docs",
  "/#pricing",
  "/signup",
  "/#faq",
  "/blog/general/why-i-built-dhaga",
  "/docs/roadmap/roadmap",
  "/privacy",
  site.githubUrl,
  "/llms-full.txt",
];

function sectionOf(url) {
  if (START_HERE_PAGES.includes(url)) return "start";
  if (COMPARISON_POSTS.includes(url)) return "compare";
  if (url === "/docs/guide" || url.startsWith("/docs/guide/")) return "guide";
  if (
    url === "/docs/contributing" ||
    url.startsWith("/docs/extending") ||
    url.startsWith("/docs/self-hosting")
  ) {
    return "selfhost";
  }
  if (url === "/blog/engineering" || url.startsWith("/blog/engineering/")) {
    return "engineering";
  }
  // Everything else — the per-profession pages, the general networking guides,
  // and the internal roadmap/BRD/test-plan docs — is secondary by design.
  return "optional";
}

// Non-MDX entries. `full: false` keeps a link out of llms-full.txt (it has no
// markdown body to inline); `href` overrides the derived absolute URL.
const EXTRA_ENTRIES = [
  {
    section: "start",
    url: "/",
    title: "Dhaga — home",
    description:
      "The fastest read on what Dhaga is: the problem, a 60-second explainer, a live knowledge-graph sandbox you can drag around, the comparison table, pricing and FAQ.",
    full: false,
  },
  {
    section: "start",
    url: "/#pricing",
    title: "Pricing",
    description:
      "Free forever for the full manual CRM (unlimited capture, notes and export, self-host everything). Cloud AI is the paid tier: Pro $8/month billed yearly, or $79/year at the founding price. Annual billing only — no monthly meter.",
    full: false,
    anchor: "pricing",
  },
  {
    section: "start",
    url: "/signup",
    title: "Sign up (free)",
    description:
      "Create a free account — no credit card, and the free tier is a complete CRM rather than a trial.",
    full: false,
  },
  {
    section: "start",
    url: "/#faq",
    title: "FAQ",
    description:
      "Straight answers on data privacy, what happens if Dhaga shuts down, how AI metering works, and mobile status (a native iOS/Android app is on the roadmap and not shipped — capture from a phone today goes through the web app or the WhatsApp/Telegram bot).",
    full: false,
    anchor: "faq",
  },
  {
    section: "start",
    url: "/privacy",
    title: "Privacy policy",
    description:
      "What Dhaga stores, what it never collects, and how contact data — which is the user's data about third parties — is deleted and exported.",
    full: false,
  },
  {
    section: "start",
    title: "Source code (GitHub)",
    href: site.githubUrl,
    description:
      "The AGPL-licensed core. Self-hosting needs nothing from the source-available cloud package.",
    full: false,
  },
  {
    section: "start",
    url: "/llms-full.txt",
    title: "Full text of the pages above",
    description:
      "One file containing the complete markdown of every page listed outside `## Optional`, in this same order — fetch it instead of crawling if you want the whole product in one request.",
    full: false,
  },
  {
    section: "compare",
    url: "/#compare",
    title: "Comparison table",
    description:
      "Dhaga against the alternatives at a glance — spreadsheets, LinkedIn, sales CRMs, and the other personal CRMs.",
    full: false,
    anchor: "compare",
  },
  {
    section: "selfhost",
    url: "/docs/api",
    title: "API reference",
    description:
      "Generated TypeDoc reference for the shared @dhaga/core package — LLM, search and messaging gateway contracts, prompt builders, and types. Excluded from llms-full.txt (~153 generated pages); browse it on the site.",
    full: false,
  },
  {
    section: "optional",
    url: "/login",
    title: "Log in",
    description: "Sign in to an existing Dhaga workspace.",
    full: false,
  },
];

const docsPages = collectPages("docs", "/docs", (relative) =>
  relative.startsWith("api/"),
);
const blogPages = collectPages("blog", "/blog");
const mdxPages = [...docsPages, ...blogPages].sort(byUrl);

// ---------------------------------------------------------------------------
// Curation invariants. A rename or a new content file must never silently drop
// a page out of the index or leave a curated list pointing at nothing.
// ---------------------------------------------------------------------------

function assertCuration() {
  const urls = new Set(mdxPages.map((page) => page.url));
  for (const url of [...COMPARISON_POSTS, ...START_HERE_PAGES]) {
    if (!urls.has(url)) {
      throw new Error(
        `generate-llms-txt: curated URL ${url} has no content file — fix the list in scripts/generate-llms-txt.mjs`,
      );
    }
  }

  // Landing-page anchors are the highest-intent links in the file and they are
  // section ids in components, not routes, so nothing else would catch their
  // removal. Verify the id exists and the section is still rendered.
  const landing = readFileSync(join(WEB_ROOT, "src/app/page.tsx"), "utf8");
  const components = join(WEB_ROOT, "src/components/landing");
  for (const entry of EXTRA_ENTRIES) {
    if (!entry.anchor) continue;
    const rendered = readdirSync(components).some((name) => {
      if (!name.endsWith(".tsx")) return false;
      const source = readFileSync(join(components, name), "utf8");
      if (!source.includes(`id="${entry.anchor}"`)) return false;
      return new RegExp(`<${name.replace(/\.tsx$/, "")}\\b`).test(landing);
    });
    if (!rendered) {
      throw new Error(
        `generate-llms-txt: no landing section renders id="${entry.anchor}" — ${entry.url} would be a dead link`,
      );
    }
  }

  const known = new Set(SECTIONS.map(([id]) => id));
  for (const entry of EXTRA_ENTRIES) {
    if (!known.has(entry.section)) {
      throw new Error(
        `generate-llms-txt: entry ${entry.title} targets unknown section ${entry.section}`,
      );
    }
    if (entry.href) continue;
    if (!entry.url) {
      throw new Error(`generate-llms-txt: entry ${entry.title} has no URL`);
    }
    // Every emitted path must resolve to something real: an App Router page,
    // a docs route backed by MDX, or a file this script itself writes.
    const path = entry.url.replace(/#.*$/, "") || "/";
    if (OUTPUT_NAMES.includes(path.slice(1))) continue;
    const target = path.startsWith("/docs")
      ? join(CONTENT_DIR, `docs${path.slice("/docs".length)}/index.mdx`)
      : join(WEB_ROOT, "src/app", path, "page.tsx");
    if (!existsSync(target)) {
      throw new Error(
        `generate-llms-txt: ${entry.url} has no page on disk (looked for ${target})`,
      );
    }
  }
}

assertCuration();

// ---------------------------------------------------------------------------
// Section assembly
// ---------------------------------------------------------------------------

// Curated non-MDX entries lead their section, MDX pages follow in URL order —
// except `Start here`, which follows START_ORDER. Deterministic: no timestamps,
// and every list is either a literal array or a stable sort over one.
function itemsFor(sectionId) {
  const extras = EXTRA_ENTRIES.filter((entry) => entry.section === sectionId);
  const pages = mdxPages.filter((page) => sectionOf(page.url) === sectionId);
  if (sectionId !== "start") return [...extras, ...pages];

  const rank = (entry) => {
    const index = START_ORDER.indexOf(entry.href ?? entry.url);
    if (index < 0) {
      throw new Error(
        `generate-llms-txt: ${entry.href ?? entry.url} lands in "Start here" but is missing from START_ORDER`,
      );
    }
    return index;
  };
  return [...extras, ...pages].sort((a, b) => rank(a) - rank(b));
}

const link = (entry) =>
  `- [${entry.title}](${entry.href ?? abs(entry.url)})${entry.description ? `: ${entry.description}` : ""}`;

function renderIndex() {
  const lines = [
    `# ${site.siteName}`,
    "",
    `> ${summary}`,
    "",
    ...[...positioning, readerNote].flatMap((paragraph) => [paragraph, ""]),
  ];
  for (const [id, heading] of SECTIONS) {
    const items = itemsFor(id);
    if (!items.length) continue;
    lines.push(`## ${heading}`, "", ...items.map(link), "");
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

// Documents inlined in llms-full.txt, in section order — so a consumer that
// truncates a long fetch still gets the product, not the blog. The previous
// build sorted every page by URL, which put 336 KB of blog posts ahead of the
// first line of documentation.
const fullTextSections = SECTIONS.filter(([id]) => id !== "optional");
const fullTextPages = fullTextSections.flatMap(([id]) =>
  itemsFor(id).filter((entry) => entry.full !== false),
);

function renderFull() {
  const excluded = mdxPages.length - fullTextPages.length;
  const header = [
    `# ${site.siteName}`,
    "",
    `> ${summary}`,
    "",
    positioning[0],
    "",
    positioning[1],
    "",
    `Complete markdown of the ${fullTextPages.length} pages that answer what Dhaga is, what it does, how it compares, and how to run it yourself — in the same order as the sections of ${abs("/llms.txt")}: ${fullTextSections.map(([, heading]) => heading.toLowerCase()).join(", then ")}.`,
    "",
    `Deliberately excluded to keep this file inside a single model context: the ~${
      listMdx(join(CONTENT_DIR, "docs/api")).length
    } generated TypeDoc API pages, and the ${excluded} pages listed under \`## Optional\` in ${abs("/llms.txt")} (the internal build checklist, BRD and manual test plan, plus the per-profession and general networking guides). Fetch any of those individually from the index. Source: ${site.githubUrl}`,
  ];

  const documents = fullTextPages.map((page) => {
    const block = [
      "---",
      "",
      `# ${page.title}`,
      "",
      `Source: ${abs(page.url)}`,
    ];
    if (page.date) block.push("", `Published: ${page.date}`);
    if (page.description) block.push("", page.description);
    // Trailing blank line: without it the next `---` would turn this
    // document's last line into a setext heading.
    block.push("", page.markdown, "");
    return block.join("\n");
  });

  return `${[...header, "", ...documents].join("\n").trimEnd()}\n`;
}

for (const [name, contents] of [
  [OUTPUT_NAMES[0], renderIndex()],
  [OUTPUT_NAMES[1], renderFull()],
]) {
  writeFileSync(join(PUBLIC_DIR, name), contents, "utf8");
  console.log(
    `generate-llms-txt: wrote public/${name} (${contents.length.toLocaleString("en-US")} chars)`,
  );
}

const listed = SECTIONS.map(
  ([id, heading]) => `${heading}: ${itemsFor(id).length}`,
).join("; ");
console.log(
  `generate-llms-txt: ${docsPages.length} docs pages + ${blogPages.length} blog pages indexed (${listed}); ${fullTextPages.length} inlined in llms-full.txt; ${
    listMdx(join(CONTENT_DIR, "docs/api")).length
  } generated API pages excluded`,
);
