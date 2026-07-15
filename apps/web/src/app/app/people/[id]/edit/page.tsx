import { notFound } from "next/navigation";
import { requireUserIdForPage } from "@/lib/auth/guard";
import { getContactProfile } from "@/lib/repo/contacts";
import { updateContactAction } from "@/lib/actions/contacts";
import { ContactForm } from "@/components/app/ContactForm";

export const metadata = { title: "Edit person — Dhaga" };

export default async function EditPersonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUserIdForPage();
  const { id } = await params;
  const profile = await getContactProfile(id);
  if (!profile) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl tracking-tight">Edit person</h1>
        <p className="mt-1 text-sm text-fog">
          Add jobs, numbers, links, and more — people are rarely just one thing.
        </p>
      </div>
      <div className="rounded-2xl border border-seam bg-panel p-5 sm:p-6">
        <ContactForm
          initial={profile}
          submitLabel="Save changes"
          action={updateContactAction}
        >
          <input type="hidden" name="contactId" value={id} />
        </ContactForm>
      </div>
    </div>
  );
}
