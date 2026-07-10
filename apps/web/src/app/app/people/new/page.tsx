import { requireUserIdForPage } from "@/lib/auth/guard";
import { ContactForm } from "@/components/app/ContactForm";
import { emptyExtractedContact } from "@dhaga/core";
import { matchLinkedInProfileUrl } from "@dhaga/core/src/capture/linkedin-qr";

export const metadata = { title: "Add person — Dhaga" };

/** LinkedIn QR capture (docs/ideas.md; checklist.md's "LinkedIn QR format
 *  support", v1.4) lands here with a `linkedin` param — re-validated
 *  server-side rather than trusted as-is, same "don't fabricate" stance as
 *  the rest of capture: no scraping, no name-guessing, the user still fills
 *  in and confirms everything else themselves. */
export default async function NewPersonPage({
  searchParams,
}: {
  searchParams: Promise<{ linkedin?: string }>;
}) {
  await requireUserIdForPage();
  const { linkedin } = await searchParams;
  const matchedLinkedIn = linkedin ? matchLinkedInProfileUrl(linkedin) : null;
  const initial = matchedLinkedIn
    ? { ...emptyExtractedContact(), links: [matchedLinkedIn] }
    : emptyExtractedContact();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl tracking-tight">Add person</h1>
        <p className="mt-1 text-sm text-fog">
          {matchedLinkedIn
            ? "Prefilled from a scanned LinkedIn QR code — add what you know and save."
            : "Prefer Quick add for pasted signatures — it fills this form for you."}
        </p>
      </div>
      <div className="rounded-2xl border border-seam bg-panel p-5 sm:p-6">
        <ContactForm initial={initial} submitLabel="Save person" />
      </div>
    </div>
  );
}
