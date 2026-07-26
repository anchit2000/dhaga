import { cache } from "react";
import { AsyncLocalStorage } from "node:async_hooks";
import { after } from "next/server";
import { getCurrentUser } from "@/lib/auth/guard";
import { getTenantGate } from "@/lib/hosted/gate";
import { getDb as getGlobalDb } from "./index";
import type { DhagaDb } from "./index";

const explicitDb = new AsyncLocalStorage<DhagaDb>();

/**
 * The `getDb` every repo function under lib/repo/* should import. Resolves
 * to an EE-provided, RLS-scoped connection when hosted and logged in;
 * otherwise falls back to the plain global connection (self-host default,
 * and the pre-account behavior this app always had). Repo query code never
 * needs to know which case it's in — see the open-core boundary note in
 * lib/hosted/gate.ts.
 */
/**
 * The default per-request resolution, memoized so one request pins (and
 * `after()`-releases) a single scoped connection. Only reached when no
 * explicit tenant scope is active — see getDb below.
 */
const getRequestScopedDb = cache(async (): Promise<DhagaDb> => {
  // getCurrentUser() calls next/headers(), which throws outside a real
  // request (the vitest suite calls repo functions directly, with no HTTP
  // request in play) — treat that the same as "no session" and fall back.
  const user = await getCurrentUser().catch(() => null);
  if (user) {
    const scoped = await (await getTenantGate()).scopedDb(user.id);
    if (scoped) {
      // RSC page reads span the whole render with no single callback to wrap in
      // scoped.run(), so open the tenant transaction lazily via begin() and hold
      // it for the request, committing in after() — which Next runs even on a
      // thrown error / notFound / redirect, so the connection is always freed.
      // Every getDb() in the render shares this one transaction, so each read is
      // RLS-scoped on both the session (5432) and transaction (6543) pooler.
      // Invariant: repo reads on this path must not open a top-level
      // db.transaction() (it would close this scope early) — holds today because
      // writes/transactions run under withUserDb (scoped.run), not RSC render.
      const db = await scoped.begin();
      after(() => scoped.release());
      return db;
    }
  }
  return getGlobalDb();
});

export async function getDb(): Promise<DhagaDb> {
  // The explicit-scope check is deliberately OUTSIDE cache(): a single request
  // may open and release several short-lived withUserDb scopes in sequence
  // (the extraction worker does exactly this to keep the DB off the LLM path),
  // and each getDb() call must resolve to the scope active *now*, not the first
  // one a memoized result happened to capture. Only the default (no explicit
  // scope) path is memoized, via getRequestScopedDb.
  const scopedDb = explicitDb.getStore();
  if (scopedDb) return scopedDb;
  return getRequestScopedDb();
}

/** Runs cacheable work with an explicit tenant instead of reading request APIs.
 *  The work runs inside ONE tenant transaction (scoped.run) whose transaction-
 *  local GUC self-clears at COMMIT — so the same code is correct on the session
 *  pooler (5432) and the transaction pooler (6543). Public signature unchanged;
 *  only the internals moved from a session-scoped connection to a transaction. */
export async function withUserDb<T>(userId: string, work: () => Promise<T>): Promise<T> {
  const scoped = await (await getTenantGate()).scopedDb(userId);
  if (!scoped) return explicitDb.run(await getGlobalDb(), work);
  try {
    // scoped.run opens the transaction + sets the tenant GUC; we put the
    // transaction-bound db into the ALS so repo getDb() calls resolve to it.
    return await scoped.run((txDb) => explicitDb.run(txDb, work));
  } finally {
    await scoped.release();
  }
}
