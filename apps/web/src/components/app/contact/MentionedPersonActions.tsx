"use client";

import { useState } from "react";
import {
  mergeMentionedContactAction,
  promoteMentionedContactAction,
} from "@/lib/actions/contacts";
import type { ContactIdentityCandidate } from "@/lib/repo/contacts";

export function MentionedPersonActions({
  contactId,
  name,
  candidates,
}: {
  contactId: string;
  name: string;
  candidates: ContactIdentityCandidate[];
}) {
  const [mergeOpen, setMergeOpen] = useState(false);
  return (
    <section className="rounded-2xl border border-amber/30 bg-amber/[0.06] p-4 sm:p-5">
      <p className="font-display text-lg">Mentioned person</p>
      <p className="mt-1 text-sm text-fog">
        {name} was extracted from a note and is not in your People list yet.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <form action={promoteMentionedContactAction}>
          <input type="hidden" name="contactId" value={contactId} />
          <button className="h-8 rounded-full bg-amber px-3 text-xs font-semibold text-ink">
            Add to People
          </button>
        </form>
        {candidates.length > 0 ? (
          <button
            type="button"
            onClick={() => setMergeOpen((open) => !open)}
            className="h-8 rounded-full border border-seam px-3 text-xs text-paper"
          >
            Merge with existing
          </button>
        ) : null}
      </div>
      {mergeOpen ? (
        <form action={mergeMentionedContactAction} className="mt-3 flex flex-wrap gap-2">
          <input type="hidden" name="mentionId" value={contactId} />
          <select
            name="targetId"
            required
            aria-label="Existing person to merge with"
            className="h-9 min-w-56 rounded-full border border-seam bg-well px-3 text-xs"
          >
            <option value="">Choose the same person…</option>
            {candidates.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name}
                {[candidate.title, candidate.companyName].filter(Boolean).length
                  ? ` — ${[candidate.title, candidate.companyName].filter(Boolean).join(" · ")}`
                  : ""}
              </option>
            ))}
          </select>
          <button className="h-9 rounded-full border border-amber/40 px-3 text-xs text-ember">
            Merge relationships
          </button>
        </form>
      ) : null}
    </section>
  );
}
