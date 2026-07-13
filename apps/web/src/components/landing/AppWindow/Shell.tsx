import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";

/**
 * Desktop app chrome: traffic lights + sidebar + swappable content pane.
 * Used by the hero (Feed + ProfileRail) and the scroll story (scene panes).
 */
export function Shell({
  children,
  showSidebar = true,
  className = "",
}: {
  children: ReactNode;
  showSidebar?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`font-ui overflow-hidden rounded-2xl border border-wash/10 bg-gradient-to-b from-panel to-panel-2 shadow-[0_1px_0_rgba(255,255,255,0.06)_inset,0_50px_140px_-30px_rgba(0,0,0,0.9)] ring-1 ring-black/40 ${className}`}
    >
      <div className="flex items-center gap-1.5 border-b border-wash/[0.07] bg-panel-2/80 px-4 py-2.5 backdrop-blur">
        <span className="size-2.5 rounded-full bg-[#f2635a]/80" />
        <span className="size-2.5 rounded-full bg-[#f5bd4f]/80" />
        <span className="size-2.5 rounded-full bg-[#61c454]/80" />
        <span className="ml-3 font-mono text-[10px] text-fog/60">
          dhaga — your network, threaded
        </span>
      </div>
      <div className="flex min-h-[320px]">
        {showSidebar ? <Sidebar /> : null}
        {children}
      </div>
    </div>
  );
}
