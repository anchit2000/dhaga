import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSessionPage } from "@/lib/auth/guard";
import { getSession, listSessionContacts } from "@/lib/repo/sessions";
import { EmptyState } from "@/components/app/EmptyState";

export const metadata = { title: "Session — Dhaga" };

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSessionPage();
  const { id } = await params;
  const session = await getSession(id);
  if (!session) notFound();
  const people = await listSessionContacts(id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl tracking-tight">{session.name}</h1>
        <p className="mt-1 text-sm text-fog">
          Started {session.startedAt.toLocaleDateString()} · {people.length}{" "}
          {people.length === 1 ? "person" : "people"}
        </p>
      </div>

      {people.length === 0 ? (
        <EmptyState
          title="Nobody here yet"
          body="Quick-add a person and attach this session to them."
        />
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
                    {person.title ?? "—"}
                  </span>
                </span>
                <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-wider text-fog/60 sm:block">
                  {person.scannedAt.toLocaleDateString()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
