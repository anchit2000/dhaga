"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/guard";
import { invalidateNodeTypes } from "@/lib/cache/node-types";
import { createNodeType, deleteNodeType, updateNodeType } from "@/lib/repo/node-types";
import { HEX_COLOR_PATTERN } from "@/utils/constants/graph";
import type { ActionResult } from "./types";

export async function createNodeTypeAction(input: {
  name: string;
  color: string;
}): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!input.name?.trim()) return { error: "Name is required." };
  if (!HEX_COLOR_PATTERN.test(input.color ?? "")) {
    return { error: "Color must be a hex value like #7c9ce8." };
  }
  try {
    const id = await createNodeType({ name: input.name, color: input.color });
    invalidateNodeTypes(userId);
    revalidatePath("/app/entities");
    return { id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not create the type." };
  }
}

export async function updateNodeTypeAction(
  id: string,
  input: { name?: string; color?: string },
): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!id) return { error: "Missing type." };
  if (input.name !== undefined && !input.name.trim()) return { error: "Name is required." };
  if (input.color !== undefined && !HEX_COLOR_PATTERN.test(input.color)) {
    return { error: "Color must be a hex value like #7c9ce8." };
  }
  await updateNodeType(id, input);
  invalidateNodeTypes(userId);
  revalidatePath("/app/entities");
  return { id };
}

/** Blocked while entities of this type exist — surfaced, never silent. */
export async function deleteNodeTypeAction(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!id) return { error: "Missing type." };
  const deleted = await deleteNodeType(id);
  if (!deleted) {
    return { error: "This type still has entities. Delete or retype them first." };
  }
  invalidateNodeTypes(userId);
  revalidatePath("/app/entities");
  return {};
}
