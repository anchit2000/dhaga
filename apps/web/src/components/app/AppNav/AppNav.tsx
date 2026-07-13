"use client";

import Link from "next/link";
import { GlassSurface } from "@/components/ui/glass-surface";
import { ModeToggle } from "@/components/brand/ModeToggle";
import { ThreadMark } from "@/components/brand/ThreadMark";
import { SearchPalette } from "@/components/app/search/SearchPalette";
import type { SearchWeights } from "@/utils/constants/search";
import { MoreMenu } from "./MoreMenu";
import { NavLinks } from "./NavLinks";
import { ProfileMenu } from "./ProfileMenu";

/** App-shell header: brand, section nav, centered search, more/profile menus. */
export function AppNav({
  isAdmin,
  initialSearchWeights,
}: {
  isAdmin: boolean;
  initialSearchWeights: SearchWeights;
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
              dhaga
            </Link>
            <NavLinks />
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1">
            <div className="pointer-events-none flex items-center justify-center sm:absolute sm:inset-0">
              <div className="pointer-events-auto w-9 sm:w-full sm:max-w-xl">
                <SearchPalette initialWeights={initialSearchWeights} />
              </div>
            </div>
            <ModeToggle />
            <MoreMenu />
            <ProfileMenu isAdmin={isAdmin} />
          </div>
        </div>
      </GlassSurface>
    </header>
  );
}
