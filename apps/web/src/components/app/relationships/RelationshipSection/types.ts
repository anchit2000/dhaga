import type { RelationshipSourceKind } from "@/components/app/relationships/AddRelationshipDialog";

export interface RelationshipRowView {
  edgeId: string;
  targetId: string;
  kind: RelationshipSourceKind;
  name: string;
  /** Direction-corrected: how the row's node relates to the viewed node. */
  role: string;
  /** The stored predicate slug — the edit dialog's starting value. */
  predicate: string;
  /** True when the edge is stored viewed-node → this row (seeds the edit
   *  dialog's direction toggle, which `role` has already corrected for). */
  viewerIsSource: boolean;
  mentioned?: boolean;
}
