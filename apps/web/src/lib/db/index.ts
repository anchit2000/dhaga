import { PGlite } from "@electric-sql/pglite";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { DDL } from "./ddl";
import { companies, contacts } from "./schema/contacts";
import { sessionContacts, sessions } from "./schema/sessions";
import { edges, facts, followUps, notes } from "./schema/notes";
import { aiActions } from "./schema/meta";

const schema = {
  companies,
  contacts,
  sessions,
  sessionContacts,
  notes,
  facts,
  edges,
  followUps,
  aiActions,
};

export type DhagaDb = PgliteDatabase<typeof schema>;

async function init(): Promise<DhagaDb> {
  // Embedded Postgres (PGlite). Swapping to hosted Postgres later means
  // replacing this driver block — the Drizzle schema and queries stay put.
  const dataDir = process.env.DHAGA_DATA_DIR ?? ".dhaga-data";
  const client = new PGlite(dataDir);
  await client.exec(DDL);
  return drizzle(client, { schema });
}

// Cached on globalThis so dev-server HMR doesn't open the data dir twice.
const store = globalThis as unknown as { __dhagaDb?: Promise<DhagaDb> };

export function getDb(): Promise<DhagaDb> {
  store.__dhagaDb ??= init();
  return store.__dhagaDb;
}
