"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addVocabTermAction,
  clearVocabAction,
  removeVocabTermAction,
} from "@/lib/actions/voice";
import type { VocabTerm } from "@dhaga/core/src/voice/types";

function AddButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" size="sm" disabled={pending}>
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
      Add word
    </Button>
  );
}

function RemoveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="ghost" size="icon-sm" disabled={pending} aria-label="Remove term">
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
    </Button>
  );
}

function ClearAllButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="ghost"
      size="sm"
      disabled={pending}
      className="text-red-400/90 hover:bg-red-400/10 hover:text-red-400"
      onClick={(event) => {
        if (!confirm("Remove every taught term? There is no undo.")) event.preventDefault();
      }}
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
      Clear all
    </Button>
  );
}

/** Vocabulary manager for on-device dictation: the terms Dhaga has been taught
 *  to spell/recognize a specific way. This is a simple create + delete surface —
 *  the primary way users teach words is tap-to-fix in the dictation transcript.
 *  Add is an upsert keyed by the term (see addVocabTermAction). The add form's
 *  inputs are uncontrolled and reset by remounting (`key`) after a successful
 *  write — which avoids setState-in-effect churn. */
export function VoiceTeaching({ terms }: { terms: VocabTerm[] }) {
  const [resetKey, setResetKey] = useState(0);

  async function handleAdd(formData: FormData): Promise<void> {
    await addVocabTermAction(formData);
    setResetKey((key) => key + 1);
  }

  return (
    <div className="space-y-4 rounded-2xl border border-seam bg-panel p-5 sm:p-6">
      <div>
        <p className="text-sm font-medium text-paper">Voice teaching</p>
        <p className="mt-1 text-sm text-fog">
          Teach Dhaga how you spell names it keeps mishearing. Add the correct
          spelling, plus any way it gets mis-transcribed (comma-separated).
        </p>
      </div>

      <form
        key={`new:${resetKey}`}
        action={handleAdd}
        className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1.5fr_auto] sm:items-end"
      >
        <label className="block text-xs text-fog">
          Term
          <Input className="mt-1 h-9" name="term" placeholder="Anchit" required />
        </label>
        <label className="block text-xs text-fog">
          Heard as (optional)
          <Input className="mt-1 h-9" name="aliases" placeholder="An chit, Ankit" />
        </label>
        <AddButton />
      </form>

      {terms.length > 0 ? (
        <ul className="divide-y divide-seam border-t border-seam">
          {terms.map((t) => (
            <li key={t.term} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm text-paper">{t.term}</p>
                {t.aliases.length > 0 ? (
                  <p className="truncate text-xs text-fog">heard as {t.aliases.join(", ")}</p>
                ) : null}
              </div>
              <form action={removeVocabTermAction} className="shrink-0">
                <input type="hidden" name="term" value={t.term} />
                <RemoveButton />
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="border-t border-seam pt-4 text-xs text-fog">No taught terms yet.</p>
      )}

      {terms.length > 0 ? (
        <form action={clearVocabAction} className="flex justify-end border-t border-seam pt-4">
          <ClearAllButton />
        </form>
      ) : null}
    </div>
  );
}
