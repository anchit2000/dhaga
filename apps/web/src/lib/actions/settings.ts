"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/guard";
import { setStoreCardPhotos, setSttEngine, type SttEngine } from "@/lib/repo/settings";
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
