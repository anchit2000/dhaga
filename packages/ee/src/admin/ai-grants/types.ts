export interface AiCreditGrantInput {
  /** null = every user on this instance. */
  userId: string | null;
  credits: number;
  reason: string;
  /** The admin user id performing the grant — kept for the audit trail. */
  grantedBy: string;
  /** null = no expiry. The admin UI defaults this to the end of the current
   *  month, because an open-ended grant re-applies every month forever. */
  endsAt: Date | null;
}

export interface AiCreditGrantRecord {
  id: string;
  userId: string | null;
  credits: number;
  reason: string;
  grantedBy: string;
  startsAt: Date;
  endsAt: Date | null;
  createdAt: Date;
  /** Whether the grant counts right now. Decided by Postgres, not the renderer:
   *  reading a clock during render is impure (and the DB clock is the one the
   *  cap resolver compares against anyway). */
  active: boolean;
}

export interface GrantRow {
  id: string;
  user_id: string | null;
  credits: number;
  reason: string;
  granted_by: string;
  /** Drizzle's node-postgres driver installs its own type parsers and hands
   *  raw-SQL timestamps back as STRINGS, not Dates — a typed `.select()` would
   *  map them, `db.execute()` does not. Coerced below; without it the admin
   *  ledger renders `RangeError: Invalid time value`. */
  starts_at: string | Date;
  ends_at: string | Date | null;
  created_at: string | Date;
  active: boolean;
}

export function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

export function toRecord(row: GrantRow): AiCreditGrantRecord {
  return {
    id: row.id,
    userId: row.user_id,
    credits: row.credits,
    reason: row.reason,
    grantedBy: row.granted_by,
    startsAt: toDate(row.starts_at),
    endsAt: row.ends_at === null ? null : toDate(row.ends_at),
    createdAt: toDate(row.created_at),
    active: row.active,
  };
}
