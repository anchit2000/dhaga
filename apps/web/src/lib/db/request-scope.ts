import { cache } from "react";
import { after } from "next/server";
import { getCurrentUser } from "@/lib/auth/guard";
import { getTenantGate } from "@/lib/hosted/gate";
import { getDb as getGlobalDb } from "./index";
import type { DhagaDb } from "./index";

/**
 * The `getDb` every repo function under lib/repo/* should import. Resolves
 * to an EE-provided, RLS-scoped connection when hosted and logged in;
 * otherwise falls back to the plain global connection (self-host default,
 * and the pre-account behavior this app always had). Repo query code never
 * needs to know which case it's in — see the open-core boundary note in
 * lib/hosted/gate.ts.
 */
export const getDb = cache(async (): Promise<DhagaDb> => {
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
