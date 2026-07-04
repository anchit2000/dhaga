"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/guard";
import { getAuth } from "@/lib/auth/config";

export interface CreateApiKeyState {
  key?: string;
  error?: string;
}

/** The raw key is only ever returned here, once — better-auth stores just a hash. */
export async function createApiKeyAction(
  _previous: CreateApiKeyState,
  formData: FormData,
): Promise<CreateApiKeyState> {
  await requireUserId();
  const name = String(formData.get("name") ?? "").trim() || "Untitled token";
  const auth = await getAuth();
  const result = await auth.api.createApiKey({
    body: { name },
    headers: await headers(),
  });
  return { key: result.key };
}

export async function deleteApiKeyAction(formData: FormData): Promise<void> {
  await requireUserId();
  const keyId = String(formData.get("keyId") ?? "");
  if (!keyId) return;
  const auth = await getAuth();
  await auth.api.deleteApiKey({ body: { keyId }, headers: await headers() });
  revalidatePath("/app/settings");
}
