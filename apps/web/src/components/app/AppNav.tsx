"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { ThreadMark } from "@/components/brand/ThreadMark";
import { cn } from "@/lib/utils";
import { APP_NAV_LINKS } from "@/utils/constants/app";

/** App-shell header: brand, section nav (scrollable on mobile), sign out. */
export function AppNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const links = isAdmin
    ? [...APP_NAV_LINKS, { href: "/app/admin", label: "Admin" }]
    : APP_NAV_LINKS;

  return (
    <header className="sticky top-0 z-40 border-b border-seam bg-ink/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4 sm:px-6">
        <Link
          href="/app/people"
          className="flex items-center gap-2 font-display text-lg tracking-tight text-paper"
        >
          <ThreadMark size={20} />
          dhaga
        </Link>
        <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {links.map((link) => {
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
        <button
          type="button"
          onClick={() => {
            void authClient.signOut().then(() => router.push("/login"));
          }}
          className="whitespace-nowrap text-sm text-fog transition-colors hover:text-paper"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
