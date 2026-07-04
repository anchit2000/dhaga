import type { Pool } from "pg";
import { RLS_DDL } from "./rls-ddl";
import { EE_TABLES_DDL } from "./tables-ddl";

let applied: Promise<void> | undefined;

/** Idempotent; safe to call on every cold start. Cached per process. */
export function ensureEeSchema(pool: Pool): Promise<void> {
  applied ??= pool.query(`${EE_TABLES_DDL}\n${RLS_DDL}`).then(() => undefined);
  return applied;
}
