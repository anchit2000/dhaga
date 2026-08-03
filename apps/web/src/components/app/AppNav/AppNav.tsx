"use client";

import Link from "next/link";
import { GlassSurface } from "@/components/ui/glass-surface";
import { ModeToggle } from "@/components/brand/ModeToggle";
import { ThreadMark } from "@/components/brand/ThreadMark";
import { SearchPalette } from "@/components/app/search/SearchPalette";
import type { SearchWeights } from "@/utils/constants/search";
import { FeedbackButton } from "./FeedbackButton";
import { MobileMenu } from "./MobileMenu";
import { MoreMenu } from "./MoreMenu";
import { NavLinks } from "./NavLinks";
import { NavQuickAdd } from "./NavQuickAdd";
import { NotificationBell, type NotificationFeed } from "./NotificationBell";
import { ProfileMenu } from "./ProfileMenu";

/** App-shell header: brand, section nav, centered search, more/profile menus. */
export function AppNav({
  isAdmin,
  initialSearchWeights,
  confirmationsCount,
  notificationFeed,
}: {
  isAdmin: boolean;
  initialSearchWeights: SearchWeights;
  confirmationsCount: number;
  notificationFeed: NotificationFeed;
}) {
  return (
    <header className="sticky top-0 z-40">
      <GlassSurface
        width="100%"
        height={56}
        borderRadius={0}
        backgroundOpacity={0.6}
        blur={8}
        displace={0.5}
        distortionScale={-50}
        redOffset={2}
        greenOffset={3}
        blueOffset={5}
        saturation={1.3}
        className="border-b border-seam"
      >
        <div className="relative mx-auto flex h-full w-full max-w-[1600px] items-center gap-3 px-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/app"
              className="flex shrink-0 items-center gap-2 font-display text-lg tracking-tight text-paper"
            >
              <ThreadMark size={20} />
              {/* Wordmark yields to the icon-only pills on mobile; the mark
                  stays. Kept in the a11y tree so the home link keeps its name. */}
              <span className="sr-only sm:not-sr-only">dhaga</span>
            </Link>
            <NavLinks confirmationsCount={confirmationsCount} />
          </div>

          <div className="flex min-w-0 flex-1 justify-center">
            <div className="w-9 sm:w-full sm:max-w-xl" data-tour="search">
              <SearchPalette initialWeights={initialSearchWeights} />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <MobileMenu confirmationsCount={confirmationsCount} />
            <div className="hidden items-center gap-1 sm:flex">
              <NavQuickAdd />
            </div>
            {/* Stays mounted + visible at every width (unchanged); the
                sm:flex wrappers on either side hide only the desktop-only
                pieces that moved into MobileMenu's sheet below sm:. */}
            <NotificationBell feed={notificationFeed} />
            {/* Beside the bell for the same reason it is: the header is the only
                chrome on every /app route, so feedback is always one tap away
                without adding a floating layer over the capture dock. */}
            <FeedbackButton />
            <div className="hidden items-center gap-1 sm:flex">
              <ModeToggle />
              <MoreMenu />
            </div>
            <ProfileMenu isAdmin={isAdmin} />
          </div>
        </div>
      </GlassSurface>
    </header>
  );
}
