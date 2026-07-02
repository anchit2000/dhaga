import { requireSessionPage } from "@/lib/auth/guard";
import { ContactForm } from "@/components/app/ContactForm";
import { emptyExtractedContact } from "@dhaga/core";

export const metadata = { title: "Add person — Dhaga" };

export default async function NewPersonPage() {
  await requireSessionPage();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl tracking-tight">Add person</h1>
        <p className="mt-1 text-sm text-fog">
          Prefer Quick add for pasted signatures — it fills this form for you.
        </p>
      </div>
      <div className="rounded-2xl border border-seam bg-panel p-5 sm:p-6">
        <ContactForm initial={emptyExtractedContact()} submitLabel="Save person" />
      </div>
    </div>
  );
}
