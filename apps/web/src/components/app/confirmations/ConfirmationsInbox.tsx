import { CheckCheck } from "lucide-react";
import { listPendingConfirmations } from "@/lib/repo/confirmations";
import { getCachedNodeTypes } from "@/lib/cache/node-types";
import { ConfirmationCard } from "./ConfirmationCard";
import type { ConfirmationType } from "@dhaga/core";

/** Group order + copy for the inbox; each type gets its own section. */
const GROUPS: { type: ConfirmationType; title: string; blurb: string }[] = [
  {
    type: "follow_up_date",
    title: "Dates to confirm",
    blurb: "A date is already scheduled — keep Saturday or move the follow-up to Sunday.",
  },
  {
    type: "entity_link",
    title: "Links to confirm",
    blurb: "A note named a person or place the extractor couldn't pin down on its own.",
  },
  {
    type: "subject_resolution",
    title: "Who is this about?",
    blurb: "A note used a pronoun or bare reference — choose which contact it belongs to.",
  },
  {
    type: "enrichment_match",
    title: "Enrichment to verify",
    blurb: "Details found on the web, waiting for you to confirm they're really this person.",
  },
  {
    type: "supplement",
    title: "New details to add",
    blurb: "Freshly extracted facts and relationships ready to join a contact.",
  },
];

/**
 * The confirmations inbox: every pending "doubt" the extractor raised, grouped
 * by kind. The graph stays untouched until the user resolves each one here.
 * Renders an empty state when nothing is pending.
 */
export async function ConfirmationsInbox({
  userId,
}: {
  userId: string;
}): Promise<React.ReactElement> {
  const [confirmations, cachedTypes] = await Promise.all([
    listPendingConfirmations(),
    getCachedNodeTypes(userId),
  ]);
  const nodeTypes = cachedTypes.map(({ id, name }) => ({ id, name }));

  if (confirmations.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-seam bg-panel px-6 py-16 text-center">
        <CheckCheck className="size-6 text-ember" aria-hidden />
        <div className="space-y-1">
          <p className="font-display text-lg">Nothing to confirm</p>
          <p className="mx-auto max-w-sm text-sm text-fog">
            When the extractor isn&rsquo;t sure who a note refers to, it asks here before
            writing anything to your graph.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {GROUPS.map((group) => {
        const items = confirmations.filter((item) => item.type === group.type);
        if (items.length === 0) return null;
        return (
          <section key={group.type} className="space-y-3">
            <div>
              <h2 className="font-display text-lg">
                {group.title}
                <span className="text-fog"> · {items.length}</span>
              </h2>
              <p className="text-xs leading-relaxed text-fog">{group.blurb}</p>
            </div>
            <ul className="space-y-3">
              {items.map((item) => (
                <ConfirmationCard key={item.id} confirmation={item} nodeTypes={nodeTypes} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
