import { EntityLinkCard } from "./EntityLinkCard";
import { EnrichmentMatchCard } from "./EnrichmentMatchCard";
import { NoteSubjectCard } from "./NoteSubjectCard";
import { SubjectResolutionCard } from "./SubjectResolutionCard";
import { SupplementCard } from "./SupplementCard";
import type { ConfirmationView } from "@/lib/repo/confirmations";

/**
 * Picks the card for a confirmation's type, narrowing the discriminated payload
 * to the matching card's props. A new confirmation type gets one case here — the
 * exhaustive switch makes an unhandled type a compile error.
 */
export function ConfirmationCard({
  confirmation,
  nodeTypes,
}: {
  confirmation: ConfirmationView;
  nodeTypes: { id: string; name: string }[];
}): React.ReactElement {
  const { id, contactId, contactName, payload } = confirmation;
  switch (payload.type) {
    case "entity_link":
      return (
        <EntityLinkCard
          id={id}
          contactId={contactId}
          contactName={contactName}
          payload={payload}
          nodeTypes={nodeTypes}
        />
      );
    case "subject_resolution":
      return (
        <SubjectResolutionCard
          id={id}
          contactId={contactId}
          contactName={contactName}
          payload={payload}
        />
      );
    case "enrichment_match":
      return (
        <EnrichmentMatchCard
          id={id}
          contactId={contactId}
          contactName={contactName}
          payload={payload}
        />
      );
    case "supplement":
      return (
        <SupplementCard
          id={id}
          contactId={contactId}
          contactName={contactName}
          payload={payload}
        />
      );
    case "note_subject":
      return (
        <NoteSubjectCard
          id={id}
          contactId={contactId}
          contactName={contactName}
          payload={payload}
        />
      );
  }
}
