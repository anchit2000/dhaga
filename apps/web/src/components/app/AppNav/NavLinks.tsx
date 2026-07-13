"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useNavigationFeedback } from "@/components/app/NavigationFeedback";
import { cn } from "@/lib/utils";
import { APP_NAV_LINKS } from "@/utils/constants/app";
import { isNavLinkActive, isNavLinkPending } from "./link-state";

export function NavLinks() {
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
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-colors",
              pending ? "pointer-events-none opacity-70" : null,
              active
                ? "bg-amber/15 font-medium text-amber"
                : "text-fog hover:text-paper",
            )}
          >
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Icon className="size-3.5" />
            )}
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
