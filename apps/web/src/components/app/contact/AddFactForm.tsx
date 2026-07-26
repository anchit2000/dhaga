"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "../SubmitButton";

/** Add a fact by hand — no note, no extraction. The typed text and picked type
 *  go up to the host (FactListClient), which shows the fact optimistically and
 *  runs the write. The fact types come from the server (as a prop) so this
 *  client component never imports @dhaga/core's runtime (which would pull
 *  server-only LLM code into the bundle). */
export function AddFactForm({
  factTypes,
  onAdd,
}: {
  factTypes: readonly string[];
  onAdd: (text: string, type: string) => void;
}) {
  const [open, setOpen] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const text = String(data.get("text") ?? "").trim();
    const type = String(data.get("type") ?? "").trim();
    if (!text || !type) return;
    onAdd(text, type);
    form.reset();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-seam px-3 py-2 text-xs text-fog transition-colors hover:border-amber/40 hover:text-paper"
      >
        <Plus className="size-3.5" />
        Add fact
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-2 rounded-lg border border-seam bg-panel p-3"
    >
      <Input name="text" required autoFocus placeholder="A fact about them" className="text-sm" />
      <div className="flex flex-wrap items-center gap-2">
        <Select
          name="type"
          defaultValue="personal"
          aria-label="Fact type"
          className="h-8 w-auto text-sm"
        >
          {factTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </Select>
        <SubmitButton className="h-8">Add fact</SubmitButton>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-fog transition-colors hover:text-paper"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
