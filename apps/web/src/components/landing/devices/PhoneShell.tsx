import type { ReactNode } from "react";

/** iPhone-style frame; parent controls width, content fills the screen. */
export function PhoneShell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`font-ui relative overflow-hidden rounded-[2.4rem] border border-wash/15 bg-ink shadow-[0_1px_0_rgba(255,255,255,0.08)_inset,0_40px_100px_-20px_rgba(0,0,0,0.9)] ring-4 ring-black/60 ${className}`}
    >
      {/* dynamic island */}
      <div className="absolute left-1/2 top-2.5 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-black" />
      <div className="aspect-[9/19] w-full overflow-hidden">{children}</div>
      {/* home indicator */}
      <div className="absolute bottom-1.5 left-1/2 h-1 w-24 -translate-x-1/2 rounded-full bg-paper/25" />
    </div>
  );
}
