import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Rule 9 tripwire: EVERY server action that mutates the user's data must run its
 * DB work inside ONE scoped connection — `mutation()` (single-phase) or
 * `withUserDb()` (multi-phase / LLM short-scopes). A server action gets no React
 * `cache()` getDb() dedupe, so an UNWRAPPED action opens a fresh tenant-pool
 * connection per getDb() and, under load, exhausts the small tenant pool — the
 * "Something interrupted the save" pool-exhaustion outage this change class
 * fixed (see lib/actions/mutation.ts, lib/db/request-scope.ts).
 *
 * This test fails if a new or edited action skips the scope, so the fan-out
 * can't quietly return. Actions that genuinely do NOT touch our request-scoped
 * getDb() are listed EXEMPT with a reason — a reviewer must consciously add to
 * that list, never skip silently.
 */
const ACTIONS_DIR = fileURLToPath(new URL("../actions", import.meta.url));

const EXEMPT: Record<string, string> = {
  getContactProviderAvailabilityAction: "reads env config only — no DB",
  fetchProviderContactsAction: "OAuth token + provider fetch — no request-scope getDb()",
  searchAction: "read path — a single query plus a reindex deferred to after()",
  createApiKeyAction: "better-auth manages its own DB, not our getDb()",
  deleteApiKeyAction: "better-auth manages its own DB, not our getDb()",
  // EE admin/billing read+write through EE's OWN pool per-query (drizzle(getPool())
  // / openAdminConnection), never the request-scope getDb(). Wrapping them in
  // withUserDb would hold a SECOND concurrent checkout from the small tenant pool
  // across the external Stripe/Resend call — a regression, not a fix.
  approveAccessRequestAction: "EE admin pool per-query (+ Resend after)",
  rejectAccessRequestAction: "EE admin pool per-query (+ Resend after)",
  setUserAdminAction: "EE admin pool per-query",
  setSubscriptionAction: "EE admin pool per-query",
  setAiCreditsAction: "EE admin pool per-query",
  grantAiCreditsAction: "EE admin pool per-query (bypass-RLS grant ledger write)",
  endAiCreditGrantAction: "EE admin pool per-query (bypass-RLS grant ledger write)",
  createCheckoutSessionAction: "EE billing pool per-query (+ Stripe after)",
  createBillingPortalSessionAction: "EE billing pool per-query (+ Stripe after)",
  // Thin action wrappers that delegate to lib/ai (generateBrief /
  // generateFollowUpDraft), which short-scope withUserDb AROUND the LLM call
  // internally (metering read/write in their own scopes, nothing held across the
  // model round-trip). Wrapping the action itself would hold a connection across
  // the LLM — the exact bug the short-scope pattern avoids.
  generateBriefAction: "delegates to lib/ai/brief.ts, which short-scopes DB around the LLM",
  draftFollowUpAction: "delegates to lib/ai/draft.ts, which short-scopes DB around the LLM",
  // Same short-scope reasoning, and the strongest case for it on this list.
  // runContactSync opens its OWN withUserDb per phase (token → reconcile → ack)
  // precisely so no connection is held across the provider HTTP calls, which
  // page an entire address book and can run for many seconds. Wrapping the
  // action would hold one across all of it — the exact pool exhaustion the phase
  // separation exists to prevent.
  runContactSyncAction: "lib/repo/contact-sync/run short-scopes DB around each provider call",
};

function listTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listTsFiles(full));
    else if (entry.name.endsWith(".ts")) out.push(full);
  }
  return out;
}

interface ActionDef {
  name: string;
  body: string;
  file: string;
}

/** Every exported `*Action` (function or const), each body bounded at the next
 *  top-level `export` so a following helper's scope can't be misattributed. */
function extractActions(file: string, source: string): ActionDef[] {
  const defs: ActionDef[] = [];
  const re = /export\s+(?:async\s+function|const)\s+(\w+Action)\b/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source))) {
    const start = match.index;
    const nextExport = source.indexOf("\nexport ", start + 1);
    const end = nextExport === -1 ? source.length : nextExport;
    defs.push({ name: match[1], body: source.slice(start, end), file });
  }
  return defs;
}

describe("every DB-mutating server action runs in one scoped connection", () => {
  const violations: string[] = [];
  for (const file of listTsFiles(ACTIONS_DIR)) {
    const source = readFileSync(file, "utf8");
    for (const def of extractActions(file, source)) {
      if (EXEMPT[def.name]) continue;
      if (!/\b(?:mutation|withUserDb)\s*\(/.test(def.body)) {
        violations.push(`${def.name}  (${file.slice(ACTIONS_DIR.length + 1)})`);
      }
    }
  }

  it("no action skips mutation()/withUserDb (else wrap it, or add to EXEMPT with a reason)", () => {
    expect(
      violations,
      `Unscoped server action(s) — connection fan-out risk:\n  ${violations.join("\n  ")}`,
    ).toEqual([]);
  });
});
