import Link from "next/link";
import type { ContactRelationship } from "@/lib/repo/relationships";

/**
 * The contact's interpersonal relationships, shown by default (not behind a
 * click) so an extracted edge like "son of" is immediately visible. The role
 * is already direction-corrected for this contact by listContactRelationships.
 */
export function RelationshipList({
  relationships,
}: {
  relationships: ContactRelationship[];
}) {
  if (relationships.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="font-display text-lg">Relationships</h2>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {relationships.map((relationship, index) => (
          <li key={`${relationship.contactId}:${relationship.predicate}:${index}`}>
            <Link
              href={`/app/people/${relationship.contactId}`}
              className="flex h-full items-center gap-2.5 rounded-xl border border-seam bg-panel px-3 py-2.5 transition-colors hover:bg-wash/[0.03]"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber/15 font-display text-xs text-amber">
                {relationship.name.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-paper">
                  {relationship.name}
                </span>
                <span className="block truncate text-xs capitalize text-amber/80">
                  {relationship.role}
                </span>
                {relationship.mentioned ? (
                  <span className="mt-1 inline-flex rounded-full border border-seam px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-fog">
                    Mentioned person
                  </span>
                ) : null}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
