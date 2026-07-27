"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { mutation, type MutationResult } from "@/lib/actions/mutation";
import { createLinkToken, unlinkIdentity } from "@/lib/repo/messaging";
import {
  LINK_TOKEN_ALPHABET,
  LINK_TOKEN_LENGTH,
  LINK_TOKEN_TTL_MINUTES,
} from "@/utils/constants/messaging";

/**
 * Cryptographically-random account-linking token: LINK_TOKEN_LENGTH characters
 * drawn from the unambiguous LINK_TOKEN_ALPHABET, one uniform (unbiased) draw
 * per character via crypto.randomInt. Module-private on purpose — a "use server"
 * module may only EXPORT async server actions, so this deterministic helper
 * stays unexported.
 */
function generateLinkToken(): string {
  let token = "";
  for (let i = 0; i < LINK_TOKEN_LENGTH; i += 1) {
    token += LINK_TOKEN_ALPHABET[randomInt(LINK_TOKEN_ALPHABET.length)];
  }
  return token;
}

/**
 * Mint a fresh short-lived link token for the current user, then revalidate
 * Settings so the new token streams back into the Messaging card. The user
 * echoes it to the bot; the webhook redeems it (see repo/messaging tokens).
 * Returns the MutationResult so the client can render the token or toast the
 * error — never logs the token itself (PII/secret).
 */
export async function generateMessagingLinkTokenAction(): Promise<
  MutationResult<{ token: string; expiresAt: string }>
> {
  const result = await mutation("generate_messaging_token", async (userId) => {
    const token = generateLinkToken();
    const expiresAt = new Date(Date.now() + LINK_TOKEN_TTL_MINUTES * 60000);
    await createLinkToken({ userId, token, expiresAt });
    return { token, expiresAt: expiresAt.toISOString() };
  });
  revalidatePath("/app/settings");
  return result;
}

/** Remove one linked chat. unlinkIdentity scopes the delete to its owner, so a
 *  user can only ever unlink their own identity. */
export async function unlinkMessagingIdentityAction(
  identityId: string,
): Promise<MutationResult<void>> {
  const result = await mutation("unlink_messaging_identity", async (userId) => {
    await unlinkIdentity({ userId, identityId });
  });
  revalidatePath("/app/settings");
  return result;
}
