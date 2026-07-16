"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/guard";
import {
  createRelationshipEdge,
  deleteRelationshipEdge,
  validateRelationshipInput,
  type RelationshipInput,
  type RelationshipEndpointKind,
} from "@/lib/repo/relationships";
import type { ActionResult } from "./types";

/** Each endpoint's detail page lists the new edge — refresh whichever exists. */
function revalidateEndpoint(kind: RelationshipEndpointKind, id: string): void {
  if (kind === "contact") revalidatePath(`/app/people/${id}`);
  if (kind === "entity") revalidatePath(`/app/entities/${id}`);
  if (kind === "event") revalidatePath(`/app/events/${id}`);
}

/** Writes a manual edge (source_note_id NULL — no note receipt to tombstone). */
export async function createRelationshipAction(
  input: RelationshipInput,
): Promise<ActionResult> {
  await requireUserId();
  const invalid = validateRelationshipInput(input);
  if (invalid) return { error: invalid };
  const id = await createRelationshipEdge(input);
  revalidatePath("/app/graph");
  revalidateEndpoint(input.srcKind, input.srcId);
  revalidateEndpoint(input.dstKind, input.dstId);
  return { id };
}

/** Tombstone — the edge stays recoverable, matching note-derived edge deletes. */
export async function deleteRelationshipAction(
  edgeId: string,
): Promise<ActionResult> {
  await requireUserId();
  if (!edgeId) return { error: "Missing relationship." };
  await deleteRelationshipEdge(edgeId);
  revalidatePath("/app/graph");
  return {};
}
