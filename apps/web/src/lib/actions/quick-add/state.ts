import type { ExtractedContact } from "@dhaga/core";
import type { CaptureImage } from "@dhaga/core/src/api/capture";
import type { ContactIdentityCandidate } from "@/lib/repo/contacts";
import type { ConfirmationView } from "@/lib/repo/confirmations";

/** The capture action reducer's state, shared by the text and card-scan paths.
 *  Every field is optional so each branch (contact review, disambiguation, note
 *  confirmation, note-attached notice, error) returns only what it needs. */
export interface QuickAddState {
  contact?: ExtractedContact;
  via?: "ai" | "heuristic";
  notice?: string;
  error?: string;
  sourceText?: string;
  /** Set only when store-card-photos is on — every scanned photo, carried
   *  through the review form (as the `capturedImages` hidden field) so each
   *  is saved as a visual receipt alongside the merged contact. */
  images?: CaptureImage[];
  /** The card scan's AI action id, carried through the review form so the
   *  verbatim transcription — which only runs once the contact is saved, in a
   *  SECOND request — bills against that same scan. One scan, one credit. */
  scanActionId?: string;
  /** A pasted contact whose name matches more than one existing contact —
   *  the contact-details disambiguation panel (attach as a note to one of them). */
  matches?: ContactIdentityCandidate[];
  /** A "which person is this note about?" confirmation the text path created
   *  inline when a captured NOTE's subject is ambiguous or unknown. Carries the
   *  whole ConfirmationView so <ConfirmationCard> can render it; resolving it
   *  (pick existing / create new) attaches the note + extracts facts. */
  confirmation?: ConfirmationView;
}
