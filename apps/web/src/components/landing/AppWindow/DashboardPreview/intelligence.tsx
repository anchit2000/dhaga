import { MOCK_HOME_CONFIRMATIONS, MOCK_HOME_SIGNALS } from "@/utils/constants/landing";

export function ConfirmationsTile() {
  return (
    <section className="rounded-lg border border-magic/25 bg-magic/[0.035] p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-paper">To confirm</span>
        <span className="font-mono text-[7px] uppercase tracking-wider text-magic">
          {MOCK_HOME_CONFIRMATIONS.length} pending
        </span>
      </div>
      <div className="mt-2 space-y-2">
        {MOCK_HOME_CONFIRMATIONS.map((item) => (
          <div key={item.claim}>
            <p className="font-mono text-[7px] uppercase tracking-wider text-fog">{item.contact}</p>
            <p className="mt-0.5 text-[8px] leading-snug text-paper">
              {item.claim} <span className="text-fog">· {item.kind}</span>
            </p>
          </div>
        ))}
      </div>
      <p className="mt-2 border-t border-seam pt-2 text-[8px] text-magic">Review</p>
    </section>
  );
}

export function SignalsTile() {
  return (
    <section className="rounded-lg border border-magic/25 bg-magic/[0.035] p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-paper">Signals</span>
        <span className="font-mono text-[7px] uppercase tracking-wider text-fog">
          {MOCK_HOME_SIGNALS.length} new
        </span>
      </div>
      <div className="mt-2 space-y-1.5">
        {MOCK_HOME_SIGNALS.map((signal) => (
          <div key={signal.name} className="rounded-md border border-magic/25 bg-magic/[0.05] p-1.5">
            <p className="truncate text-[8px] font-medium text-paper">
              <span className="text-magic">{signal.kind}</span> · {signal.name}
            </p>
            <p className="mt-0.5 truncate text-[7px] text-fog">{signal.headline}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 border-t border-seam pt-2 text-[8px] text-magic">View all people</p>
    </section>
  );
}
