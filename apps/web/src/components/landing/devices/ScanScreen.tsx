const EXTRACTED_FIELDS = [
  { label: "Name", value: "Nisha Shah" },
  { label: "Company", value: "Meridian Capital" },
  { label: "Email", value: "nisha@meridian.vc" },
];

/** Phone screen: a realistic business card in a bracket viewfinder, scan line, fields extracting. */
export function ScanScreen() {
  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-[#1a1510] to-ink px-4 pb-8 pt-10">
      <p className="text-center font-mono text-[9px] uppercase tracking-[0.2em] text-amber">
        Scanning · Web Summit 2026
      </p>

      {/* viewfinder with corner brackets */}
      <div className="relative mt-4 px-1 py-2">
        <Bracket className="left-0 top-0 border-l-2 border-t-2" />
        <Bracket className="right-0 top-0 border-r-2 border-t-2" />
        <Bracket className="bottom-0 left-0 border-b-2 border-l-2" />
        <Bracket className="bottom-0 right-0 border-b-2 border-r-2" />

        {/* the card — real business-card proportions (3.5in × 2in) */}
        <div className="flex aspect-[7/4] rotate-[-1.5deg] flex-col justify-between rounded-md bg-gradient-to-br from-[#faf7f0] to-[#ece5d6] px-3 py-2 text-ink shadow-[0_10px_30px_-8px_rgba(0,0,0,0.7),0_1px_0_rgba(255,255,255,0.6)_inset]">
          <div className="flex items-center justify-between">
            <span className="flex size-4 items-center justify-center rounded-[3px] bg-[#1f3a33] font-display text-[8px] font-semibold text-[#e8dcc0]">
              M
            </span>
            <span className="font-mono text-[6px] uppercase tracking-[0.2em] text-ink/50">
              Meridian Capital
            </span>
          </div>
          <div>
            <p className="font-display text-[13px] font-semibold leading-none tracking-tight">
              Nisha Shah
            </p>
            <p className="mt-0.5 text-[6.5px] uppercase tracking-[0.14em] text-ink/60">
              Principal · Early Stage
            </p>
          </div>
          <div className="flex items-end justify-between border-t border-ink/10 pt-1">
            <div className="text-[6px] leading-snug text-ink/70">
              <p>nisha@meridian.vc · +65 8123 4567</p>
            </div>
            <div className="grid grid-cols-4 gap-[1px]" aria-hidden="true">
              {QR_DOTS.map((on, i) => (
                <span key={i} className={`size-[2.5px] ${on ? "bg-ink/70" : "bg-transparent"}`} />
              ))}
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute left-2 right-2 h-0.5 rounded-full bg-amber shadow-[0_0_14px_3px_rgba(226,164,76,0.75)] motion-safe:animate-[dhaga-scan_2.8s_ease-in-out_infinite]" />
      </div>

      {/* extracted fields */}
      <div className="mt-5 space-y-2">
        {EXTRACTED_FIELDS.map((field, i) => (
          <div
            key={field.label}
            className="flex items-center justify-between rounded-lg border border-seam bg-panel px-3 py-2 opacity-0 motion-safe:animate-[dhaga-rise_0.5s_ease-out_forwards] motion-reduce:opacity-100"
            style={{ animationDelay: `${0.4 + i * 0.35}s` }}
          >
            <span className="text-[9px] uppercase tracking-wider text-fog">
              {field.label}
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-paper">
              {field.value}
              <span className="text-amber">✓</span>
            </span>
          </div>
        ))}
      </div>

      <div className="mt-auto rounded-full bg-gradient-to-b from-[#f0bc6e] to-[#d18f36] py-2.5 text-center text-xs font-semibold text-ink shadow-lg">
        Save to Web Summit 2026
      </div>
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
