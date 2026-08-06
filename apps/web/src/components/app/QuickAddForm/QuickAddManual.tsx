"use client";

import { type ReactElement } from "react";
import { ArrowLeft } from "lucide-react";
import { emptyContactProfile } from "@dhaga/core/src/schemas/contact";
import { cn } from "@/lib/utils";
import { ContactForm } from "../ContactForm";
import { EventPicker, type EventOption } from "../EventPicker";
import { ManualRelationshipForm } from "./manual/ManualRelationshipForm";
import { ManualFactFollowUp } from "./manual/ManualFactFollowUp";

export type SubTab = "person" | "relationship" | "fact";

// Local UI tab list (hoisted out of the component body, not a business
// constant): the three no-AI quick adds, Person first.
const MANUAL_SUB_TABS: readonly { value: SubTab; label: string }[] = [
  { value: "person", label: "Person" },
  { value: "relationship", label: "Relationship" },
  { value: "fact", label: "Fact / follow-up" },
];

/** Skip-AI quick-add hub. Three no-AI sub-tabs, each reusing the same forms and
 *  server actions the contact/graph pages use: Person (blank {@link ContactForm}
 *  → createContactAction), Relationship (person↔person edge), and Fact /
 *  follow-up. `onBack` returns to the AI capture tabs. */
export function QuickAddManual({
  events,
  defaultEventId,
  onBack,
  tab,
  onTabChange,
}: {
  events: EventOption[];
  defaultEventId?: string;
  onBack: () => void;
  tab: SubTab;
  onTabChange: (tab: SubTab) => void;
}): ReactElement {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          role="tablist"
          aria-label="Manual quick add"
          className="flex items-center gap-1 overflow-x-auto rounded-full border border-seam bg-panel p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {MANUAL_SUB_TABS.map((item) => {
            const active = item.value === tab;
            return (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onTabChange(item.value)}
                className={cn(
                  "min-h-11 whitespace-nowrap rounded-full px-3.5 text-xs font-medium transition-colors sm:text-sm",
                  active ? "bg-amber/15 text-ember" : "text-fog hover:text-paper",
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-11 items-center gap-1 text-xs text-fog underline-offset-2 hover:text-paper hover:underline"
        >
          <ArrowLeft className="size-3.5" />
          Back to capture
        </button>
      </div>

      <div className="rounded-2xl border border-seam bg-panel p-5 sm:p-6">
        {tab === "person" ? (
          <ContactForm initial={emptyContactProfile()} submitLabel="Save person">
            <EventPicker events={events} defaultEventId={defaultEventId} />
          </ContactForm>
        ) : tab === "relationship" ? (
          <ManualRelationshipForm />
        ) : (
          <ManualFactFollowUp />
        )}
      </div>
    </div>
  );
}
