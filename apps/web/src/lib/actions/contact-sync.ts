"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/guard";
import { mutation } from "@/lib/actions/mutation";
import {
  deleteContactConnection,
  runContactSync,
  setContactPushUnlinked,
  setContactSyncEnabled,
} from "@/lib/repo/contact-sync";

export async function disconnectContactSyncAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const r = await mutation("disconnectContactSync", () => deleteContactConnection(id));
  if (!r.ok) throw new Error(r.error);
  revalidatePath("/app/settings");
}

/**
 * Turn syncing on or off for one connection. NOT a scope change — the grant
 * stays exactly as consented, we simply stop running. Contacts already written
 * to the account stay there; they are the user's, in their account.
 */
export async function setContactSyncEnabledAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const enabled = String(formData.get("enabled") ?? "") === "true";
  const r = await mutation("setContactSyncEnabled", () => setContactSyncEnabled(id, enabled));
  if (!r.ok) throw new Error(r.error);
  revalidatePath("/app/settings");
}

/**
 * Opt in to copying Dhaga-only people into the connected account. Off by
 * default and deliberately its own switch: syncing existing contacts both ways
 * is what the user asked for by connecting, whereas uploading everyone Dhaga
 * knows about — every scanned business card — into their Google account is a
 * separate decision they have to make on purpose.
 */
export async function setContactPushUnlinkedAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const enabled = String(formData.get("enabled") ?? "") === "true";
  const r = await mutation("setContactPushUnlinked", () => setContactPushUnlinked(id, enabled));
  if (!r.ok) throw new Error(r.error);
  revalidatePath("/app/settings");
}

/**
 * Run every eligible connection now.
 *
 * User-triggered only — there is no background schedule. Reading and writing a
 * user's address book without them asking is exactly the silent data movement
 * the privacy rules forbid, and the same reason mobile sync is a button rather
 * than a daemon.
 *
 * runContactSync opens its own scoped connections per phase, so this is
 * deliberately NOT wrapped in `mutation` (which would hold one across the whole
 * run, including its HTTP calls).
 *
 * Returns how many Dhaga-only contacts the run's create ceiling held back,
 * added up across every account it ran. The caller renders it verbatim: an
 * account left mid-copy is only fixed by the user running the sync again, and
 * they cannot decide to do that if nothing tells them it happened.
 */
export async function runContactSyncAction(): Promise<number> {
  const userId = await requireUserId();
  const results = await runContactSync(userId);
  revalidatePath("/app/settings");
  revalidatePath("/app/sync/conflicts");
  revalidatePath("/app/people");
  return results.reduce((total, result) => total + result.remaining, 0);
}
