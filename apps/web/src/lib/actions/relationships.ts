"use server";

import { revalidatePath } from "next/cache";
import {
  createRelationshipEdge,
  deleteRelationshipEdge,
  validateRelationshipInput,
  type RelationshipInput,
  type RelationshipEndpointKind,
} from "@/lib/repo/relationships";
import { mutation } from "@/lib/actions/mutation";
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
  const invalid = validateRelationshipInput(input);
  if (invalid) return { error: invalid };
  const r = await mutation("createRelationship", () => createRelationshipEdge(input));
  if (!r.ok) return { error: r.error };
  revalidatePath("/app/graph");
  revalidateEndpoint(input.srcKind, input.srcId);
  revalidateEndpoint(input.dstKind, input.dstId);
  return { id: r.data };
}

/** Tombstone — the edge stays recoverable, matching note-derived edge deletes. */
export async function deleteRelationshipAction(
  edgeId: string,
): Promise<ActionResult> {
  if (!edgeId) return { error: "Missing relationship." };
  const r = await mutation("deleteRelationship", () => deleteRelationshipEdge(edgeId));
  if (!r.ok) return { error: r.error };
  revalidatePath("/app/graph");
  return {};
}
