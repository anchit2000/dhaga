import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/brand/ModeToggle";
import { ThreadMark } from "@/components/brand/ThreadMark";
import { ResourcesMenu } from "@/components/landing/ResourcesMenu";
import { MobileNav } from "@/components/landing/MobileNav";
import { NAV_LINKS } from "@/utils/constants/landing";
import type { ReactElement } from "react";

export function Header(): ReactElement {
  return (
    <header className="fixed inset-x-0 top-0 z-40 bg-gradient-to-b from-ink via-ink/80 to-transparent">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-4">
        <Link href="/" className="flex min-h-11 items-center gap-2 font-display text-xl">
          <ThreadMark />
          <span>
            dhaga<span className="text-ember">.</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-1 rounded-full border border-seam bg-panel/80 px-2 py-1 backdrop-blur md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex min-h-11 items-center rounded-full px-4 text-sm text-fog transition-colors hover:text-paper"
            >
              {link.label}
            </Link>
          ))}
          <ResourcesMenu />
        </nav>
        <div className="flex items-center gap-2 sm:gap-4">
          <ModeToggle />
          <Link
            href="/login"
            className="hidden min-h-11 items-center text-sm text-fog transition-colors hover:text-paper sm:flex"
          >
            Sign in
          </Link>
          <Button render={<Link href="#request-access" />} size="sm" className="min-h-11">
            Request early access
          </Button>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
