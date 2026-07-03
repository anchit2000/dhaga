import Link from "next/link";
import { requireSessionPage } from "@/lib/auth/guard";
import { listAllTags, listContacts } from "@/lib/repo/contacts";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/app/EmptyState";

export const metadata = { title: "People — Dhaga" };

function TagChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "whitespace-nowrap rounded-full border px-2.5 py-1 text-xs transition-colors",
        active
          ? "border-amber/40 bg-amber/15 font-medium text-amber"
          : "border-seam text-fog hover:text-paper",
      )}
    >
      {children}
    </Link>
  );
}

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string }>;
}) {
  await requireSessionPage();
  const { q, tag } = await searchParams;
  const [people, allTags] = await Promise.all([
    listContacts(q, tag),
    listAllTags(),
  ]);

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
        {tag ? <input type="hidden" name="tag" value={tag} /> : null}
      </form>

      {allTags.length > 0 ? (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <TagChip href={q ? `?q=${encodeURIComponent(q)}` : "?"} active={!tag}>
            All
          </TagChip>
          {allTags.map((tagName) => (
            <TagChip
              key={tagName}
              href={`?tag=${encodeURIComponent(tagName)}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              active={tag === tagName}
            >
              {tagName}
            </TagChip>
          ))}
        </div>
      ) : null}

      {people.length === 0 ? (
        <EmptyState
          title={q || tag ? "No one matches that" : "No people yet"}
          body={
            q || tag
              ? "Try a different name, title, company, or tag."
              : "Add your first contact manually, or paste a signature in Quick add."
          }
        >
          {!q && !tag ? (
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
