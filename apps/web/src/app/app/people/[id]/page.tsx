import { notFound } from "next/navigation";
import { requireSessionPage } from "@/lib/auth/guard";
import { getContact } from "@/lib/repo/contacts";
import { EmptyState } from "@/components/app/EmptyState";

export const metadata = { title: "Person — Dhaga" };

function DetailChips({ label, values }: { label: string; values: string[] }) {
  if (values.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-fog/70">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {values.map((value) => (
          <span
            key={value}
            className="max-w-full truncate rounded-full border border-seam bg-paper/[0.04] px-2.5 py-1 text-xs text-paper"
          >
            {value}
          </span>
        ))}
      </div>
    </div>
  );
}

export default async function PersonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSessionPage();
  const { id } = await params;
  const detail = await getContact(id);
  if (!detail) notFound();
  const { contact, companyName } = detail;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-amber/15 font-display text-xl text-amber">
          {contact.name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <h1 className="truncate font-display text-2xl tracking-tight">
            {contact.name}
          </h1>
          <p className="mt-0.5 text-sm text-fog">
            {[contact.title, companyName].filter(Boolean).join(" · ") ||
              "No title or company yet"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-seam bg-panel p-5 sm:grid-cols-2 sm:p-6">
        <DetailChips label="Email" values={contact.emails} />
        <DetailChips label="Phone" values={contact.phones} />
        <DetailChips label="Links" values={contact.links} />
        <DetailChips
          label="Location"
          values={contact.location ? [contact.location] : []}
        />
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-lg">Notes & facts</h2>
        <EmptyState
          title="No notes yet"
          body="Notes and AI-extracted facts with receipts land in the next build increment."
        />
      </section>
    </div>
  );
}
