import { BESPOKE_POLICIES_DDL } from "./bespoke-policies";
import { TENANT_TABLE_RLS_DDL } from "./tenant-tables";

export { TENANT_TABLES } from "./tenant-tables";

/**
 * Row-Level Security, applied on top of core's own schema — never touches
 * apps/web/src/lib/db/ddl. The generic per-table loop (tenant-tables.ts) runs
 * first and adds the `user_id` column every bespoke block below depends on;
 * the bespoke blocks (bespoke-policies.ts) must stay concatenated after it,
 * in their original order.
 */
export const RLS_DDL = `${TENANT_TABLE_RLS_DDL}${BESPOKE_POLICIES_DDL}`;
