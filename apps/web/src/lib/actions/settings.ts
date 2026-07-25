"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/guard";
import { invalidateAppNavigation } from "@/lib/cache/app-navigation";
import { setOnboardingTourSeen, setStoreCardPhotos } from "@/lib/repo/settings";
import { deleteAllCardImages } from "@/lib/repo/card-images";

export async function setStoreCardPhotosAction(
  formData: FormData,
): Promise<void> {
  const userId = await requireUserId();
  await setStoreCardPhotos(String(formData.get("enabled")) === "true");
  invalidateAppNavigation(userId);
  revalidatePath("/app/settings");
}

/** Hard-deletes every stored card photo; transcription receipts stay. */
export async function purgeCardPhotosAction(): Promise<void> {
  await requireUserId();
  await deleteAllCardImages();
  revalidatePath("/app/settings");
}

/** Records that the first-run walkthrough has run, so it never auto-shows
 *  again. Called (fire-and-forget) from the client when the tour ends. No
 *  revalidatePath: /app is force-dynamic, so the next load re-reads the flag. */
export async function markOnboardingTourSeenAction(): Promise<void> {
  await requireUserId();
  await setOnboardingTourSeen();
}
