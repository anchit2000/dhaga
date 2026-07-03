import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { DDL } from "./ddl";
import { companies, contacts } from "./schema/contacts";
import { sessionContacts, sessions } from "./schema/sessions";
import { edges, facts, followUps, notes } from "./schema/notes";
import { embeddings } from "./schema/embeddings";
import { aiActions, waitlist } from "./schema/meta";

const schema = {
  companies,
  contacts,
  sessions,
  sessionContacts,
  notes,
  facts,
  edges,
  followUps,
  embeddings,
  aiActions,
  waitlist,
};

export type DhagaDb = PgliteDatabase<typeof schema>;

// Cached on globalThis so dev-server HMR doesn't open the data dir twice.
// The applied-DDL text is tracked so schema changes re-run the idempotent
// DDL on the live instance instead of waiting for a process restart.
const store = globalThis as unknown as {
  __dhagaClient?: PGlite;
  __dhagaDb?: Promise<DhagaDb>;
  __dhagaDdl?: string;
};

async function init(): Promise<DhagaDb> {
  // Embedded Postgres (PGlite). Swapping to hosted Postgres later means
  // replacing this driver block — the Drizzle schema and queries stay put.
  const dataDir = process.env.DHAGA_DATA_DIR ?? ".dhaga-data";
  // A schema change may also mean a new extension; extensions only load at
  // construction, so close and recreate the client rather than reuse it.
  if (store.__dhagaClient && store.__dhagaDdl !== DDL) {
    await store.__dhagaClient.close().catch(() => undefined);
    store.__dhagaClient = undefined;
  }
  store.__dhagaClient ??= new PGlite({ dataDir, extensions: { vector } });
  await store.__dhagaClient.exec(DDL);
  store.__dhagaDdl = DDL;
  return drizzle(store.__dhagaClient, { schema });
}

export function getDb(): Promise<DhagaDb> {
  if (!store.__dhagaDb || store.__dhagaDdl !== DDL) {
    store.__dhagaDb = init();
  }
  return store.__dhagaDb;
}
