import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { DDL } from "./ddl";
import { companies, contacts } from "./schema/contacts";
import { eventContacts, events } from "./schema/events";
import { edges, facts, followUps, notes } from "./schema/notes";
import { embeddings } from "./schema/embeddings";
import { signals } from "./schema/signals";
import { aiActions, settings } from "./schema/meta";
import { cardImages } from "./schema/card-images";
import {
  authAccount,
  authPasskey,
  authSession,
  authTwoFactor,
  authUser,
  authVerification,
} from "./schema/auth";
import { apiKey } from "./schema/api-key";

const schema = {
  companies,
  contacts,
  events,
  eventContacts,
  notes,
  facts,
  edges,
  followUps,
  embeddings,
  signals,
  aiActions,
  settings,
  cardImages,
  user: authUser,
  session: authSession,
  account: authAccount,
  verification: authVerification,
  apikey: apiKey,
  passkey: authPasskey,
  twoFactor: authTwoFactor,
};

/** Driver-agnostic handle: hosted Postgres and embedded PGlite both satisfy it. */
export type DhagaDb = PgDatabase<PgQueryResultHKT, typeof schema>;

// Cached on globalThis so dev-server HMR doesn't open the data dir twice.
// The applied-DDL text is tracked so schema changes re-run the idempotent
// DDL on the live instance instead of waiting for a process restart.
const store = globalThis as unknown as {
  __dhagaClient?: PGlite;
  __dhagaPool?: Pool;
  __dhagaDb?: Promise<DhagaDb>;
  __dhagaDdl?: string;
};

/** Hosted Postgres (Neon/Supabase/self-hosted) — required on serverless hosts. */
async function initHosted(connectionString: string): Promise<DhagaDb> {
  store.__dhagaPool ??= new Pool({ connectionString, max: 5 });
  await store.__dhagaPool.query(DDL);
  store.__dhagaDdl = DDL;
  return drizzlePg(store.__dhagaPool, { schema });
}

/** Embedded Postgres (PGlite) — local-first default, zero setup. */
async function initEmbedded(): Promise<DhagaDb> {
  const dataDir = process.env.DHAGA_DATA_DIR ?? ".dhaga-data";
  // A schema change may also mean a new extension; extensions only load at
  // construction, so close and recreate the client rather than reuse it.
  if (store.__dhagaClient && store.__dhagaDdl !== DDL) {
    await store.__dhagaClient.close().catch(() => undefined);
    store.__dhagaClient = undefined;
  }
  store.__dhagaClient ??= new PGlite({ dataDir, extensions: { vector, pg_trgm } });
  await store.__dhagaClient.exec(DDL);
  store.__dhagaDdl = DDL;
  return drizzlePglite(store.__dhagaClient, { schema });
}

export function getDb(): Promise<DhagaDb> {
  if (!store.__dhagaDb || store.__dhagaDdl !== DDL) {
    const url = process.env.DATABASE_URL;
    // Embedded PGlite needs a writable dataDir; Vercel's function filesystem
    // is read-only, so a missing DATABASE_URL there fails as a confusing
    // EROFS mkdir deep in PGlite's init rather than this actionable message.
    if (!url && process.env.VERCEL) {
      throw new Error(
        "DATABASE_URL is not set. Dhaga's embedded PGlite mode requires a writable filesystem and cannot run on Vercel — set DATABASE_URL to a hosted Postgres connection string (e.g. Supabase) in the project's Environment Variables.",
      );
    }
    store.__dhagaDb = url ? initHosted(url) : initEmbedded();
  }
  return store.__dhagaDb;
}
