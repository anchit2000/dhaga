import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
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

export async function submitAccessRequest(email: string): Promise<void> {
  await (await db())
    .insert(accessRequests)
    .values({ email })
    .onConflictDoNothing();
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
