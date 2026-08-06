import { formatCalendarDate } from "@dhaga/core/src/dates";
import type { RelationshipInput } from "@/lib/repo/relationships";
import type { GraphTarget } from "@/lib/repo/graph-data";

/** True once both endpoints and a predicate are chosen — the manual
 *  relationship form's submit stays disabled until then (mirrors
 *  validateRelationshipInput requiring two distinct endpoints + a predicate). */
export function canSubmitRelationship(
  subject: GraphTarget | null,
  object: GraphTarget | null,
  predicateSlug: string | null,
): boolean {
  return Boolean(subject && object && predicateSlug);
}

/** Contact↔contact edge input for createRelationshipAction. `flipped` swaps
 *  which picked contact is the source vs. destination without touching the
 *  predicate phrase — the same direction semantics as the Swap toggle. */
export function buildRelationshipInput(
  subject: GraphTarget,
  object: GraphTarget,
  predicateSlug: string,
  flipped: boolean,
): RelationshipInput {
  const [src, dst] = flipped ? [object, subject] : [subject, object];
  return {
    srcId: src.id,
    srcKind: "contact",
    dstId: dst.id,
    dstKind: "contact",
    predicate: predicateSlug,
  };
}

/** FormData for addFactAction — injects the picked contactId that AddFactForm
 *  (which only knows the text + type) can't supply on its own. */
export function buildFactFormData(contactId: string, text: string, type: string): FormData {
  const data = new FormData();
  data.set("contactId", contactId);
  data.set("type", type);
  data.set("text", text);
  return data;
}

/** FormData for createFollowUpAction — dueDate as YYYY-MM-DD (omitted when
 *  the user left the "when" empty; the action treats absence as an open item). */
export function buildFollowUpFormData(
  contactId: string,
  action: string,
  dueDate: Date | null,
): FormData {
  const data = new FormData();
  data.set("contactId", contactId);
  data.set("action", action);
  if (dueDate) data.set("dueDate", formatCalendarDate(dueDate));
  return data;
}
