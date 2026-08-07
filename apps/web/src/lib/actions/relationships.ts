"use server";

import { revalidatePath } from "next/cache";
import {
  createRelationshipEdge,
  deleteRelationshipEdge,
  updateRelationshipEdge,
  validateRelationshipInput,
  type RelationshipInput,
} from "@/lib/repo/relationships";
import { mutation } from "@/lib/actions/mutation";
import type { ActionResult } from "./types";

/** Each endpoint's detail page lists the new edge — refresh whichever exists.
 *  Takes a plain string because the update path reads the kinds back off the
 *  stored row (where legacy values can exist); unknown kinds simply match none. */
function revalidateEndpoint(kind: string, id: string): void {
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

/** Corrects an existing edge in place — its relationship type, its direction,
 *  or the node at the other end — the fix for a wrong edge that previously
 *  needed delete + re-add (and lost the edge's note receipt with it). */
export async function updateRelationshipAction(
  input: RelationshipInput & { edgeId: string },
): Promise<ActionResult> {
  if (!input.edgeId) return { error: "Missing relationship." };
  const invalid = validateRelationshipInput(input);
  if (invalid) return { error: invalid };
  const r = await mutation("updateRelationship", () => updateRelationshipEdge(input.edgeId, input));
  if (!r.ok) return { error: r.error };
  if (!r.data) return { error: "That relationship no longer exists." };
  revalidatePath("/app/graph");
  // Both ends of the edit: the pages it now joins, AND the page it left —
  // repointing an edge must not leave the old endpoint still listing it.
  revalidateEndpoint(input.srcKind, input.srcId);
  revalidateEndpoint(input.dstKind, input.dstId);
  revalidateEndpoint(r.data.srcKind, r.data.srcId);
  revalidateEndpoint(r.data.dstKind, r.data.dstId);
  return { id: input.edgeId };
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
