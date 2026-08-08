import { ACCESS_DDL } from "./access";
import { FOUNDING_SEATS_DDL, PAYMENTS_DDL, SUBSCRIPTIONS_DDL } from "./billing";
import { REFERRALS_DDL } from "./referrals";

/**
 * EE-owned tables — not part of core's tenant data, so no RLS needed here;
 * these are control-plane tables the admin panel/webhooks read directly.
 *
 * Split per the 150-line rule; the import path `../db/tables-ddl` is unchanged.
 * ORDER IS LOAD-BEARING and is the only reason this is a composed string rather
 * than four independent scripts: ./access creates `dhaga_ee_migrations`, which
 * every one-shot backfill gates itself on, and ./billing's payments backfill
 * reads `subscriptions`, so both must already exist by the time it runs.
 */
export const EE_TABLES_DDL = `${ACCESS_DDL}\n${SUBSCRIPTIONS_DDL}\n${FOUNDING_SEATS_DDL}\n${REFERRALS_DDL}\n${PAYMENTS_DDL}`;
