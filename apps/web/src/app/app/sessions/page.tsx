import Link from "next/link";
import { requireSessionPage } from "@/lib/auth/guard";
import { listSessions } from "@/lib/repo/sessions";
import { CreateSessionForm } from "@/components/app/CreateSessionForm";
import { EmptyState } from "@/components/app/EmptyState";

export const metadata = { title: "Sessions — Dhaga" };

export default async function SessionsPage() {
  await requireSessionPage();
  const sessions = await listSessions();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl tracking-tight">Sessions</h1>
        <p className="mt-1 text-sm text-fog">
          One session per event — the people you met there stay grouped.
        </p>
      </div>

      <CreateSessionForm />

      {sessions.length === 0 ? (
        <EmptyState
          title="No sessions yet"
          body="Create one above, or attach a session while quick-adding a person."
        />
      ) : (
        <ul className="divide-y divide-seam overflow-hidden rounded-2xl border border-seam bg-panel">
          {sessions.map((session) => (
            <li key={session.id}>
              <Link
                href={`/app/sessions/${session.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-paper/[0.03]"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-paper">
                    {session.name}
                  </span>
                  <span className="block text-xs text-fog">
                    {session.startedAt.toLocaleDateString()}
                  </span>
                </span>
                <span className="shrink-0 rounded-full border border-seam bg-paper/[0.04] px-2.5 py-0.5 text-xs text-fog">
                  {session.contactCount}{" "}
                  {session.contactCount === 1 ? "person" : "people"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
