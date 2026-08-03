import { cache } from "react";
import { AsyncLocalStorage } from "node:async_hooks";
import { after } from "next/server";
import { getCurrentUser } from "@/lib/auth/guard";
import { getTenantGate } from "@/lib/hosted/gate";
import { getDb as getGlobalDb } from "./index";
import type { DhagaDb } from "./index";

/** An open tenant scope plus WHOSE it is. The owner is not decoration: it is
 *  what lets a caller prove a connection already in hand belongs to the tenant
 *  it wants to read as, and so may be reused instead of checking out a second
 *  one — see requestScopedDbForUser. */
interface ExplicitScope {
  db: DhagaDb;
  userId: string;
}

const explicitDb = new AsyncLocalStorage<ExplicitScope>();

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
  const scope = explicitDb.getStore();
  if (scope) return scope.db;
  return getRequestScopedDb();
}

/**
 * The tenant connection this request ALREADY has open for `userId`, or null when
 * this request isn't that user's (a cron sweep, a job, a unit test, or a scope
 * belonging to a different tenant).
 *
 * Why it exists: the tenant pool caps at 3 (packages/ee), and a request that
 * opens a SECOND checkout of its own — the shape `unstable_cache(() =>
 * withUserDb(...))` had — needs two of those three slots, so three concurrent
 * cold requests can wait out the whole acquire timeout. Callers use this to run
 * on the connection already in hand instead.
 *
 * It hands back a connection ONLY when the tenant is provably the same: an
 * explicit scope must name the same user, and otherwise the session must. That
 * check is the isolation boundary — reusing a connection scoped to someone else
 * would run the read as the wrong tenant.
 *
 * Call it from render/route-handler context, never from inside an
 * `unstable_cache` callback: it reads the session (headers), which is
 * unsupported inside a cache scope.
 */
export async function requestScopedDbForUser(userId: string): Promise<DhagaDb | null> {
  const scope = explicitDb.getStore();
  if (scope) return scope.userId === userId ? scope.db : null;
  const user = await getCurrentUser().catch(() => null);
  if (!user || user.id !== userId) return null;
  // Memoized, so this JOINS the connection the render already pinned (or pins
  // the one it is about to need) — it can never be a second checkout.
  return getRequestScopedDb();
}

/** Run `work` with a connection the caller ALREADY holds as the active scope for
 *  `userId`, so every getDb() inside resolves to it. Opens and releases nothing:
 *  pair it with requestScopedDbForUser, which is the only thing allowed to
 *  decide that a connection is that user's. */
export function withScopedDb<T>(db: DhagaDb, userId: string, work: () => Promise<T>): Promise<T> {
  return explicitDb.run({ db, userId }, work);
}

/** Runs cacheable work with an explicit tenant instead of reading request APIs.
 *  The work runs inside ONE tenant transaction (scoped.run) whose transaction-
 *  local GUC self-clears at COMMIT — so the same code is correct on the session
 *  pooler (5432) and the transaction pooler (6543). Public signature unchanged;
 *  only the internals moved from a session-scoped connection to a transaction. */
export async function withUserDb<T>(userId: string, work: () => Promise<T>): Promise<T> {
  const scoped = await (await getTenantGate()).scopedDb(userId);
  if (!scoped) return explicitDb.run({ db: await getGlobalDb(), userId }, work);
  try {
    // scoped.run opens the transaction + sets the tenant GUC; we put the
    // transaction-bound db into the ALS so repo getDb() calls resolve to it.
    return await scoped.run((txDb) => explicitDb.run({ db: txDb, userId }, work));
  } finally {
    await scoped.release();
  }
}
