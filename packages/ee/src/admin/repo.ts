import { and, count, desc, eq, ilike } from "drizzle-orm";
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

export async function listUsersPage({ page, pageSize, name, email, role }: { page: number; pageSize: number; name?: string; email?: string; role?: string }): Promise<{ rows: AdminUserSummary[]; total: number }> {
  const conn = await db();
  const conditions = [name ? ilike(eeUser.name, `%${name}%`) : undefined, email ? ilike(eeUser.email, `%${email}%`) : undefined, role ? eq(eeUser.isAdmin, role === "admin") : undefined].filter((value) => value !== undefined);
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const [rows, [total]] = await Promise.all([
    conn.select().from(eeUser).where(where).orderBy(desc(eeUser.createdAt)).limit(pageSize).offset((page - 1) * pageSize),
    conn.select({ value: count() }).from(eeUser).where(where),
  ]);
  return { rows: rows.map((row) => ({ ...row, isAdmin: row.isAdmin === true })), total: total?.value ?? 0 };
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

export async function listSubscriptionsPage({ page, pageSize, user, plan, status }: { page: number; pageSize: number; user?: string; plan?: string; status?: string }): Promise<{ rows: SubscriptionRow[]; total: number }> {
  const conn = await db();
  const conditions = [user ? ilike(subscriptions.userId, `%${user}%`) : undefined, plan ? eq(subscriptions.plan, plan) : undefined, status ? eq(subscriptions.status, status) : undefined].filter((value) => value !== undefined);
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const [rows, [total]] = await Promise.all([
    conn.select().from(subscriptions).where(where).orderBy(desc(subscriptions.createdAt)).limit(pageSize).offset((page - 1) * pageSize),
    conn.select({ value: count() }).from(subscriptions).where(where),
  ]);
  return { rows, total: total?.value ?? 0 };
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
