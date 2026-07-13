import { MOCK_CIRCLES } from "@/utils/constants/landing";

export function Sidebar() {
  return (
    <div className="hidden w-44 shrink-0 flex-col border-r border-seam bg-panel-2/60 p-3 text-left sm:flex">
      <div className="flex items-center gap-1.5 rounded-md border border-seam bg-well/60 px-2.5 py-1.5 text-fog">
        <SearchIcon />
        <span className="text-xs">Search</span>
      </div>
      <nav className="mt-3 space-y-0.5 text-xs">
        <div className="rounded-md bg-seam/60 px-2.5 py-1.5 font-medium text-paper">
          Home
        </div>
        <div className="px-2.5 py-1.5 text-fog">People</div>
        <div className="px-2.5 py-1.5 text-fog">Notes</div>
        <div className="px-2.5 py-1.5 text-fog">Ask</div>
      </nav>
      <p className="mt-4 px-2.5 font-mono text-[10px] uppercase tracking-widest text-fog/70">
        Circles
      </p>
      <div className="mt-1 space-y-0.5 text-xs">
        {MOCK_CIRCLES.map((circle) => (
          <div key={circle.name} className="flex items-center gap-2 px-2.5 py-1.5 text-fog">
            <span
              className="size-1.5 rounded-full"
              style={{ backgroundColor: circle.dot }}
            />
            {circle.name}
          </div>
        ))}
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
