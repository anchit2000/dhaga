"use server";

import { revalidatePath } from "next/cache";
import { createEntity, deleteEntity, updateEntity } from "@/lib/repo/entities";
import { mutation } from "@/lib/actions/mutation";
import type { ActionResult } from "./types";

export async function createEntityAction(input: {
  typeId: string;
  name: string;
  description?: string | null;
}): Promise<ActionResult> {
  if (!input.name?.trim()) return { error: "Name is required." };
  if (!input.typeId) return { error: "Pick a type." };
  const r = await mutation("createEntity", () => createEntity(input));
  if (!r.ok) return { error: r.error };
  revalidatePath("/app/entities");
  return { id: r.data };
}

export async function updateEntityAction(
  id: string,
  input: { name?: string; description?: string | null; typeId?: string },
): Promise<ActionResult> {
  if (!id) return { error: "Missing entity." };
  if (input.name !== undefined && !input.name.trim()) return { error: "Name is required." };
  const r = await mutation("updateEntity", () => updateEntity(id, input));
  if (!r.ok) return { error: r.error };
  revalidatePath("/app/entities");
  revalidatePath(`/app/entities/${id}`);
  return { id };
}

/** Cascade: tombstones the entity's edges, hard-deletes its notes (and their
 *  derived rows), then the entity itself — mirroring "forget this person". */
export async function deleteEntityAction(id: string): Promise<ActionResult> {
  if (!id) return { error: "Missing entity." };
  const r = await mutation("deleteEntity", () => deleteEntity(id));
  if (!r.ok) return { error: r.error };
  revalidatePath("/app/entities");
  return {};
}
