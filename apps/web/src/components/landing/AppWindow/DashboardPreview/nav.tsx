import {
  Bell,
  Ellipsis,
  Moon,
  Search,
  UserPlus,
} from "lucide-react";

import { ThreadMark } from "@/components/brand/ThreadMark";
import { MOCK_PREVIEW_NAV } from "@/utils/constants/landing";

export function AppPreviewNav() {
  return (
    <div className="flex h-11 items-center gap-2 border-b border-seam px-4">
      <span className="flex items-center gap-1.5 font-display text-xs text-paper">
        <ThreadMark size={14} /> dhaga
      </span>
      <div className="flex items-center gap-0.5">
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
      <div className="ml-auto flex min-w-28 flex-1 items-center gap-1.5 rounded-full border border-seam bg-panel px-2.5 py-1 text-fog">
        <Search className="size-3" />
        <span className="truncate text-[8px]">Search your network…</span>
      </div>
      <span className="flex items-center gap-1 rounded-full bg-amber px-2 py-1 text-[7px] text-on-accent">
        <UserPlus className="size-2.5" /> Add
      </span>
      {[Bell, Moon, Ellipsis].map((Icon, index) => (
        <span key={index} className="text-fog"><Icon className="size-3" /></span>
      ))}
      <span className="flex size-5 items-center justify-center rounded-full border border-seam text-[7px] text-fog">AC</span>
    </div>
  );
}
