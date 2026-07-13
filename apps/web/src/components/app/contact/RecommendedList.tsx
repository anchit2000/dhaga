import Link from "next/link";
import type { RecommendedContact } from "@/lib/repo/recommendations";

export function RecommendedList({ recommendations }: { recommendations: RecommendedContact[] }) {
  if (recommendations.length === 0) return null;
  return (
    <section className="space-y-3">
      <div className="flex items-baseline gap-2">
        <h2 className="font-display text-lg">Relevant people</h2>
        <span className="text-xs text-fog">ranked locally, with reasons</span>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {recommendations.map((person) => (
          <li key={person.contactId}>
            <Link
              href={`/app/people/${person.contactId}`}
              className="flex h-full items-start gap-2.5 rounded-xl border border-seam bg-panel p-3 transition-colors hover:bg-wash/[0.03]"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-amber/15 font-display text-[10px] text-amber">
                {person.name.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-medium text-paper">{person.name}</span>
                <span className="block truncate text-[10px] text-fog">
                  {[person.title, person.companyName].filter(Boolean).join(" · ")}
                </span>
                <span className="mt-1 block text-[10px] leading-relaxed text-ember">
                  {person.reasons.join(" · ")}
                </span>
                <span className="mt-1 block text-[10px] text-fog">{person.action}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
