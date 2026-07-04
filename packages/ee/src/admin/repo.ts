import { count, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { getPool } from "../db/pool";
import { ensureEeSchema } from "../db/bootstrap";
import { accessRequests, eeUser, subscriptions, type SubscriptionRow } from "../db/schema";

/** `user`, `access_requests`, `subscriptions` carry no RLS — a plain
 *  connection off the shared pool is enough for all of these. */
async function db() {
  await ensureEeSchema(getPool());
  return drizzle(getPool());
}

export async function isUserAdmin(userId: string): Promise<boolean> {
  const adminEmails = (process.env.DHAGA_ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const [row] = await (await db())
    .select({ isAdmin: eeUser.isAdmin, email: eeUser.email })
    .from(eeUser)
    .where(eq(eeUser.id, userId));
  if (!row) return false;
  return row.isAdmin === true || adminEmails.includes(row.email.toLowerCase());
}

export interface AdminUserSummary {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  createdAt: Date;
}

export async function listUsers(): Promise<AdminUserSummary[]> {
  const rows = await (await db())
    .select()
    .from(eeUser)
    .orderBy(desc(eeUser.createdAt));
  return rows.map((row) => ({ ...row, isAdmin: row.isAdmin === true }));
}

export async function getUser(userId: string): Promise<AdminUserSummary | null> {
  const [row] = await (await db()).select().from(eeUser).where(eq(eeUser.id, userId));
  return row ? { ...row, isAdmin: row.isAdmin === true } : null;
}

export async function setUserAdmin(userId: string, isAdmin: boolean): Promise<void> {
  await (await db()).update(eeUser).set({ isAdmin }).where(eq(eeUser.id, userId));
}

export async function getSubscription(userId: string): Promise<SubscriptionRow | null> {
  const [row] = await (await db())
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId));
  return row ?? null;
}

export async function listSubscriptions(): Promise<SubscriptionRow[]> {
  return (await db()).select().from(subscriptions).orderBy(desc(subscriptions.createdAt));
}

export interface AdminDashboardCounts {
  pendingAccessRequests: number;
  totalUsers: number;
  activeSubscriptions: number;
}

export async function dashboardCounts(): Promise<AdminDashboardCounts> {
  const conn = await db();
  const [[pending], [users], [active]] = await Promise.all([
    conn.select({ n: count() }).from(accessRequests).where(eq(accessRequests.status, "pending")),
    conn.select({ n: count() }).from(eeUser),
    conn.select({ n: count() }).from(subscriptions).where(eq(subscriptions.status, "active")),
  ]);
  return {
    pendingAccessRequests: pending?.n ?? 0,
    totalUsers: users?.n ?? 0,
    activeSubscriptions: active?.n ?? 0,
  };
}
