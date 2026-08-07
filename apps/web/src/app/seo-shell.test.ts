import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import ts from "typescript";
import robots, { AI_CRAWLER_USER_AGENTS } from "./robots";
import { SITE_URL } from "@/utils/constants/site";
import { PUBLIC_SHELL_PAGES, publicPageMetadata } from "@/utils/public-page-metadata";

const ROOT = process.cwd();

function source(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

function runtimeSources(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return runtimeSources(path);
    if (!/\.(ts|tsx)$/.test(entry.name) || entry.name.includes(".test.")) return [];
    return [readFileSync(path, "utf8")];
  });
}

function importsCoreRuntime(sourceText: string): boolean {
  const parsed = ts.createSourceFile("audit.tsx", sourceText, ts.ScriptTarget.Latest, true);
  return parsed.statements.some((node) => {
    if (!ts.isImportDeclaration(node) || node.moduleSpecifier.getText(parsed) !== '"@dhaga/core"') {
      return false;
    }
    const clause = node.importClause;
    if (!clause || clause.isTypeOnly) return false;
    if (clause.name || (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings))) {
      return true;
    }
    return Boolean(
      clause.namedBindings &&
      ts.isNamedImports(clause.namedBindings) &&
      clause.namedBindings.elements.some((element) => !element.isTypeOnly),
    );
  });
}

function metadataProperty(sourceText: string, name: string): string {
  const parsed = ts.createSourceFile("page.tsx", sourceText, ts.ScriptTarget.Latest, true);
  for (const statement of parsed.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    const declaration = statement.declarationList.declarations.find(
      (item) => ts.isIdentifier(item.name) && item.name.text === "metadata",
    );
    if (!declaration?.initializer || !ts.isObjectLiteralExpression(declaration.initializer)) continue;
    const property = declaration.initializer.properties.find(
      (item) => ts.isPropertyAssignment(item) && item.name.getText(parsed) === name,
    );
    if (property && ts.isPropertyAssignment(property)) return property.initializer.getText(parsed);
  }
  return "";
}

describe("public shell SEO contract", () => {
  it("gives every auth/legal shell unique complete metadata", () => {
    const pages = Object.entries(PUBLIC_SHELL_PAGES);
    expect(new Set(pages.map(([, page]) => page.title)).size).toBe(pages.length);
    for (const [key, page] of pages) {
      const metadata = publicPageMetadata(key as keyof typeof PUBLIC_SHELL_PAGES);
      expect(page.description.length).toBeGreaterThan(60);
      expect(metadata.alternates?.canonical).toBe(`${SITE_URL}${page.path}`);
      expect(metadata.openGraph?.images).toBeTruthy();
      expect(metadata.twitter?.images).toBeTruthy();
    }
  });

  it("explicitly allows major AI agents to public pages only", () => {
    const rules = robots().rules;
    expect(Array.isArray(rules)).toBe(true);
    const groups = Array.isArray(rules) ? rules : [rules];
    const aiGroup = groups.find((rule) => Array.isArray(rule.userAgent));
    expect(aiGroup?.userAgent).toEqual([...AI_CRAWLER_USER_AGENTS]);
    expect(aiGroup?.allow).toBe("/");
    expect(aiGroup?.disallow).toContain("/app");
    expect(aiGroup?.disallow).toContain("/api");
    const disallowed =
      typeof aiGroup?.disallow === "string" ? [aiGroup.disallow] : (aiGroup?.disallow ?? []);
    for (const path of ["/", "/blog", "/docs", "/privacy"]) {
      expect(disallowed.some((blocked) => path.startsWith(blocked))).toBe(false);
    }
  });

  it("keeps audited routes server-rendered with one shell heading", () => {
    const routeFiles = [
      "src/app/page.tsx",
      "src/app/blog/[[...slug]]/page.tsx",
      "src/app/docs/[[...slug]]/page.tsx",
      "src/app/login/page.tsx",
      "src/app/signup/page.tsx",
      "src/app/forgot-password/page.tsx",
      "src/app/reset-password/page.tsx",
      "src/app/auth/error/page.tsx",
      "src/app/privacy/page.tsx",
      "src/app/features/page.tsx",
      "src/app/pricing/page.tsx",
      "src/app/open-source/page.tsx",
      "src/app/product-tour/page.tsx",
    ];
    for (const file of routeFiles) expect(source(file)).not.toMatch(/^\s*["']use client["']/);
    const h1Shells = [
      "src/components/landing/FocusedHome/Hero.tsx",
      "src/components/blog/BlogPageHeader.tsx",
      "src/components/docs/DocsHub.tsx",
      "src/components/landing/OpenSource.tsx",
      ...routeFiles.slice(3).filter((file) => file !== "src/app/open-source/page.tsx"),
    ];
    for (const file of h1Shells) expect(source(file).match(/<h1\b/g)).toHaveLength(1);
  });

  it("keeps route-level Open Graph overrides attached to the shared image", () => {
    const routes = ["features", "pricing", "open-source", "product-tour"];
    for (const route of routes) {
      const page = source(`src/app/${route}/page.tsx`);
      expect(metadataProperty(page, "openGraph")).toContain(
        'images: ["/opengraph-image.png"]',
      );
    }
  });

  it("ships image alternatives without public source maps or a Vite runtime", () => {
    const allRuntime = runtimeSources(join(ROOT, "src")).join("\n");
    const imageTags = allRuntime.match(/<(?:img|Image)\s[\s\S]*?\/>/g) ?? [];
    expect(imageTags.length).toBeGreaterThan(0);
    for (const tag of imageTags) expect(tag).toMatch(/\balt=/);
    expect(allRuntime).not.toMatch(/from\s+["']vite["']|vite\/client|import\.meta\.env/);
    for (const component of runtimeSources(join(ROOT, "src/components"))) {
      expect(importsCoreRuntime(component)).toBe(false);
    }
    expect(source("src/app/layout.tsx")).toContain('lang="en"');
    expect(source("src/components/seo/site-structured-data.tsx")).toContain("application/ld+json");
    expect(existsSync(join(ROOT, "src/app/opengraph-image.png"))).toBe(true);
    expect(source("src/app/app/layout.tsx")).toContain("index: false");
    expect(source("next.config.ts")).not.toContain("productionBrowserSourceMaps: true");
  });
});
