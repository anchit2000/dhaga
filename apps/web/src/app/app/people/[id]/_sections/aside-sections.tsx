import { listCardImageRefs } from "@/lib/repo/card-images";
import { listContactSignals } from "@/lib/repo/signals";
import { CardPhotoStrip } from "@/components/app/contact/CardPhotoStrip";
import { ContactSignalList } from "@/components/app/contact/ContactSignalList";
import { ContactActionsCard } from "@/components/app/contact/ContactActionsCard";
import { loadContactEvents } from "./loaders";

/** Sticky-sidebar actions card (Edit/View in graph/Add to group). Streams in
 *  with its events query via the same `loadContactEvents` loader the groups
 *  row uses — `cache()` dedupes the two calls within the request. */
export async function ContactActionsSection({
  contactId,
}: {
  contactId: string;
}): Promise<React.ReactElement> {
  const events = await loadContactEvents(contactId);
  return (
    <ContactActionsCard
      contactId={contactId}
      currentEventIds={events.map((event) => event.id)}
    />
  );
}

export async function CardPhotosSection({
  contactId,
}: {
  contactId: string;
}): Promise<React.ReactElement> {
  const images = await listCardImageRefs(contactId);
  return <CardPhotoStrip images={images} />;
}

export async function SignalsSection({
  contactId,
  contactName,
}: {
  contactId: string;
  contactName: string;
}): Promise<React.ReactElement> {
  const signals = await listContactSignals(contactId);
  return (
    <ContactSignalList
      contactId={contactId}
      contactName={contactName}
      signals={signals}
    />
  );
}
