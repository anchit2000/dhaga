"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CircleUserRound, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { ThreadMark } from "@/components/brand/ThreadMark";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SearchPalette } from "@/components/app/search/SearchPalette";
import { useNavigationFeedback } from "@/components/app/NavigationFeedback";
import { cn } from "@/lib/utils";
import { APP_NAV_LINKS } from "@/utils/constants/app";

/** App-shell header: brand, section nav (scrollable on mobile), profile menu. */
export function AppNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const { pendingHref } = useNavigationFeedback();

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
        <nav className="flex min-w-0 shrink-0 items-center gap-1 overflow-x-auto">
          {APP_NAV_LINKS.map((link) => {
            const active =
              link.href === "/app"
                ? pathname === "/app"
                : pathname.startsWith(link.href);
            const pending = link.href === "/app"
              ? pendingHref === "/app"
              : pendingHref?.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-colors",
                  pending ? "pointer-events-none opacity-70" : null,
                  active
                    ? "bg-amber/15 font-medium text-amber"
                    : "text-fog hover:text-paper",
                )}
              >
                {pending ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : null}
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex flex-1 justify-center">
          <SearchPalette />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full text-fog hover:text-paper"
              />
            }
          >
            <CircleUserRound className="size-5" />
            <span className="sr-only">Account menu</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem render={<Link href="/app/settings" />}>
              Settings
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem render={<Link href="/app/admin" />}>
                Admin
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={signingOut}
              onClick={() => {
                if (signingOut) return;
                setSigningOut(true);
                void authClient.signOut().then(({ error }) => {
                  if (error) {
                    setSigningOut(false);
                    return;
                  }
                  router.replace("/login");
                  router.refresh();
                });
              }}
            >
              {signingOut ? <Loader2 className="size-4 animate-spin" /> : null}
              {signingOut ? "Signing out…" : "Sign out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
