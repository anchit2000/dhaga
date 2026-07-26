"use server";

import { requireUserId } from "@/lib/auth/guard";
import { withUserDb } from "@/lib/db/request-scope";
import {
  createRelationshipType,
  deleteRelationshipType,
  listRelationshipTypes,
} from "@/lib/repo/relationship-types";
import { MutationError, mutation } from "@/lib/actions/mutation";
import { PREDICATE_SLUG_PATTERN } from "@/utils/constants/graph";
import { toSlug } from "@/utils/slug";
import type { ActionResult } from "./types";

/** Create returns the slug too — the dialog selects the new predicate by it. */
export type RelationshipTypeActionResult = ActionResult & { slug?: string };

export interface RelationshipTypeOption {
  id: string;
  slug: string;
  forwardLabel: string;
  inverseLabel: string;
}

/** The user's custom predicates, for client pickers (AddRelationshipDialog)
 *  that can't receive them as server-component props. A read — one scoped
 *  connection, so it never fans out getDb() across the tenant pool. */
export async function listRelationshipTypesAction(): Promise<RelationshipTypeOption[]> {
  const userId = await requireUserId();
  const rows = await withUserDb(userId, () => listRelationshipTypes());
  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    forwardLabel: row.forwardLabel,
    inverseLabel: row.inverseLabel,
  }));
}

/** Creates a user-defined predicate. The slug derives from the forward label
 *  ("Father of" -> "father_of") unless the caller passes one explicitly. */
export async function createRelationshipTypeAction(input: {
  forwardLabel: string;
  inverseLabel: string;
  slug?: string;
}): Promise<RelationshipTypeActionResult> {
  const forwardLabel = input.forwardLabel?.trim() ?? "";
  const inverseLabel = input.inverseLabel?.trim() ?? "";
  if (!forwardLabel || !inverseLabel) {
    return { error: "Both a forward and an inverse label are required." };
  }
  const slug = input.slug?.trim() || toSlug(forwardLabel);
  if (!PREDICATE_SLUG_PATTERN.test(slug)) {
    return { error: "Predicate must be a snake_case slug (e.g. father_of)." };
  }
  const r = await mutation("createRelationshipType", async () => {
    try {
      return await createRelationshipType({ slug, forwardLabel, inverseLabel });
    } catch (error) {
      // createRelationshipType throws a hand-written, user-safe Error on a
      // duplicate slug. Surface that as a specific outcome, not the generic
      // transient retry copy.
      throw new MutationError(
        error instanceof Error ? error.message : "Could not create the type.",
      );
    }
  });
  if (!r.ok) return { error: r.error };
  return { id: r.data, slug };
}

export async function deleteRelationshipTypeAction(
  id: string,
): Promise<RelationshipTypeActionResult> {
  if (!id) return { error: "Missing type." };
  const r = await mutation("deleteRelationshipType", () => deleteRelationshipType(id));
  if (!r.ok) return { error: r.error };
  return {};
}
