import {
  Bell,
  CircleUserRound,
  Ellipsis,
  Menu,
  Moon,
  Search,
  UserPlus,
} from "lucide-react";

import { ThreadMark } from "@/components/brand/ThreadMark";
import { MOCK_PREVIEW_NAV } from "@/utils/constants/landing";

export function AppPreviewNav() {
  return (
    <div className="flex h-14 items-center gap-2 border-b border-seam bg-panel/80 px-3">
      <span className="flex items-center gap-1.5 font-display text-xs text-paper">
        <ThreadMark size={14} /> <span className="hidden sm:inline">dhaga</span>
      </span>
      <div className="hidden items-center gap-0.5 sm:flex">
        {MOCK_PREVIEW_NAV.map(({ label, icon: Icon, active }) => (
          <span
            key={label}
            className={`flex items-center gap-1 rounded-full px-1.5 py-1 text-[7px] ${active ? "bg-amber/15 text-ember" : "text-fog"}`}
          >
            {Icon ? <Icon className="size-2.5" /> : null}
            {label}
          </span>
        ))}
      </div>
      <div className="ml-auto hidden min-w-24 flex-1 items-center gap-1.5 rounded-full border border-seam bg-well px-2.5 py-1 text-fog sm:flex">
        <Search className="size-3" />
        <span className="truncate text-[8px]">Search your network…</span>
        <span className="ml-auto rounded border border-seam px-1 font-mono text-[6px]">⌘K</span>
      </div>
      <span className="hidden items-center gap-1 rounded-full bg-amber px-2 py-1 text-[7px] text-on-accent sm:flex">
        <UserPlus className="size-2.5" /> Add
      </span>
      <span className="text-fog sm:hidden"><Search className="size-4" /></span>
      <span className="text-fog sm:hidden"><Menu className="size-4" /></span>
      <span className="relative text-fog">
        <Bell className="size-3.5" />
        <span className="absolute -right-1.5 -top-1.5 flex size-3 items-center justify-center rounded-full bg-amber font-mono text-[6px] text-on-accent">2</span>
      </span>
      <span className="hidden text-fog sm:inline"><Moon className="size-3.5" /></span>
      <span className="hidden text-fog sm:inline"><Ellipsis className="size-3.5" /></span>
      <span className="text-fog"><CircleUserRound className="size-4" /></span>
    </div>
  );
}
