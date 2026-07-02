import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSessionPage } from "@/lib/auth/guard";
import { getContact } from "@/lib/repo/contacts";
import { listFacts, listNotes, listOpenFollowUps } from "@/lib/repo/notes";
import { listContactSessions } from "@/lib/repo/sessions";
import { AddNoteForm } from "@/components/app/contact/AddNoteForm";
import { DetailChips } from "@/components/app/contact/DetailChips";
import { FactList } from "@/components/app/contact/FactList";
import { FollowUpList } from "@/components/app/contact/FollowUpList";
import { NoteList } from "@/components/app/contact/NoteList";

export const metadata = { title: "Person — Dhaga" };

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
  const [contactNotes, contactFacts, openFollowUps, contactSessions] =
    await Promise.all([
      listNotes(id),
      listFacts(id),
      listOpenFollowUps(id),
      listContactSessions(id),
    ]);

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
          {contactSessions.length > 0 || contact.tags.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {contactSessions.map((session) => (
                <Link
                  key={session.id}
                  href={`/app/sessions/${session.id}`}
                  className="rounded-full border border-amber/30 bg-amber/10 px-2.5 py-0.5 text-xs text-amber transition-colors hover:bg-amber/20"
                >
                  {session.name}
                </Link>
              ))}
              {contact.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-seam bg-paper/[0.04] px-2.5 py-0.5 text-xs text-fog"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
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

      <FollowUpList contactId={id} followUps={openFollowUps} />

      <section className="space-y-3">
        <h2 className="font-display text-lg">Facts</h2>
        <FactList contactId={id} facts={contactFacts} />
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg">Notes</h2>
        <AddNoteForm contactId={id} />
        <NoteList contactId={id} notes={contactNotes} />
      </section>
    </div>
  );
}
