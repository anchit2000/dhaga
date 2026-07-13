"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { completeFollowUpAction } from "@/lib/actions/notes";
import { markReachedOutAction } from "@/lib/actions/reminders";
import type { ActivityItem } from "@/lib/repo/activity";
import type { OpenFollowUpItem } from "@/lib/repo/reminders";
import { groupByTimeBucket } from "@/lib/time-buckets";
import { ActivityRow } from "./ActivityRow";
import { ContactDetailSheet } from "./ContactDetailSheet";

function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

/** Inline "mark reached out" / "mark done" action, shared by every row type
 *  that carries one — kept out of ActivityRow so the primitive stays
 *  agnostic to which server action a row's action slot triggers. */
function ReachedOutAction({ contactId }: { contactId: string }) {
  return (
    <form action={markReachedOutAction}>
      <input type="hidden" name="contactId" value={contactId} />
      <Button type="submit" variant="outline" size="sm">
        Reached out
      </Button>
    </form>
  );
}

/**
 * Home's single-column chronological feed (Mesh-style): time-bucketed rows,
 * a small supplementary "Open follow-ups" section above it (follow-ups are
 * pending todos, not past events, so they don't belong in the timeline),
 * and the on-click contact detail Sheet.
 */
export function ActivityFeed({
  items,
  openFollowUps,
}: {
  items: ActivityItem[];
  openFollowUps: OpenFollowUpItem[];
}) {
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const buckets = groupByTimeBucket(items);

  return (
    <div className="space-y-6">
      {openFollowUps.length > 0 ? (
        <section className="space-y-2">
          <h2 className="font-display text-lg">Open follow-ups</h2>
          <ul className="space-y-1.5">
            {openFollowUps.map((item) => (
              <ActivityRow
                key={item.id}
                avatarLabel={initial(item.contactName)}
                title={item.contactName}
                description={item.action}
                timestamp={item.createdAt}
                onSelect={() => setSelectedContactId(item.contactId)}
                action={
                  <form action={completeFollowUpAction}>
                    <input type="hidden" name="followUpId" value={item.id} />
                    <input type="hidden" name="contactId" value={item.contactId} />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Mark follow-up done"
                    >
                      <Check />
                    </Button>
                  </form>
                }
              />
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-5">
        <h2 className="font-display text-lg">Activity</h2>
        {buckets.length === 0 ? (
          <div className="rounded-xl border border-seam bg-panel px-4 py-3">
            <p className="text-sm text-paper">Nothing yet.</p>
            <p className="mt-0.5 text-xs text-fog">
              Capture a contact, add a note, or create an event — activity will collect here.
            </p>
          </div>
        ) : (
          buckets.map((bucket) => (
            <div key={bucket.label} className="space-y-2">
              <h3 className="font-mono text-[11px] uppercase tracking-widest text-fog/70">
                {bucket.label}
              </h3>
              <ul className="space-y-1.5">
                {bucket.items.map((item) => (
                  <ActivityRow
                    key={item.id}
                    avatarLabel={initial(item.title)}
                    title={item.title}
                    description={item.description}
                    timestamp={item.timestamp}
                    href={item.eventId ? `/app/events/${item.eventId}` : undefined}
                    onSelect={
                      item.contactId ? () => setSelectedContactId(item.contactId) : undefined
                    }
                    action={
                      (item.type === "reach_out" || item.type === "quiet") && item.contactId ? (
                        <ReachedOutAction contactId={item.contactId} />
                      ) : undefined
                    }
                  />
                ))}
              </ul>
            </div>
          ))
        )}
      </section>

      <ContactDetailSheet
        contactId={selectedContactId}
        onOpenChange={(open) => {
          if (!open) setSelectedContactId(null);
        }}
      />
    </div>
  );
}
