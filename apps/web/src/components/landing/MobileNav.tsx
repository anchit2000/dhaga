"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ThreadMark } from "@/components/brand/ThreadMark";
import { NAV_LINKS, RESOURCE_ITEMS } from "@/utils/constants/landing";
import type { ReactElement } from "react";

interface MobileNavProps {
  isSignedIn: boolean;
}

// Mobile-only nav: the desktop header nav is `hidden md:flex`, so below 768px
// this hamburger + Sheet is the only way to reach the section anchors, the
// Resources links, and sign in. Rendered `md:hidden` from Header.
export function MobileNav({ isSignedIn }: MobileNavProps): ReactElement {
  const [open, setOpen] = useState(false);
  const closeMenu = (): void => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open menu"
            className="rounded-full text-fog hover:text-paper md:hidden"
          />
        }
      >
        <Menu className="size-5" aria-hidden="true" />
      </SheetTrigger>
      <SheetContent side="right" className="w-4/5 max-w-xs gap-0 border-seam bg-ink">
        <SheetHeader className="border-b border-seam">
          <SheetTitle className="flex items-center gap-2 font-display text-lg text-paper">
            <ThreadMark size={20} />
            <span>
              dhaga<span className="text-amber">.</span>
            </span>
          </SheetTitle>
        </SheetHeader>

        <nav className="flex flex-col gap-1 p-4">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={closeMenu}
              className="rounded-lg px-3 py-3 text-base text-fog transition-colors hover:bg-amber/5 hover:text-paper"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="mt-2 flex flex-col gap-1 border-t border-seam p-4">
          <p className="px-3 pb-1 font-mono text-[11px] uppercase tracking-widest text-fog">
            Resources
          </p>
          {RESOURCE_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMenu}
                className="flex items-center gap-3 rounded-lg px-3 py-3 text-base text-fog transition-colors hover:bg-amber/5 hover:text-paper"
              >
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-seam bg-amber/10 text-amber">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                {item.title}
              </Link>
            );
          })}
        </div>

        <div className="mt-auto flex flex-col gap-2 border-t border-seam p-4">
          {isSignedIn ? (
            <Button render={<Link href="/app" onClick={closeMenu} />} className="w-full">
              Dashboard
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                render={<Link href="/login" onClick={closeMenu} />}
                className="w-full"
              >
                Sign in
              </Button>
              <Button
                render={<Link href="#request-access" onClick={closeMenu} />}
                className="w-full"
              >
                Request access
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
