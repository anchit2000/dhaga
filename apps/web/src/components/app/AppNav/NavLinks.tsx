"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useNavigationFeedback } from "@/components/app/NavigationFeedback";
import { cn } from "@/lib/utils";
import { APP_NAV_LINKS } from "@/utils/constants/app";
import { NavBadge } from "./NavBadge";
import { isNavLinkActive, isNavLinkPending } from "./link-state";

export function NavLinks({ confirmationsCount }: { confirmationsCount: number }) {
  const pathname = usePathname();
  const { pendingHref } = useNavigationFeedback();

  return (
    <nav className="flex min-w-0 items-center gap-1 overflow-x-auto">
      {APP_NAV_LINKS.map((link) => {
        const active = isNavLinkActive(link.href, pathname);
        const pending = isNavLinkPending(link.href, pendingHref);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            data-tour={link.href === "/app/graph" ? "graph" : undefined}
            title={link.label}
            className={cn(
              "relative flex items-center justify-center rounded-full text-sm transition-colors",
              // Mobile: icon-only, 44×44 touch target. sm+: revert to the
              // labelled pill (whitespace/padding/gap/alignment as before).
              "size-11 sm:size-auto sm:justify-start sm:gap-1.5 sm:whitespace-nowrap sm:px-3 sm:py-1.5",
              pending ? "pointer-events-none opacity-70" : null,
              active
                ? "bg-amber/15 font-medium text-ember"
                : "text-fog hover:text-paper",
            )}
          >
            {pending ? (
              <Loader2 className="size-5 animate-spin sm:size-3.5" />
            ) : (
              <Icon className="size-5 sm:size-3.5" />
            )}
            {/* Kept in the a11y tree at every width (screen readers still
                announce the label); only visually hidden on mobile. */}
            <span className="sr-only sm:not-sr-only">{link.label}</span>
            {link.href === "/app/confirmations" ? (
              <NavBadge
                count={confirmationsCount}
                className="absolute right-1 top-1 sm:static"
              />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
