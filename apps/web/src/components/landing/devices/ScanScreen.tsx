import { ScreenHeader, StatusBar, TabBar } from "./PhoneChrome";

const EXTRACTED_FIELDS = [
  { label: "Name", value: "Nisha Shah" },
  { label: "Company", value: "Meridian Capital" },
  { label: "Email", value: "nisha@meridian.vc" },
];

/** Phone screen: a real-proportion business card in the viewfinder, fields extracting. */
export function ScanScreen() {
  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-[#1a1510] to-ink">
      <StatusBar />
      <ScreenHeader title="Scan" chip="Web Summit 2026" />

      <div className="min-h-0 flex-1 overflow-hidden px-4">
        {/* viewfinder with corner brackets */}
        <div className="relative px-1 py-2">
          <Bracket className="left-0 top-0 border-l-2 border-t-2" />
          <Bracket className="right-0 top-0 border-r-2 border-t-2" />
          <Bracket className="bottom-0 left-0 border-b-2 border-l-2" />
          <Bracket className="bottom-0 right-0 border-b-2 border-r-2" />

          {/* the card — real business-card proportions (3.5in × 2in) */}
          <div className="flex aspect-[7/4] rotate-[-1.5deg] flex-col justify-between rounded-md bg-gradient-to-br from-[#faf7f0] to-[#ece5d6] px-3 py-2 text-ink shadow-[0_10px_30px_-8px_rgba(0,0,0,0.7),0_1px_0_rgba(255,255,255,0.6)_inset]">
            <div className="flex items-center justify-between gap-2">
              <span className="flex size-4 shrink-0 items-center justify-center rounded-[3px] bg-[#1f3a33] font-display text-[8px] font-semibold text-[#e8dcc0]">
                M
              </span>
              <span className="truncate whitespace-nowrap font-mono text-[6px] uppercase tracking-[0.18em] text-ink/50">
                Meridian Capital
              </span>
            </div>
            <div>
              <p className="font-display text-[13px] font-semibold leading-none tracking-tight">
                Nisha Shah
              </p>
              <p className="mt-0.5 whitespace-nowrap text-[6.5px] uppercase tracking-[0.12em] text-ink/60">
                Principal · Early Stage
              </p>
            </div>
            <div className="flex items-end justify-between gap-2 border-t border-ink/10 pt-1">
              <p className="min-w-0 truncate whitespace-nowrap text-[6px] leading-snug text-ink/70">
                nisha@meridian.vc · meridian.vc
              </p>
              <div className="grid shrink-0 grid-cols-4 gap-[1px]" aria-hidden="true">
                {QR_DOTS.map((on, i) => (
                  <span key={i} className={`size-[2.5px] ${on ? "bg-ink/70" : "bg-transparent"}`} />
                ))}
              </div>
            </div>
          </div>

          <div className="pointer-events-none absolute left-2 right-2 h-0.5 rounded-full bg-amber shadow-[0_0_14px_3px_rgba(226,164,76,0.75)] motion-safe:animate-[dhaga-scan_2.8s_ease-in-out_infinite]" />
        </div>

        {/* extracted fields */}
        <div className="mt-3 space-y-1.5">
          {EXTRACTED_FIELDS.map((field, i) => (
            <div
              key={field.label}
              className="flex items-center justify-between gap-3 rounded-lg border border-seam bg-panel px-3 py-1.5 opacity-0 motion-safe:animate-[dhaga-rise_0.5s_ease-out_forwards] motion-reduce:opacity-100"
              style={{ animationDelay: `${0.4 + i * 0.35}s` }}
            >
              <span className="shrink-0 text-[8px] uppercase tracking-wider text-fog">
                {field.label}
              </span>
              <span className="flex min-w-0 items-center gap-1.5 text-[10px] text-paper">
                <span className="truncate whitespace-nowrap">{field.value}</span>
                <span className="shrink-0 text-amber">✓</span>
              </span>
            </div>
          ))}
        </div>

        <div className="mt-3 whitespace-nowrap rounded-full bg-gradient-to-b from-[#f0bc6e] to-[#d18f36] py-2 text-center text-[11px] font-semibold text-ink shadow-lg">
          Save contact
        </div>
      </div>

      <TabBar active="scan" />
    </div>
  );
}

function Bracket({ className }: { className: string }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute z-10 size-4 rounded-[2px] border-amber/90 ${className}`}
    />
  );
}

const QR_DOTS = [
  true, true, false, true,
  false, true, true, false,
  true, false, true, true,
  true, true, false, true,
];
