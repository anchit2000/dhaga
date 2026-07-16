import { GRAPH_DDL } from "./graph";
import { EXTEND_DDL } from "./extend";
import { META_DDL } from "./meta";

/**
 * Idempotent schema DDL, applied on first DB open. Column names must stay in
 * lockstep with the Drizzle definitions in db/schema. Schema changes get a new
 * `ALTER ... IF NOT EXISTS`-style statement appended to the right chunk.
 *
 * Split into ordered chunks per the 150-line rule: graph.ts (companies/contacts
 * and everything that FKs into them) must run before extend.ts and meta.ts,
 * which reference those tables — so the concatenation order is load-bearing.
 */
export const CORE_DDL = `${GRAPH_DDL}${EXTEND_DDL}${META_DDL}`;
