import {
  MOCK_HOME_INBOX,
  MOCK_HOME_QUIET,
  MOCK_HOME_SIGNALS,
} from "@/utils/constants/landing";

/**
 * The hero shot's proactive-intelligence tiles — the surfaces that make Home
 * read as more than a contacts list. Same miniature scale and tokens as the
 * core tiles; mock data lives in utils/constants/landing/appmock.ts.
 */

/** Lead banner: the relationship inbox — an ambiguous edge awaiting a pick. */
export function InboxBanner() {
  return (
    <section className="col-span-3 rounded-lg border border-amber/25 bg-panel p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium text-paper">Relationships to confirm</span>
        <span className="font-mono text-[8px] uppercase tracking-widest text-fog">1 to confirm</span>
      </div>
      <p className="mt-1.5 text-[9px] text-paper">
        <span className="font-medium">{MOCK_HOME_INBOX.src}</span>
        <span className="text-fog"> — {MOCK_HOME_INBOX.predicate} — </span>
        <span className="font-medium">&ldquo;{MOCK_HOME_INBOX.object}&rdquo;</span>
        <span className="text-fog"> · which one?</span>
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {MOCK_HOME_INBOX.candidates.map((candidate) => (
          <span key={candidate} className="rounded-full border border-seam bg-wash/[0.04] px-2 py-0.5 text-[8px] text-paper">
            {candidate}
          </span>
        ))}
        <span className="rounded-full border border-seam px-2 py-0.5 text-[8px] text-fog">Dismiss</span>
      </div>
    </section>
  );
}

/** Intelligence tile: job-change / news signals across the graph. */
export function SignalsTile() {
  return (
    <section className="rounded-lg border border-seam bg-panel p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium text-paper">Signals</span>
        <span className="font-mono text-[8px] uppercase tracking-widest text-fog">{MOCK_HOME_SIGNALS.length} new</span>
      </div>
      <div className="mt-2 space-y-1.5">
        {MOCK_HOME_SIGNALS.map((signal) => (
          <div key={signal.name} className="rounded-md border border-amber/25 bg-amber/[0.05] p-1.5">
            <div className="flex items-center gap-1.5">
              <span className="shrink-0 rounded-full border border-amber/40 px-1.5 py-0.5 text-[7px] text-ember">{signal.kind}</span>
              <span className="truncate text-[8px] font-medium text-paper">{signal.name}</span>
              <span className="truncate text-[7px] text-fog">{signal.company}</span>
            </div>
            <p className="mt-1 text-[8px] leading-snug text-paper">{signal.headline}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Intelligence tile: valuable relationships going quiet. */
export function GoingQuietTile() {
  return (
    <section className="rounded-lg border border-seam bg-panel p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium text-paper">Going quiet</span>
        <span className="font-mono text-[8px] uppercase tracking-widest text-fog">{MOCK_HOME_QUIET.length} fading</span>
      </div>
      <div className="mt-2 divide-y divide-seam">
        {MOCK_HOME_QUIET.map((person) => (
          <div key={person.name} className="flex items-center gap-2 py-1.5 first:pt-0 last:pb-0">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[9px] text-paper">{person.name}</p>
              <p className="truncate text-[8px] text-fog">{person.detail} · last touch {person.lastTouch}</p>
            </div>
            <span className="shrink-0 rounded-full border border-seam px-1.5 py-0.5 text-[7px] text-fog">{person.strength} · {person.score}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
