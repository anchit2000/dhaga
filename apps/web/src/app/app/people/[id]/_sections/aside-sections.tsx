import { listCardImageRefs } from "@/lib/repo/card-images";
import { listContactSignals } from "@/lib/repo/signals";
import { CardPhotoStrip } from "@/components/app/contact/CardPhotoStrip";
import { ContactSignalList } from "@/components/app/contact/ContactSignalList";

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
