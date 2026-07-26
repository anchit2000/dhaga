"use server";

import { revalidatePath } from "next/cache";
import { invalidateNodeTypes } from "@/lib/cache/node-types";
import { createNodeType, deleteNodeType, updateNodeType } from "@/lib/repo/node-types";
import { PreconditionError } from "@/lib/repo/errors";
import { MutationError, mutation } from "@/lib/actions/mutation";
import { HEX_COLOR_PATTERN } from "@/utils/constants/graph";
import type { ActionResult } from "./types";

export async function createNodeTypeAction(input: {
  name: string;
  color: string;
}): Promise<ActionResult> {
  if (!input.name?.trim()) return { error: "Name is required." };
  if (!HEX_COLOR_PATTERN.test(input.color ?? "")) {
    return { error: "Color must be a hex value like #7c9ce8." };
  }
  const r = await mutation("createNodeType", async (userId) => {
    let id: string;
    try {
      id = await createNodeType({ name: input.name, color: input.color });
    } catch (error) {
      // A PreconditionError is a hand-written, user-safe message (unusable name,
      // duplicate) — surface it as a specific outcome. Any other throw is a real
      // infra failure: re-throw so mutation() logs it and returns the generic
      // transient retry copy rather than a raw SQL/timeout string.
      if (error instanceof PreconditionError) throw new MutationError(error.message);
      throw error;
    }
    invalidateNodeTypes(userId);
    return id;
  });
  if (!r.ok) return { error: r.error };
  revalidatePath("/app/entities");
  return { id: r.data };
}

export async function updateNodeTypeAction(
  id: string,
  input: { name?: string; color?: string },
): Promise<ActionResult> {
  if (!id) return { error: "Missing type." };
  if (input.name !== undefined && !input.name.trim()) return { error: "Name is required." };
  if (input.color !== undefined && !HEX_COLOR_PATTERN.test(input.color)) {
    return { error: "Color must be a hex value like #7c9ce8." };
  }
  const r = await mutation("updateNodeType", async (userId) => {
    await updateNodeType(id, input);
    invalidateNodeTypes(userId);
  });
  if (!r.ok) return { error: r.error };
  revalidatePath("/app/entities");
  return { id };
}

/** Blocked while entities of this type exist — surfaced, never silent. */
export async function deleteNodeTypeAction(id: string): Promise<ActionResult> {
  if (!id) return { error: "Missing type." };
  const r = await mutation("deleteNodeType", async (userId) => {
    const deleted = await deleteNodeType(id);
    if (!deleted) {
      throw new MutationError("This type still has entities. Delete or retype them first.");
    }
    invalidateNodeTypes(userId);
  });
  if (!r.ok) return { error: r.error };
  revalidatePath("/app/entities");
  return {};
}
