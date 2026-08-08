import type { EdgeSuggestionTarget } from "../../edge-suggestions/confirm";

/** Attach the note to an existing person, or to one created from the typed name. */
export type NoteSubjectChoice =
  | { contactId: string }
  | { createName: string };

export type ConfirmationChoice =
  | { target: EdgeSuggestionTarget }
  | { subjectContactId: string }
  /** The subject isn't in the graph yet — create them, then attach the edge. */
  | { subjectCreateName: string }
  | { noteSubject: NoteSubjectChoice }
  | { followUpDate: string };

export type ConfirmationResult =
  | { kind: "edge"; dstType: string; dstId: string }
  | { kind: "fact"; factId: string }
  | { kind: "extraction"; contactId: string }
  | { kind: "follow_up_date"; followUpId: string }
  | { kind: "note"; contactId: string; noteId: string; contactName: string; noteBody: string };
