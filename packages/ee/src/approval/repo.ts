import { and, eq, isNull, sql } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { getPool } from "../db/pool";
import { ensureEeSchema } from "../db/bootstrap";
import { eeUser, subscriptions } from "../db/schema";

/** `user` and `subscriptions` carry no RLS — a plain pool connection is enough. */
async function db() {
  await ensureEeSchema(getPool());
  return drizzle(getPool());
}

function bootstrapAdminEmails(): string[] {
  return (process.env.DHAGA_ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * May this account use the app at all?
 *
 * `approved_at` is the record, but it is deliberately NOT the only way in: an
 * admin must never be able to lock themselves (or the instance owner) out by
 * revoking the wrong row, and DHAGA_ADMIN_EMAILS is the bootstrap that exists
 * precisely for the moment before anyone has been approved. Same two escape
 * hatches isUserAdmin reads, for the same reason.
 *
 * `scopedDb` lets a caller that already holds a tenant connection reuse it
 * instead of taking a second checkout from the max-3 pool — `user` has no RLS,
 * so a scoped connection reads it identically. Unknown user id → false: an
 * account we cannot find is not an account we let in.
 */
export async function isUserApproved(
  userId: string,
  scopedDb?: NodePgDatabase,
): Promise<boolean> {
  const [row] = await (scopedDb ?? (await db()))
    .select({ approvedAt: eeUser.approvedAt, isAdmin: eeUser.isAdmin, email: eeUser.email })
    .from(eeUser)
    .where(eq(eeUser.id, userId));
  if (!row) return false;
  if (row.approvedAt !== null) return true;
  return row.isAdmin === true || bootstrapAdminEmails().includes(row.email.toLowerCase());
}

/**
 * Idempotent grant. `isNull(approved_at)` keeps the FIRST approval timestamp —
 * a redelivered webhook (Stripe and Razorpay both deliver at-least-once) must
 * not keep rewriting when the user was let in.
 */
export async function approveUser(userId: string): Promise<void> {
  await (await db())
    .update(eeUser)
    .set({ approvedAt: new Date() })
    .where(and(eq(eeUser.id, userId), isNull(eeUser.approvedAt)));
}

/**
 * Approval by email, for the admin access-request surface: the request row is
 * keyed by email and may be reviewed before OR after the person signs up. When
 * no account exists yet this simply matches nothing — the access_requests row
 * still flips to `approved`, and the grant happens at signup instead.
 *
 * Matched case-insensitively: access_requests stores emails lowercased, but
 * better-auth writes `user.email` as typed, and Postgres text equality is
 * case-sensitive.
 */
export async function approveUserByEmail(email: string): Promise<void> {
  await (await db())
    .update(eeUser)
    .set({ approvedAt: new Date() })
    .where(and(sql`lower(${eeUser.email}) = ${email.trim().toLowerCase()}`, isNull(eeUser.approvedAt)));
}

/** Back to pending. Admins stay in regardless (see isUserApproved). */
export async function revokeUserApproval(userId: string): Promise<void> {
  await (await db()).update(eeUser).set({ approvedAt: null }).where(eq(eeUser.id, userId));
}

export async function revokeUserApprovalByEmail(email: string): Promise<void> {
  await (await db())
    .update(eeUser)
    .set({ approvedAt: null })
    .where(sql`lower(${eeUser.email}) = ${email.trim().toLowerCase()}`);
}

/**
 * FALLBACK resolution for a money-back event, which names a processor object
 * and never our user id.
 *
 * The primary answer is now the payment ledger (billing/payments): one row per
 * charge, carrying its owner, so a refund resolves to an account directly.
 * These two remain for charges made before the ledger existed — Stripe's were
 * never backfilled, and only the single latest Razorpay payment per
 * subscription was — and for the case where the ledger simply has no such row.
 *
 * Silently does nothing when nothing matches: a refund for a subscription this
 * instance never recorded is not a reason to throw and make the processor
 * retry forever.
 */
export async function revokeApprovalForStripeCustomer(stripeCustomerId: string): Promise<void> {
  const [row] = await (await db())
    .select({ userId: subscriptions.userId })
    .from(subscriptions)
    .where(eq(subscriptions.stripeCustomerId, stripeCustomerId));
  if (row) await revokeUserApproval(row.userId);
}

export async function revokeApprovalForRazorpayPayment(paymentId: string): Promise<void> {
  const [row] = await (await db())
    .select({ userId: subscriptions.userId })
    .from(subscriptions)
    .where(eq(subscriptions.razorpayPaymentId, paymentId));
  if (row) await revokeUserApproval(row.userId);
}
