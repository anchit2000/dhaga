import Link from "next/link";
import { EmptyState } from "@/components/app/EmptyState";
import { PeopleTable } from "@/components/app/table/PeopleTable";
import { Button } from "@/components/ui/button";
import { requireUserIdForPage } from "@/lib/auth/guard";
import { listContacts } from "@/lib/repo/contacts";

export const metadata = { title: "People — Dhaga" };

export default async function PeoplePage() {
  await requireUserIdForPage();
  const people = await listContacts();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl tracking-tight">People</h1>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-fog/60">
            Export
            {(["csv", "vcard", "json"] as const).map((format) => (
              <a key={format} href={`/api/export/${format}`} className="underline-offset-2 transition-colors hover:text-paper hover:underline">{format}</a>
            ))}
          </span>
          <Button render={<Link href="/app/people/new" />} size="sm">Add person</Button>
        </div>
      </div>

      {people.length === 0 ? (
        <EmptyState title="No people yet" body="Add your first contact manually, or paste a signature in Quick add.">
          <Button render={<Link href="/app/people/new" />} variant="outline" size="sm">Add your first person</Button>
        </EmptyState>
      ) : <PeopleTable people={people} />}
    </div>
  );
}
