"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Compass, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/brand/ModeToggle";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { APP_MORE_LINKS, APP_NAV_LINKS } from "@/utils/constants/app";
import { isNavLinkActive } from "./link-state";
import { MobileMenuLink } from "./MobileMenuLink";
import { NavQuickAdd } from "./NavQuickAdd";
import { useStartTour } from "./useStartTour";

/**
 * Below-sm: NavLinks + MoreMenu (both `hidden sm:flex`) collapse into this
 * hamburger Sheet, so every nav destination stays reachable on mobile.
 * Mirrors the landing page's MobileNav (side="right", border-seam/bg-ink).
 */
export function MobileMenu({ confirmationsCount }: { confirmationsCount: number }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const startTour = useStartTour();
  const closeMenu = (): void => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open menu"
            className="rounded-full text-fog hover:text-paper sm:hidden"
          />
        }
      >
        <Menu className="size-5" />
        <span className="sr-only">Open menu</span>
      </SheetTrigger>
      <SheetContent side="right" className="w-4/5 max-w-xs gap-0 border-seam bg-ink">
        <SheetHeader className="border-b border-seam">
          <SheetTitle className="font-display text-lg text-paper">Menu</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-1 overflow-y-auto p-4">
          {APP_NAV_LINKS.map((link) => (
            <MobileMenuLink
              key={link.href}
              href={link.href}
              label={link.label}
              icon={link.icon}
              active={isNavLinkActive(link.href, pathname)}
              badgeCount={link.href === "/app/confirmations" ? confirmationsCount : undefined}
              onNavigate={closeMenu}
            />
          ))}

          <div className="my-2 border-t border-seam" />

          {APP_MORE_LINKS.map((link) => (
            <MobileMenuLink
              key={link.href}
              href={link.href}
              label={link.label}
              icon={link.icon}
              active={isNavLinkActive(link.href, pathname)}
              onNavigate={closeMenu}
            />
          ))}

          <div className="my-2 border-t border-seam" />

          <div className="flex items-center gap-3 px-3 py-2">
            <NavQuickAdd />
            <ModeToggle />
          </div>

          <Button
            variant="ghost"
            onClick={() => {
              startTour();
              closeMenu();
            }}
            className="h-auto min-h-11 w-full justify-start gap-3 rounded-lg px-3 py-2.5 text-base font-normal text-fog hover:bg-amber/5 hover:text-paper"
          >
            <Compass className="size-5" />
            Take the tour
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
