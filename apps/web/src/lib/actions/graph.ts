"use server";

import { requireUserId } from "@/lib/auth/guard";
import { withUserDb } from "@/lib/db/request-scope";
import { logActionError } from "@/lib/actions/resilience";
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
  const userId = await requireUserId();
  const targetId = String(formData.get("targetId") ?? "");
  const targetLabel = String(formData.get("targetLabel") ?? "");
  if (!targetId) return { error: "Pick a target first." };
  try {
    // The multi-hop BFS runs many getDb() reads — one scoped connection keeps
    // it from fanning out across the small tenant pool.
    const paths = await withUserDb(userId, () => findWarmPaths(targetId));
    return { paths, targetLabel };
  } catch (error) {
    logActionError("findWarmPaths", error);
    return { error: "Couldn't search for a path — please try again.", targetLabel };
  }
}
