"use server";

import { revalidatePath } from "next/cache";
import { mutation } from "@/lib/actions/mutation";
import { invalidateAppNavigation } from "@/lib/cache/app-navigation";
import { setOnboardingTourSeen, setStoreCardPhotos } from "@/lib/repo/settings";
import { deleteAllCardImages } from "@/lib/repo/card-images";

export async function setStoreCardPhotosAction(
  formData: FormData,
): Promise<void> {
  const enabled = String(formData.get("enabled")) === "true";
  const r = await mutation("setStoreCardPhotos", async (userId) => {
    await setStoreCardPhotos(enabled);
    invalidateAppNavigation(userId);
  });
  if (!r.ok) throw new Error(r.error);
  revalidatePath("/app/settings");
}

/** Hard-deletes every stored card photo; transcription receipts stay. */
export async function purgeCardPhotosAction(): Promise<void> {
  const r = await mutation("purgeCardPhotos", () => deleteAllCardImages());
  if (!r.ok) throw new Error(r.error);
  revalidatePath("/app/settings");
}

/** Records that the first-run walkthrough has run, so it never auto-shows
 *  again. Called (fire-and-forget) from the client when the tour ends. No
 *  revalidatePath: /app is force-dynamic, so the next load re-reads the flag.
 *  Best-effort + idempotent: a transient failure is swallowed (mutation() logs
 *  it PII-safe) rather than surfaced — the next load simply re-reads the flag. */
export async function markOnboardingTourSeenAction(): Promise<void> {
  await mutation("markOnboardingTourSeen", () => setOnboardingTourSeen());
}
