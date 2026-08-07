import { cache } from "react";
import { notFound } from "next/navigation";
import { requireUserIdForPage } from "@/lib/auth/guard";
import { getAdminGate } from "./loader";

/**
 * Per-page admin gate — defense in depth alongside app/admin/layout.tsx, so
 * authorization sits next to the data fetch and doesn't rely on layout
 * rendering semantics. Memoized per-request (like getCurrentUser) so the
 * layout and the page sharing a request cost one isAdmin lookup. 404s
 * non-admins — a non-admin shouldn't distinguish "doesn't exist" from
 * "exists but you're blocked". Returns the current user id on success.
 */
export const requireAdminForPage = cache(async (): Promise<string> => {
  const userId = await requireUserIdForPage();
  const isAdmin = await (await getAdminGate()).isAdmin(userId);
  if (!isAdmin) notFound();
  return userId;
});
