"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";
import { APP_NAV_LINKS } from "@/utils/constants/app";

/** App-shell header: brand, section nav (scrollable on mobile), sign out. */
export function AppNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-seam bg-ink/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4 sm:px-6">
        <Link
          href="/app/people"
          className="font-display text-lg tracking-tight text-paper"
        >
          dhaga
        </Link>
        <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {APP_NAV_LINKS.map((link) => {
            const active =
              link.href === "/app"
                ? pathname === "/app"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-amber/15 font-medium text-amber"
                    : "text-fog hover:text-paper",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <form action={logout}>
          <button
            type="submit"
            className="whitespace-nowrap text-sm text-fog transition-colors hover:text-paper"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
