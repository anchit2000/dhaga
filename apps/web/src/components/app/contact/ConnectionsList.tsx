import Link from "next/link";
import type { ConnectionItem } from "@/lib/repo/connections";

/** M5: same-company, same-session, and extracted-edge connections. */
export function ConnectionsList({ connections }: { connections: ConnectionItem[] }) {
  if (connections.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="font-display text-lg">Connections</h2>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {connections.map((connection) => (
          <li key={connection.contactId}>
            <Link
              href={`/app/people/${connection.contactId}`}
              className="flex items-center gap-2.5 rounded-xl border border-seam bg-panel px-3 py-2.5 transition-colors hover:bg-paper/[0.03]"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber/15 font-display text-xs text-amber">
                {connection.name.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-paper">
                  {connection.name}
                </span>
                <span className="block truncate text-xs text-fog">
                  {connection.via.join(" · ")}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
