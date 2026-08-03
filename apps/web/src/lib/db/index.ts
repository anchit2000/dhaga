import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import {
  DB_POOL_CONNECTION_TIMEOUT_MS_DEFAULT,
  DB_POOL_IDLE_TIMEOUT_MS_DEFAULT,
  DB_POOL_MAX_CORE_DEFAULT,
  poolMaxFromEnv,
} from "@/utils/constants/db";
import { withConnectRetry } from "./connect-retry";
import { DDL } from "./ddl";
import { ddlAlreadyApplied, ddlFingerprint, recordDdlApplied } from "./ddl-history";
import { companies, companyAliases, contacts } from "./schema/contacts";
import { entities, nodeTypes, relationshipTypes } from "./schema/entities";
import { eventContacts, events } from "./schema/events";
import { edges, edgeSuggestions, facts, followUps, notes } from "./schema/notes";
import { confirmations } from "./schema/confirmations";
import { embeddings } from "./schema/embeddings";
import { extractionJobs } from "./schema/jobs";
import { signals } from "./schema/signals";
import { calendarConnections } from "./schema/calendar";
import { aiActions, settings, voiceVocab } from "./schema/meta";
import {
  messagingIdentities,
  messagingLinkTokens,
  messagingSessions,
  messagingSessionItems,
} from "./schema/messaging";
import { graphLayouts } from "./schema/graph-layouts";
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
import { oauthApplication, oauthAccessToken, oauthConsent } from "./schema/oidc";

const schema = {
  companies,
  companyAliases,
  contacts,
  events,
  eventContacts,
  nodeTypes,
  entities,
  relationshipTypes,
  notes,
  facts,
  edges,
  edgeSuggestions,
  followUps,
  confirmations,
  embeddings,
  extractionJobs,
  signals,
  calendarConnections,
  aiActions,
  settings,
  voiceVocab,
  messagingIdentities,
  messagingLinkTokens,
  messagingSessions,
  messagingSessionItems,
  graphLayouts,
  cardImages,
  user: authUser,
  session: authSession,
  account: authAccount,
  verification: authVerification,
  apikey: apiKey,
  passkey: authPasskey,
  twoFactor: authTwoFactor,
  // Keys are better-auth's model names, not our table names — the mcp plugin
  // resolves its OAuth tables through the drizzle adapter by these exact keys.
  oauthApplication,
  oauthAccessToken,
  oauthConsent,
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
  // Supabase's session pooler shares a fixed pool_size across ALL warm Vercel
  // instances (~48; see @/utils/constants/db for the full math). This core pool
  // plus the EE tenant pool (packages/ee/src/db/pool.ts, default 3) is the
  // per-instance draw, so keep core + tenant small enough that several instances
  // fit under it — default 2 + 3 = 5/instance. withConnectRetry makes the pool
  // ride out a momentary EMAXCONNSESSION / connect-timeout (a slot frees within
  // ms) instead of 500ing — better-auth's per-request session read runs through
  // this pool via drizzle, so the retry has to live on the pool object. See
  // ./connect-retry.
  store.__dhagaPool ??= withConnectRetry(
    new Pool({
      connectionString,
      max: poolMaxFromEnv(process.env.DB_POOL_MAX_CORE, DB_POOL_MAX_CORE_DEFAULT),
      // No warm floor: let idle backends drain fully so this instance never
      // holds a slot it isn't actively using against the shared pool.
      min: 0,
      connectionTimeoutMillis: poolMaxFromEnv(process.env.DB_POOL_CONNECTION_TIMEOUT_MS, DB_POOL_CONNECTION_TIMEOUT_MS_DEFAULT),
      idleTimeoutMillis: poolMaxFromEnv(process.env.DB_POOL_IDLE_TIMEOUT_MS, DB_POOL_IDLE_TIMEOUT_MS_DEFAULT),
      keepAlive: true, // hold the socket open vs NAT/LB idle reaping (longer idleTimeout)
    }),
  );
  // Re-executing the full idempotent DDL on every cold start costs seconds
  // against a remote database; skip it when this exact text already ran.
  const fingerprint = ddlFingerprint(DDL);
  if (!(await ddlAlreadyApplied(store.__dhagaPool, fingerprint))) {
    await store.__dhagaPool.query(DDL);
    await recordDdlApplied(store.__dhagaPool, fingerprint);
  }
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
  try {
    store.__dhagaClient ??= new PGlite({ dataDir, extensions: { vector, pg_trgm } });
    await store.__dhagaClient.exec(DDL);
  } catch (error) {
    // Confirmed on Vercel: a missing DATABASE_URL falls through to here, and
    // the function filesystem being read-only surfaces as a bare EROFS mkdir
    // crash with no indication of the actual misconfiguration. process.env.VERCEL
    // isn't a reliable signal to pre-empt this (a project can have "Automatically
    // expose System Environment Variables" turned off), so catch the real
    // failure at its source instead of guessing at the hosting environment.
    if (error instanceof Error && (error as NodeJS.ErrnoException).code === "EROFS") {
      throw new Error(
        "Cannot create the embedded database: this filesystem is read-only (typical of serverless hosts like Vercel). Set DATABASE_URL to a hosted Postgres connection string (e.g. Supabase) in your environment variables.",
      );
    }
    throw error;
  }
  store.__dhagaDdl = DDL;
  return drizzlePglite(store.__dhagaClient, { schema });
}

export function getDb(): Promise<DhagaDb> {
  if (!store.__dhagaDb || store.__dhagaDdl !== DDL) {
    const url = process.env.DATABASE_URL;
    store.__dhagaDb = url ? initHosted(url) : initEmbedded();
  }
  return store.__dhagaDb;
}
