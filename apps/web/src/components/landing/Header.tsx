import Link from "next/link";
import { ModeToggle } from "@/components/brand/ModeToggle";
import { ThreadMark } from "@/components/brand/ThreadMark";
import { HeaderAuthActions } from "@/components/landing/HeaderAuthActions";
import { ResourcesMenu } from "@/components/landing/ResourcesMenu";
import { MobileNav } from "@/components/landing/MobileNav";
import { SESSION_HINT_SCRIPT } from "@/lib/auth/session-hint";
import { NAV_LINKS } from "@/utils/constants/landing";
import type { ReactElement } from "react";

export function Header(): ReactElement {
  return (
    // Near-opaque, not a fade-to-transparent gradient: the bar is fixed, so
    // everything the page scrolls under it used to read straight through —
    // body copy collided with the wordmark and the toggle on every long page,
    // and a dark section passing behind turned the light-mode bar dark and
    // dropped the wordmark to near-zero contrast. `ink` is the page ground, so
    // at the top of the page this looks exactly as it did before.
    <header className="fixed inset-x-0 top-0 z-40 bg-ink/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-4 py-4 sm:px-6">
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
          <HeaderAuthActions />
          <MobileNav />
        </div>
      </div>
      {/* Runs while the browser parses this HTML, so the signed-in header is
          already correct at the first paint. Must stay outside the flex row. */}
      <script dangerouslySetInnerHTML={{ __html: SESSION_HINT_SCRIPT }} />
    </header>
  );
}
