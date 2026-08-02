import type { ReactNode } from "react";

/**
 * Neutral crop frame around the real dashboard preview. App-owned navigation
 * is rendered by DashboardPreview itself; there is no invented browser chrome.
 */
export function Shell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`font-ui overflow-hidden rounded-2xl border border-seam bg-ink shadow-[0_50px_140px_-30px_var(--shadow-cast)] ${className}`}
    >
      <div className="flex min-h-[320px]">{children}</div>
    </div>
  );
}
