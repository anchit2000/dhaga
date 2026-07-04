"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/guard";
import { setStoreCardPhotos } from "@/lib/repo/settings";
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
