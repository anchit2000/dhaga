"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/guard";
import {
  setOnboardingTourSeen,
  setStoreCardPhotos,
  setSttEngine,
  type SttEngine,
} from "@/lib/repo/settings";
import { deleteAllCardImages } from "@/lib/repo/card-images";

export async function setStoreCardPhotosAction(
  formData: FormData,
): Promise<void> {
  await requireUserId();
  await setStoreCardPhotos(String(formData.get("enabled")) === "true");
  revalidatePath("/app/settings");
}

/** Hard-deletes every stored card photo; transcription receipts stay. */
export async function purgeCardPhotosAction(): Promise<void> {
  await requireUserId();
  await deleteAllCardImages();
  revalidatePath("/app/settings");
}

export async function setSttEngineAction(formData: FormData): Promise<void> {
  await requireUserId();
  const raw = formData.get("engine");
  const engine: SttEngine = raw === "local" || raw === "realtime" ? raw : "browser";
  await setSttEngine(engine);
  revalidatePath("/app/settings");
}

/** Records that the first-run walkthrough has run, so it never auto-shows
 *  again. Called (fire-and-forget) from the client when the tour ends. No
 *  revalidatePath: /app is force-dynamic, so the next load re-reads the flag. */
export async function markOnboardingTourSeenAction(): Promise<void> {
  await requireUserId();
  await setOnboardingTourSeen();
}
