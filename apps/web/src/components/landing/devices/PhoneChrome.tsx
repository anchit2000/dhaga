/** Shared mobile-app chrome: status bar, screen header, bottom tab bar. */

export function StatusBar() {
  return (
    <div className="flex items-center justify-between px-5 pb-1 pt-3 text-[9px] font-semibold text-paper/90">
      <span>9:41</span>
      <span className="flex items-center gap-1" aria-hidden="true">
        <svg width="12" height="8" viewBox="0 0 16 10" fill="currentColor">
          <rect x="0" y="6" width="3" height="4" rx="0.5" />
          <rect x="4.5" y="4" width="3" height="6" rx="0.5" />
          <rect x="9" y="2" width="3" height="8" rx="0.5" />
          <rect x="13.5" y="0" width="2.5" height="10" rx="0.5" opacity="0.4" />
        </svg>
        <svg width="14" height="8" viewBox="0 0 20 10" fill="none" stroke="currentColor">
          <rect x="0.5" y="0.5" width="16" height="9" rx="2.5" strokeWidth="1" opacity="0.5" />
          <rect x="2" y="2" width="11" height="6" rx="1.5" fill="currentColor" stroke="none" />
          <path d="M18.5 3.5v3" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
        </svg>
      </span>
    </div>
  );
}

export function ScreenHeader({ title, chip }: { title: string; chip?: string }) {
  return (
    <div className="flex items-center justify-between px-4 pb-2 pt-1.5">
      <p className="font-display text-base text-paper">{title}</p>
      {chip ? (
        <span className="rounded-full border border-amber/30 bg-amber/10 px-2 py-0.5 font-mono text-[7.5px] uppercase tracking-widest text-amber">
          {chip}
        </span>
      ) : null}
    </div>
  );
}

const TABS = [
  { id: "home", label: "Home", icon: HomeIcon },
  { id: "people", label: "People", icon: PeopleIcon },
  { id: "scan", label: "Scan", icon: ScanIcon },
  { id: "ask", label: "Ask", icon: AskIcon },
  { id: "circles", label: "Circles", icon: CirclesIcon },
] as const;

export type TabId = (typeof TABS)[number]["id"];

export function TabBar({ active }: { active: TabId }) {
  return (
    <div className="mt-auto flex items-end justify-between border-t border-paper/[0.07] bg-ink/80 px-4 pb-4 pt-1.5 backdrop-blur">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.id === active;
        if (tab.id === "scan") {
          return (
            <span
              key={tab.id}
              className={`-mt-4 flex size-9 items-center justify-center rounded-full text-ink shadow-[0_6px_18px_-4px_rgba(226,164,76,0.7)] ${
                isActive
                  ? "bg-gradient-to-b from-[#f0bc6e] to-[#d18f36] ring-2 ring-amber/40"
                  : "bg-gradient-to-b from-[#f0bc6e] to-[#d18f36]"
              }`}
            >
              <Icon />
            </span>
          );
        }
        return (
          <span
            key={tab.id}
            className={`flex flex-col items-center gap-0.5 text-[7px] ${
              isActive ? "text-amber" : "text-fog/70"
            }`}
          >
            <Icon />
            {tab.label}
          </span>
        );
      })}
    </div>
  );
}

const iconProps = {
  width: 13,
  height: 13,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function HomeIcon() {
  return (
    <svg {...iconProps} aria-hidden="true">
      <path d="M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg {...iconProps} aria-hidden="true">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.5-4 3-6 6.5-6s6 2 6.5 6M16 5a3.5 3.5 0 0 1 0 7M21.5 20c-.3-2.5-1.4-4.3-3.5-5.3" />
    </svg>
  );
}

function ScanIcon() {
  return (
    <svg {...iconProps} width={15} height={15} aria-hidden="true">
      <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M4 12h16" />
    </svg>
  );
}

function AskIcon() {
  return (
    <svg {...iconProps} aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20.5 20.5-4-4" />
    </svg>
  );
}

function CirclesIcon() {
  return (
    <svg {...iconProps} aria-hidden="true">
      <circle cx="9" cy="9" r="5.5" />
      <circle cx="16" cy="15" r="5.5" />
    </svg>
  );
}
