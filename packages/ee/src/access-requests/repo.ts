import { randomUUID } from "node:crypto";
import { and, count, desc, eq, ilike, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { getPool } from "../db/pool";
import { ensureEeSchema } from "../db/bootstrap";
import { accessRequests, type AccessRequestRow, type AccessRequestStatus } from "../db/schema";

/** access_requests has no RLS (it's pre-account, control-plane) — a plain
 *  connection off the shared pool is fine, no tenant/admin scoping needed. */
async function db() {
  await ensureEeSchema(getPool());
  return drizzle(getPool());
}

export const ACCESS_REQUEST_RETRY_DAYS = 30;

/** Returns true when a new pending request was created. Duplicate pending or
 * approved requests stay untouched; a rejected request can become pending
 * again after the cooldown. */
export async function submitAccessRequest(email: string): Promise<boolean> {
  // Normalize here, not just at callers: isEmailApproved/reviewAccessRequest
  // both look up by email.toLowerCase(), so a row stored with any uppercase
  // character would never match those lookups again (Postgres text equality
  // is case-sensitive) — the row would be stuck "pending" forever with no error.
  const normalizedEmail = email.trim().toLowerCase();
  const retryBefore = new Date(Date.now() - ACCESS_REQUEST_RETRY_DAYS * 24 * 60 * 60 * 1000);
  const rows = await (await db())
    .insert(accessRequests)
    .values({ email: normalizedEmail })
    .onConflictDoUpdate({
      target: accessRequests.email,
      set: {
        status: "pending",
        requestedAt: new Date(),
        reviewedAt: null,
        reviewedBy: null,
        approvalToken: null,
      },
      setWhere: and(
        eq(accessRequests.status, "rejected"),
        lte(accessRequests.reviewedAt, retryBefore),
      ),
    })
    .returning({ email: accessRequests.email });
  return rows.length > 0;
}

export async function isEmailApproved(email: string): Promise<boolean> {
  const [row] = await (await db())
    .select({ status: accessRequests.status })
    .from(accessRequests)
    .where(eq(accessRequests.email, email.toLowerCase()));
  return row?.status === "approved";
}

export async function listAccessRequests(
  status?: AccessRequestStatus,
): Promise<AccessRequestRow[]> {
  const conn = await db();
  return status
    ? conn
        .select()
        .from(accessRequests)
        .where(eq(accessRequests.status, status))
        .orderBy(desc(accessRequests.requestedAt))
    : conn.select().from(accessRequests).orderBy(desc(accessRequests.requestedAt));
}

export async function listAccessRequestsPage({ page, pageSize, email, status }: { page: number; pageSize: number; email?: string; status?: AccessRequestStatus }): Promise<{ rows: AccessRequestRow[]; total: number }> {
  const conn = await db();
  const conditions = [email ? ilike(accessRequests.email, `%${email}%`) : undefined, status ? eq(accessRequests.status, status) : undefined].filter((value) => value !== undefined);
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const [rows, [total]] = await Promise.all([
    conn.select().from(accessRequests).where(where).orderBy(desc(accessRequests.requestedAt)).limit(pageSize).offset((page - 1) * pageSize),
    conn.select({ value: count() }).from(accessRequests).where(where),
  ]);
  return { rows, total: total?.value ?? 0 };
}

export async function reviewAccessRequest(
  email: string,
  status: "approved" | "rejected",
  adminUserId: string,
): Promise<void> {
  await (await db())
    .update(accessRequests)
    .set({
      status,
      reviewedAt: new Date(),
      reviewedBy: adminUserId,
      approvalToken: status === "approved" ? randomUUID() : null,
    })
    .where(eq(accessRequests.email, email.toLowerCase()));
}
