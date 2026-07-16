"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/guard";
import { createEntity, deleteEntity, updateEntity } from "@/lib/repo/entities";
import type { ActionResult } from "./types";

export async function createEntityAction(input: {
  typeId: string;
  name: string;
  description?: string | null;
}): Promise<ActionResult> {
  await requireUserId();
  if (!input.name?.trim()) return { error: "Name is required." };
  if (!input.typeId) return { error: "Pick a type." };
  const id = await createEntity(input);
  revalidatePath("/app/entities");
  return { id };
}

export async function updateEntityAction(
  id: string,
  input: { name?: string; description?: string | null; typeId?: string },
): Promise<ActionResult> {
  await requireUserId();
  if (!id) return { error: "Missing entity." };
  if (input.name !== undefined && !input.name.trim()) return { error: "Name is required." };
  await updateEntity(id, input);
  revalidatePath("/app/entities");
  revalidatePath(`/app/entities/${id}`);
  return { id };
}

/** Cascade: tombstones the entity's edges, hard-deletes its notes (and their
 *  derived rows), then the entity itself — mirroring "forget this person". */
export async function deleteEntityAction(id: string): Promise<ActionResult> {
  await requireUserId();
  if (!id) return { error: "Missing entity." };
  await deleteEntity(id);
  revalidatePath("/app/entities");
  return {};
}
