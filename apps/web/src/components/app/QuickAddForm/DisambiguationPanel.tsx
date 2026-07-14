import { attachCapturedNoteAction } from "@/lib/actions/quick-add";
import type { ContactIdentityCandidate } from "@/lib/repo/contacts";

/** Shown when a captured note's name matches more than one existing contact. */
export function DisambiguationPanel({
  matches,
  sourceText,
  onCreateNew,
}: {
  matches: ContactIdentityCandidate[];
  sourceText: string;
  onCreateNew: (formData: FormData) => void;
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-amber/30 bg-panel p-4 sm:p-5">
      <div>
        <h2 className="font-display text-lg">Which person did you mean?</h2>
        <p className="mt-1 text-sm text-fog">
          Several contacts match the name in this note. Choose one before Dhaga extracts relationships.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {matches.map((candidate) => (
          <form key={candidate.id} action={attachCapturedNoteAction}>
            <input type="hidden" name="contactId" value={candidate.id} />
            <input type="hidden" name="raw" value={sourceText} />
            <button className="w-full rounded-xl border border-seam p-3 text-left transition-colors hover:border-amber/40 hover:bg-amber/[0.05]">
              <span className="block text-sm font-medium text-paper">{candidate.name}</span>
              <span className="mt-0.5 block text-xs text-fog">
                {[candidate.title, candidate.companyName].filter(Boolean).join(" · ") || "No title or company"}
              </span>
            </button>
          </form>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            const formData = new FormData();
            formData.set("raw", sourceText);
            formData.set("skipDisambiguation", "true");
            onCreateNew(formData);
          }}
          className="rounded-full border border-seam px-3 py-2 text-xs text-fog hover:text-paper"
        >
          None of these — create someone new
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-full px-3 py-2 text-xs text-fog hover:text-paper"
        >
          Cancel
        </button>
      </div>
    </section>
  );
}
