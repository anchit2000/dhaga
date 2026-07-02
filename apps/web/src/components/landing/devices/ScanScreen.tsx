const EXTRACTED_FIELDS = [
  { label: "Name", value: "Nisha Shah" },
  { label: "Company", value: "Meridian Capital" },
  { label: "Email", value: "nisha@meridian.vc" },
];

/** Phone screen: business card in the viewfinder, scan line, fields extracting. */
export function ScanScreen() {
  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-panel-2 to-ink px-4 pb-8 pt-10">
      <p className="text-center font-mono text-[9px] uppercase tracking-[0.2em] text-amber">
        Scanning · Web Summit 2026
      </p>

      {/* viewfinder */}
      <div className="relative mt-4 rounded-xl border-2 border-dashed border-amber/40 p-3">
        <div className="rounded-md bg-[#efe9dc] p-3 text-ink shadow-inner">
          <p className="font-display text-sm font-medium">Nisha Shah</p>
          <p className="text-[9px] text-ink/70">Principal · Meridian Capital</p>
          <div className="mt-2 space-y-1">
            <div className="h-1 w-3/4 rounded bg-ink/20" />
            <div className="h-1 w-1/2 rounded bg-ink/20" />
          </div>
        </div>
        <div className="pointer-events-none absolute left-2 right-2 h-0.5 rounded-full bg-amber shadow-[0_0_12px_2px_rgba(226,164,76,0.8)] motion-safe:animate-[dhaga-scan_2.8s_ease-in-out_infinite]" />
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
