import { randomUUID } from "node:crypto";
import { and, count, desc, eq, ilike, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { getPool } from "../db/pool";
import { openAdminConnection } from "../db/admin-db";
import { ensureEeSchema } from "../db/bootstrap";
import { approveUserByEmail, revokeUserApprovalByEmail } from "../approval/repo";
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
  const conditions = [email ? ilike(accessRequests.email, `%${email}%`) : undefined, status ? eq(accessRequests.status, status) : undefined].filter((value) => value !== undefined);
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  // ONE checkout for the page and its count: a Promise.all on a single admin
  // connection pipelines both queries on one backend, instead of two concurrent
  // checkouts against the small (max 3) tenant pool. access_requests carries no
  // RLS, so the bypass-RLS admin connection reads it identically.
  const { db: conn, release } = await openAdminConnection();
  try {
    const [rows, [total]] = await Promise.all([
      conn.select().from(accessRequests).where(where).orderBy(desc(accessRequests.requestedAt)).limit(pageSize).offset((page - 1) * pageSize),
      conn.select({ value: count() }).from(accessRequests).where(where),
    ]);
    return { rows, total: total?.value ?? 0 };
  } finally {
    await release();
  }
}

/**
 * Reviewing a request now moves TWO things, because signup is open: the
 * request row (the admin queue's own state) and the account's `approved_at`
 * (what the guards actually read). Before Model A the account did not exist
 * yet, so flipping the row was enough; now the person is already signed up and
 * sitting on /pending, and approving only the row would leave them locked out
 * with a green tick in the admin panel.
 *
 * Both directions: rejecting an approved user sends them back to pending. An
 * admin can't be locked out this way — isUserApproved lets admins and
 * DHAGA_ADMIN_EMAILS through regardless of `approved_at`.
 *
 * The account update is by email and matches nothing when they haven't signed
 * up yet; the signup hook grants approval on the way in for an already-approved
 * email, so that case is covered too.
 */
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
  if (status === "approved") {
    await approveUserByEmail(email);
  } else {
    await revokeUserApprovalByEmail(email);
  }
}
