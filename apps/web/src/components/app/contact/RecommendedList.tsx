import Link from "next/link";
import type { RecommendedContact } from "@/lib/repo/recommendations";

/** Idea #1: people worth a look, from second-degree links and shared tags. */
export function RecommendedList({
  recommendations,
}: {
  recommendations: RecommendedContact[];
}) {
  if (recommendations.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="font-display text-lg">You might also know</h2>
      <ul className="flex flex-wrap gap-2">
        {recommendations.map((person) => (
          <li key={person.contactId}>
            <Link
              href={`/app/people/${person.contactId}`}
              className="flex items-center gap-2 rounded-full border border-seam bg-panel py-1.5 pl-1.5 pr-3 transition-colors hover:bg-paper/[0.03]"
            >
              <span className="flex size-6 items-center justify-center rounded-full bg-amber/15 font-display text-[10px] text-amber">
                {person.name.charAt(0).toUpperCase()}
              </span>
              <span className="text-xs font-medium text-paper">{person.name}</span>
              <span className="text-[10px] text-fog">
                {person.reasons.join(" · ")}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
