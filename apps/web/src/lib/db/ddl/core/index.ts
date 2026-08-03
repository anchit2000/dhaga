import { GRAPH_DDL } from "./graph";
import { EXTEND_DDL } from "./extend";
import { META_DDL } from "./meta";
import { MESSAGING_DDL } from "./messaging";
import { NOTIFICATIONS_DDL } from "./notifications";
import { GOALS_DDL } from "./goals";
import { FEEDBACK_DDL } from "./feedback";

/**
 * Idempotent schema DDL, applied on first DB open. Column names must stay in
 * lockstep with the Drizzle definitions in db/schema. Schema changes get a new
 * `ALTER ... IF NOT EXISTS`-style statement appended to the right chunk.
 *
 * Split into ordered chunks per the 150-line rule: graph.ts (companies/contacts
 * and everything that FKs into them) must run before extend.ts and meta.ts,
 * which reference those tables — so the concatenation order is load-bearing.
 * messaging.ts depends on nothing in graph, so it is appended last —
 * notifications.ts after it, since it FKs contacts (graph) and extraction_jobs
 * (extend). goals.ts is last for the same reason — goal_members FKs contacts.
 * feedback.ts references nothing, so its position is free; it goes last simply
 * because appending is the smallest diff.
 */
export const CORE_DDL = `${GRAPH_DDL}${EXTEND_DDL}${META_DDL}${MESSAGING_DDL}${NOTIFICATIONS_DDL}${GOALS_DDL}${FEEDBACK_DDL}`;
