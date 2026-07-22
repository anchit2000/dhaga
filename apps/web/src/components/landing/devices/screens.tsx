import { Headshot } from "../Headshot";
import { GRAPH_FACTS } from "@/utils/constants/landing/graph";
import { ScreenHeader, StatusBar, TabBar } from "./PhoneChrome";

const WAVE_BARS = [0.5, 0.9, 0.6, 1, 0.7, 0.4, 0.85, 0.55, 0.95, 0.65, 0.45, 0.8, 0.6, 0.9, 0.5, 0.75];

/** Phone screen: voice note recording → facts with receipts. */
export function VoiceScreen() {
  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-panel to-ink">
      <StatusBar />
      <ScreenHeader title="Voice note" chip="0:23 · recording" />
      <div className="min-h-0 flex-1 px-4">
        <div className="flex items-center gap-2.5 rounded-xl border border-seam bg-panel/60 p-2.5">
          <Headshot personId="rohan" className="size-8" />
          <div>
            <p className="text-[11px] font-medium text-paper">Rohan Mehta</p>
            <p className="font-mono text-[8px] text-ember">
              <span className="mr-1 inline-block size-1.5 animate-pulse rounded-full bg-red-400 align-middle" />
              Listening…
            </p>
          </div>
        </div>

        <div className="mt-2.5 flex h-9 items-center justify-center gap-[3px] rounded-xl border border-seam bg-panel px-3">
          {WAVE_BARS.map((height, i) => (
            <span
              key={i}
              className="w-[3px] rounded-full bg-amber/80 motion-safe:animate-[dhaga-wave_1.1s_ease-in-out_infinite]"
              style={{ height: `${height * 20}px`, animationDelay: `${i * 0.08}s` }}
            />
          ))}
        </div>

        <p className="mt-2.5 rounded-lg border border-seam bg-panel/60 p-2.5 text-[9px] italic leading-relaxed text-fog">
          “…runs ops for a freight forwarder, they&apos;re evaluating
          route-optimisation AI next quarter, and he intro&apos;d me to their CTO…”
        </p>

        <p className="mt-2.5 text-center font-mono text-[8px] uppercase tracking-widest text-fog/60">
          ↓ extracted, with receipts
        </p>

        <div className="mt-1.5 space-y-1.5">
          {GRAPH_FACTS.map((fact, i) => (
            <div
              key={fact}
              className="rounded-lg border-l-2 border-amber bg-panel px-2.5 py-1.5 opacity-0 motion-safe:animate-[dhaga-rise_0.5s_ease-out_forwards] motion-reduce:opacity-100"
              style={{ animationDelay: `${0.5 + i * 0.4}s` }}
            >
              <p className="text-[9px] leading-snug text-paper">{fact}</p>
              <p className="text-[7px] italic text-fog/70">voice note · 0:23 · tap to hear</p>
            </div>
          ))}
        </div>
      </div>
      <TabBar active="people" />
    </div>
  );
}

/** Phone screen: the Home tab — proactive alerts. */
export function AlertsScreen() {
  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-panel to-ink">
      <StatusBar />
      <ScreenHeader title="Home" chip="3 new" />
      <div className="min-h-0 flex-1 space-y-2 px-4">
        {[
          { personId: "sarah", title: "Job change", body: "Sarah Chen announced she left Stripe — draft a congrats note?", time: "now" },
          { personId: "priya", title: "Reconnect", body: "Your note: Priya Nair is back from Singapore this week.", time: "2m" },
          { personId: "alice", title: "Going quiet", body: "No contact with Alice in 8 months — a strong tie cooling off.", time: "1h" },
        ].map((alert, i) => (
          <div
            key={alert.title}
            className="flex items-start gap-2.5 rounded-xl border border-wash/10 bg-wash/[0.06] p-2.5 opacity-0 backdrop-blur motion-safe:animate-[dhaga-rise_0.5s_ease-out_forwards] motion-reduce:opacity-100"
            style={{ animationDelay: `${0.3 + i * 0.35}s` }}
          >
            <Headshot personId={alert.personId} className="size-8" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[10px] font-semibold text-paper">{alert.title}</p>
                <span className="font-mono text-[7px] text-fog/60">{alert.time}</span>
              </div>
              <p className="text-[9px] leading-snug text-fog">{alert.body}</p>
              <span className="mt-1.5 inline-block rounded-full border border-amber/40 bg-amber/10 px-2 py-0.5 text-[8px] font-medium text-ember">
                {i === 0 ? "Draft note ✦" : i === 1 ? "Say hi" : "Reach out"}
              </span>
            </div>
          </div>
        ))}
      </div>
      <TabBar active="home" />
    </div>
  );
}

/** Phone idle screen: the People tab, shown while desktop scenes play. */
export function IdleScreen() {
  const rows = [
    { id: "sarah", sub: "ex-Stripe · Web Summit 2026" },
    { id: "priya", sub: "Freightline · TechInAsia" },
    { id: "rohan", sub: "Freight ops · voice note" },
    { id: "mei", sub: "Aerolane · via Priya" },
  ];
  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-panel to-ink">
      <StatusBar />
      <ScreenHeader title="People" chip="212 threads" />
      <div className="min-h-0 flex-1 space-y-1.5 px-4">
        <div className="rounded-full border border-seam bg-panel px-3 py-1.5 text-[9px] text-fog/60">
          Search your people…
        </div>
        {rows.map((row) => (
          <div key={row.id} className="flex items-center gap-2.5 rounded-lg border border-seam/60 bg-panel/50 px-2.5 py-2">
            <Headshot personId={row.id} className="size-7" />
            <div className="min-w-0">
              <p className="truncate text-[10px] font-medium text-paper">
                {row.id === "sarah" ? "Sarah Chen" : row.id === "priya" ? "Priya Nair" : row.id === "rohan" ? "Rohan Mehta" : "Mei Tanaka"}
              </p>
              <p className="truncate text-[8px] text-fog">{row.sub}</p>
            </div>
          </div>
        ))}
      </div>
      <TabBar active="people" />
    </div>
  );
}
