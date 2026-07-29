"use client";

import { useState, type ReactElement } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { toastError } from "@/components/app/feedback";
import { addFactAction, createFollowUpAction } from "@/lib/actions/manual-entries";
import { AddFactForm } from "@/components/app/contact/AddFactForm";
import { AddFollowUpForm } from "@/components/app/contact/AddFollowUpForm";
import { FACT_TYPES } from "@/utils/constants/facts";
import { ContactPickerField } from "./ContactPickerField";
import { buildFactFormData, buildFollowUpFormData } from "./builders";
import type { GraphTarget } from "@/lib/repo/graph-data";

type Entry = "fact" | "followup";

/** No-AI facts & follow-ups: pick a contact, then jot a fact or a follow-up,
 *  reusing the same AddFactForm / AddFollowUpForm the contact page uses — wired
 *  to addFactAction / createFollowUpAction. Stays put on success (toast + the
 *  reused forms reset themselves) instead of navigating to the contact. */
export function ManualFactFollowUp(): ReactElement {
  const [contact, setContact] = useState<GraphTarget | null>(null);
  const [entry, setEntry] = useState<Entry>("fact");

  async function addFact(text: string, type: string): Promise<void> {
    if (!contact) return;
    const result = await addFactAction({}, buildFactFormData(contact.id, text, type));
    if (result.error) return toastError(result.error);
    toast.success("Fact added.");
  }

  async function addFollowUp(action: string, dueDate: Date | null): Promise<void> {
    if (!contact) return;
    const result = await createFollowUpAction({}, buildFollowUpFormData(contact.id, action, dueDate));
    if (result.error) return toastError(result.error);
    toast.success("Follow-up added.");
  }

  return (
    <div className="space-y-4">
      <ContactPickerField label="Contact" value={contact} onSelect={setContact} placeholder="Search people…" />
      {contact ? (
        <div className="space-y-3">
          <div className="inline-flex gap-1 rounded-full border border-seam bg-panel p-1">
            {(["fact", "followup"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setEntry(value)}
                className={cn(
                  "min-h-11 whitespace-nowrap rounded-full px-4 text-xs font-medium transition-colors",
                  entry === value ? "bg-amber/15 text-ember" : "text-fog hover:text-paper",
                )}
              >
                {value === "fact" ? "Fact" : "Follow-up"}
              </button>
            ))}
          </div>
          {entry === "fact" ? (
            <AddFactForm factTypes={FACT_TYPES} onAdd={addFact} />
          ) : (
            <AddFollowUpForm onAdd={addFollowUp} />
          )}
        </div>
      ) : (
        <p className="text-sm text-fog">Pick a contact to add a fact or follow-up.</p>
      )}
    </div>
  );
}
