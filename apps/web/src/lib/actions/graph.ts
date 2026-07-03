"use server";

import { requireSession } from "@/lib/auth/guard";
import { findWarmPaths, type WarmPath } from "@/lib/repo/warm-paths";

export interface WarmPathState {
  paths?: WarmPath[];
  targetLabel?: string;
  error?: string;
}

export async function findWarmPathsAction(
  _previous: WarmPathState,
  formData: FormData,
): Promise<WarmPathState> {
  await requireSession();
  const targetId = String(formData.get("targetId") ?? "");
  const targetLabel = String(formData.get("targetLabel") ?? "");
  if (!targetId) return { error: "Pick a target first." };
  const paths = await findWarmPaths(targetId);
  return { paths, targetLabel };
}
