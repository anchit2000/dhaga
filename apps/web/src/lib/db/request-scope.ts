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
export const getDb = cache(async (): Promise<DhagaDb> => {
  const scopedDb = explicitDb.getStore();
  if (scopedDb) return scopedDb;
  // getCurrentUser() calls next/headers(), which throws outside a real
  // request (the vitest suite calls repo functions directly, with no HTTP
  // request in play) — treat that the same as "no session" and fall back.
  const user = await getCurrentUser().catch(() => null);
  if (user) {
    const scoped = await (await getTenantGate()).scopedDb(user.id);
    if (scoped) {
      after(() => scoped.release());
      return scoped.db;
    }
  }
  return getGlobalDb();
});

/** Runs cacheable work with an explicit tenant instead of reading request APIs. */
export async function withUserDb<T>(userId: string, work: () => Promise<T>): Promise<T> {
  const scoped = await (await getTenantGate()).scopedDb(userId);
  if (!scoped) return explicitDb.run(await getGlobalDb(), work);
  try {
    return await explicitDb.run(scoped.db, work);
  } finally {
    scoped.release();
  }
}
