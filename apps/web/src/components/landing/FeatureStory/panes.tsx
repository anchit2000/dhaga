import { Headshot } from "../Headshot";

/** Desktop pane: natural-language search with cited answers. */
export function SearchPane() {
  return (
    <div className="flex min-w-0 flex-1 flex-col p-5">
      <div className="flex items-baseline gap-2.5 rounded-lg border border-amber/40 bg-ink/70 px-4 py-3 font-mono text-sm shadow-[0_0_24px_-8px_rgba(226,164,76,0.5)]">
        <span className="text-ember">ask&gt;</span>
        <span className="text-paper">
          who do I know in logistics?
          <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-amber align-middle" />
        </span>
      </div>
      <div className="mt-4 space-y-3">
        {[
          {
            personId: "priya",
            name: "Priya Nair",
            line: "Head of Ops at Freightline · met at TechInAsia, Oct 2025",
            receipt: "“…runs ops for a freight forwarder, evaluating route-optimisation AI…”",
          },
          {
            personId: "kavya",
            name: "Kavya Singh",
            line: "BD at Portside · met at Web Summit 2026",
            receipt: "“…building carrier integrations, asked about our SDK…”",
          },
        ].map((result, i) => (
          <div
            key={result.personId}
            className="flex gap-3 rounded-xl border border-seam bg-panel p-3.5 opacity-0 motion-safe:animate-[dhaga-rise_0.5s_ease-out_forwards] motion-reduce:opacity-100"
            style={{ animationDelay: `${0.3 + i * 0.3}s` }}
          >
            <Headshot personId={result.personId} className="size-10" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-paper">{result.name}</p>
              <p className="text-xs text-fog">{result.line}</p>
              <p className="mt-1.5 border-l-2 border-amber/60 pl-2 text-[11px] italic text-fog/90">
                {result.receipt}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Desktop pane: the same-evening follow-up draft. */
export function DraftPane() {
  return (
    <div className="flex min-w-0 flex-1 flex-col p-5">
      <div className="overflow-hidden rounded-xl border border-seam bg-panel shadow-lg">
        <div className="flex items-center justify-between border-b border-seam px-4 py-2.5">
          <span className="text-xs font-medium text-paper">New message</span>
          <span className="font-mono text-[10px] text-fog/60">draft · 21:42</span>
        </div>
        <div className="space-y-2.5 px-4 py-3 text-xs">
          <p className="flex items-center gap-2 text-fog">
            To: <Headshot personId="sarah" className="size-5" />
            <span className="text-paper">Sarah Chen</span>
          </p>
          <p className="text-fog">
            Subject: <span className="text-paper">Great meeting you at Web Summit</span>
          </p>
          <div className="space-y-2 border-t border-seam pt-3 leading-relaxed text-fog">
            <p>Sarah — really enjoyed our chat by the API booth.</p>
            <p className="rounded-md border-l-2 border-amber bg-amber/10 px-2.5 py-1.5 text-paper">
              Congratulations on the leap from Stripe — and good luck getting the
              boat out before March. 🙂
            </p>
            <p>
              You mentioned onboarding flows were the pain point — here&apos;s the
              15-minute demo I promised.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-seam px-4 py-2.5">
          <span className="text-[10px] italic text-fog/70">
            built from your voice note · edit anything
          </span>
          <span className="rounded-full bg-gradient-to-b from-[#f0bc6e] to-[#d18f36] px-4 py-1.5 text-[11px] font-semibold text-on-accent shadow">
            Send
          </span>
        </div>
      </div>
    </div>
  );
}
