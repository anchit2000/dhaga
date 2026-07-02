import Link from "next/link";
import { requireSessionPage } from "@/lib/auth/guard";
import { listContacts } from "@/lib/repo/contacts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/app/EmptyState";

export const metadata = { title: "People — Dhaga" };

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireSessionPage();
  const { q } = await searchParams;
  const people = await listContacts(q);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl tracking-tight">People</h1>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-fog/60">
            Export
            {(["csv", "vcard", "json"] as const).map((format) => (
              <a
                key={format}
                href={`/api/export/${format}`}
                className="underline-offset-2 transition-colors hover:text-paper hover:underline"
              >
                {format}
              </a>
            ))}
          </span>
          <Button render={<Link href="/app/people/new" />} size="sm">
            Add person
          </Button>
        </div>
      </div>

      <form method="GET" role="search">
        <Input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Filter by name, title, company…"
          className="h-10 max-w-md"
        />
      </form>

      {people.length === 0 ? (
        <EmptyState
          title={q ? "No one matches that" : "No people yet"}
          body={
            q
              ? "Try a different name, title, or company."
              : "Add your first contact manually, or paste a signature in Quick add."
          }
        >
          {!q ? (
            <Button render={<Link href="/app/people/new" />} variant="outline" size="sm">
              Add your first person
            </Button>
          ) : null}
        </EmptyState>
      ) : (
        <ul className="divide-y divide-seam overflow-hidden rounded-2xl border border-seam bg-panel">
          {people.map((person) => (
            <li key={person.id}>
              <Link
                href={`/app/people/${person.id}`}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-paper/[0.03]"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber/15 font-display text-sm text-amber">
                  {person.name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-paper">
                    {person.name}
                  </span>
                  <span className="block truncate text-xs text-fog">
                    {[person.title, person.companyName].filter(Boolean).join(" · ") ||
                      "No details yet"}
                  </span>
                </span>
                <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-wider text-fog/60 sm:block">
                  {person.createdAt.toLocaleDateString()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
