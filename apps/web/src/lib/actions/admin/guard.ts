// Dhaga Cloud only — see packages/ee/LICENSE.
import { requireUserId } from "@/lib/auth/guard";
import { getAdminGate } from "@/lib/hosted/gate";

/**
 * Re-check admin rights INSIDE every admin server action. The admin pages are
 * already gated (layout + requireAdminForPage), but a server action is a public
 * POST endpoint reachable without ever rendering that page, so the page gate
 * carries no trust here. Returns the acting admin's user id — grants record it.
 *
 * Deliberately NOT a "use server" module: every export of one of those must be
 * a server action, and this is a plain helper the actions share.
 */
export async function assertAdmin(): Promise<string> {
  const callerId = await requireUserId();
  if (!(await (await getAdminGate()).isAdmin(callerId))) throw new Error("Forbidden");
  return callerId;
}
