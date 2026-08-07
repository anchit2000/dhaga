"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/guard";
import { SAVE_RETRY_MESSAGE, logActionError } from "@/lib/actions/resilience";
import { getAuth } from "@/lib/auth/config";
import { FeatureNotEntitledError, requireFeature } from "@/lib/entitlements";
import { API_KEY_PLAN_GATE_REASON } from "@/utils/constants/api-keys";

export interface CreateApiKeyState {
  key?: string;
  error?: string;
}

/**
 * The raw key is only ever returned here, once — better-auth stores just a hash.
 *
 * MINTING is one of the `multi_device_sync` payment gates (utils/constants/plans.ts):
 * a token is how the mobile app, a script and a local MCP client authenticate,
 * so "can this user add another device" is exactly "can this user create a
 * token". It is NOT how the browser extension authenticates — that rides the
 * logged-in cookie session (`credentials: "include"`), and is deliberately
 * ungated. The MCP endpoint carries its own gate (lib/mcp/auth.ts) because its
 * OAuth path never sees a token at all.
 *
 * Gating minting and nothing else here is deliberate — key VERIFICATION
 * (`requireUserIdFromRequest`) and `deleteApiKeyAction` stay ungated, so a user
 * who downgrades keeps the integration they already set up and can still revoke
 * it. Silently breaking a working client is a worse outcome than a free tier
 * holding one token it was issued while paying.
 */
export async function createApiKeyAction(
  _previous: CreateApiKeyState,
  formData: FormData,
): Promise<CreateApiKeyState> {
  const userId = await requireUserId();
  const name = String(formData.get("name") ?? "").trim() || "Untitled token";
  const auth = await getAuth();
  try {
    await requireFeature(userId, "multi_device_sync");
    const result = await auth.api.createApiKey({
      body: { name },
      headers: await headers(),
    });
    return { key: result.key };
  } catch (error) {
    if (error instanceof FeatureNotEntitledError) {
      return { error: API_KEY_PLAN_GATE_REASON };
    }
    logActionError("createApiKey", error);
    return { error: SAVE_RETRY_MESSAGE };
  }
}

export async function deleteApiKeyAction(formData: FormData): Promise<void> {
  await requireUserId();
  const keyId = String(formData.get("keyId") ?? "");
  if (!keyId) return;
  const auth = await getAuth();
  await auth.api.deleteApiKey({ body: { keyId }, headers: await headers() });
  revalidatePath("/app/settings");
}
