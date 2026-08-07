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
    // Two breakpoints, because the row is genuinely over-subscribed: the pills
    // themselves appear at lg (below it they live in MobileMenu's sheet, so
    // nothing is unreachable), and their LABELS only at xl. At sm–lg the six
    // labelled pills used to clip mid-word ("Confirmations" down to its icon,
    // "Map" to "M") and crush the centred search pill to a sliver; at lg the
    // labels alone are ~580px, which still leaves the search nothing.
    <nav className="hidden min-w-0 items-center gap-1 overflow-x-auto lg:flex">
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
              "size-11 xl:size-auto xl:justify-start xl:gap-1.5 xl:whitespace-nowrap xl:px-3 xl:py-1.5",
              pending ? "pointer-events-none opacity-70" : null,
              active
                ? "bg-amber/15 font-medium text-ember"
                : "text-fog hover:text-paper",
            )}
          >
            {pending ? (
              <Loader2 className="size-5 animate-spin xl:size-3.5" />
            ) : (
              <Icon className="size-5 xl:size-3.5" />
            )}
            {/* Kept in the a11y tree at every width (screen readers still
                announce the label); only visually hidden on mobile. */}
            <span className="sr-only xl:not-sr-only">{link.label}</span>
            {link.href === "/app/confirmations" ? (
              <NavBadge
                count={confirmationsCount}
                className="absolute right-1 top-1 xl:static"
              />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
