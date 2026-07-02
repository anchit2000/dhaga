import { Headshot } from "../Headshot";
import { GRAPH_FACTS } from "@/utils/constants/landing/graph";

const WAVE_BARS = [0.5, 0.9, 0.6, 1, 0.7, 0.4, 0.85, 0.55, 0.95, 0.65, 0.45, 0.8, 0.6, 0.9, 0.5, 0.75];

/** Phone screen: voice note recording → facts with receipts. */
export function VoiceScreen() {
  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-panel-2 to-ink px-4 pb-8 pt-10">
      <div className="flex items-center gap-2.5">
        <Headshot personId="rohan" className="size-9" />
        <div>
          <p className="text-xs font-medium text-paper">Rohan Mehta</p>
          <p className="font-mono text-[9px] text-amber">
            <span className="mr-1 inline-block size-1.5 animate-pulse rounded-full bg-red-400 align-middle" />
            Recording voice note · 0:23
          </p>
        </div>
      </div>

      <div className="mt-4 flex h-10 items-center justify-center gap-[3px] rounded-xl border border-seam bg-panel px-3">
        {WAVE_BARS.map((height, i) => (
          <span
            key={i}
            className="w-[3px] rounded-full bg-amber/80 motion-safe:animate-[dhaga-wave_1.1s_ease-in-out_infinite]"
            style={{ height: `${height * 22}px`, animationDelay: `${i * 0.08}s` }}
          />
        ))}
      </div>

      <p className="mt-4 rounded-lg border border-seam bg-panel/60 p-3 text-[10px] italic leading-relaxed text-fog">
        “…runs ops for a freight forwarder, they&apos;re evaluating
        route-optimisation AI next quarter, and he intro&apos;d me to their CTO…”
      </p>

      <p className="mt-4 text-center font-mono text-[9px] uppercase tracking-widest text-fog/60">
        ↓ extracted, with receipts
      </p>

      <div className="mt-2 space-y-2">
        {GRAPH_FACTS.map((fact, i) => (
          <div
            key={fact}
            className="rounded-lg border-l-2 border-amber bg-panel px-3 py-2 opacity-0 motion-safe:animate-[dhaga-rise_0.5s_ease-out_forwards] motion-reduce:opacity-100"
            style={{ animationDelay: `${0.5 + i * 0.4}s` }}
          >
            <p className="text-[10px] leading-snug text-paper">{fact}</p>
            <p className="text-[8px] italic text-fog/70">voice note · 0:23 · tap to hear</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Phone screen: push-notification stack. */
export function AlertsScreen() {
  return (
    <div className="flex h-full flex-col justify-center gap-3 bg-gradient-to-b from-panel-2 to-ink px-4 pb-8 pt-10">
      <p className="mb-2 text-center font-display text-3xl text-paper/90">09:41</p>
      {[
        { personId: "sarah", title: "Job change", body: "Sarah Chen left Stripe — draft a congrats note?", time: "now" },
        { personId: "priya", title: "Reconnect", body: "Priya Nair is back from Singapore today.", time: "2m" },
        { personId: "alice", title: "Going quiet", body: "No contact with Alice in 3 months — she's marked key.", time: "1h" },
      ].map((alert, i) => (
        <div
          key={alert.title}
          className="flex items-start gap-2.5 rounded-2xl border border-paper/10 bg-paper/[0.07] p-3 opacity-0 backdrop-blur motion-safe:animate-[dhaga-rise_0.5s_ease-out_forwards] motion-reduce:opacity-100"
          style={{ animationDelay: `${0.3 + i * 0.35}s` }}
        >
          <Headshot personId={alert.personId} className="size-8" />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[11px] font-semibold text-paper">{alert.title}</p>
              <span className="font-mono text-[8px] text-fog/60">{alert.time}</span>
            </div>
            <p className="text-[10px] leading-snug text-fog">{alert.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Phone idle screen shown while desktop scenes are active. */
export function IdleScreen() {
  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-panel-2 to-ink px-4 pb-8 pt-12">
      <p className="font-display text-lg text-paper">
        dhaga<span className="text-amber">.</span>
      </p>
      <div className="mt-4 space-y-2.5">
        {["sarah", "priya", "rohan", "mei"].map((id, i) => (
          <div key={id} className="flex items-center gap-2.5 rounded-lg border border-seam/60 bg-panel/50 px-2.5 py-2">
            <Headshot personId={id} className="size-7" />
            <div className="h-1.5 rounded bg-paper/10" style={{ width: `${70 - i * 12}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}
