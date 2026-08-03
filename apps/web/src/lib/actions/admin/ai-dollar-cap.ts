"use server";

// Dhaga Cloud only — see packages/ee/LICENSE.
import { revalidatePath } from "next/cache";
import { withUserDb } from "@/lib/db/request-scope";
import {
  setDollarCapEnforcement,
  setDollarCapFloorUsd,
  setDollarCapMultiplier,
} from "@/lib/repo/ai-budget";
import { assertAdmin } from "./guard";

/**
 * The master cost gate's two admin levers, kept apart from ./ai-budget.ts
 * (credits) because they bound different things: credits limit what a user may
 * DO, dollars limit what their month may COST. Mixing them in one action would
 * make one form able to silently change the other ceiling.
 */

const ADMIN_AI_CREDITS_PATH = "/app/admin/ai-credits";

/** A blank or unusable number is left unchanged rather than coerced — the admin
 *  sees the field snap back instead of silently moving a live ceiling. */
function parseAmount(raw: FormDataEntryValue | null): number | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export async function setDollarCapLimitsAction(formData: FormData): Promise<void> {
  const adminId = await assertAdmin();
  const multiplier = parseAmount(formData.get("multiplier"));
  const floorUsd = parseAmount(formData.get("floorUsd"));

  // Sequential, on one scoped connection — two writes to a two-row table are
  // not worth a fan-out against a three-connection pool.
  await withUserDb(adminId, async () => {
    if (multiplier !== null) await setDollarCapMultiplier(multiplier);
    if (floorUsd !== null) await setDollarCapFloorUsd(floorUsd);
  });
  revalidatePath(ADMIN_AI_CREDITS_PATH);
}

export async function setDollarCapEnforcementAction(formData: FormData): Promise<void> {
  const adminId = await assertAdmin();
  const enabled = String(formData.get("enabled") ?? "") === "true";
  await withUserDb(adminId, () => setDollarCapEnforcement(enabled));
  revalidatePath(ADMIN_AI_CREDITS_PATH);
}
