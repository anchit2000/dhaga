"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Compass, Ellipsis } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { APP_MORE_LINKS } from "@/utils/constants/app";
import { START_TOUR_EVENT, TOUR_QUERY_PARAM } from "@/utils/constants/onboarding";
import { isNavLinkActive } from "./link-state";

/** Secondary nav destinations (People, Events, Quick add) — kept out of ProfileMenu, which is account-only. */
export function MoreMenu() {
  const pathname = usePathname();
  const router = useRouter();
  const active = APP_MORE_LINKS.some((link) => isNavLinkActive(link.href, pathname));

  // Home already has the tour mounted (fire the event); elsewhere, deep-link
  // so Home mounts and picks up ?tour=1.
  function startTour(): void {
    if (pathname === "/app") window.dispatchEvent(new Event(START_TOUR_EVENT));
    else router.push(`/app?${TOUR_QUERY_PARAM}=1`);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            data-tour="more"
            className={cn("rounded-full", active ? "text-ember" : "text-fog hover:text-paper")}
          />
        }
      >
        <Ellipsis className="size-5" />
        <span className="sr-only">More</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {APP_MORE_LINKS.map((link, index) => {
          const Icon = link.icon;
          // Divide in-app pages from destinations outside the /app tree (Blog, Docs).
          const startsExternalGroup =
            !link.href.startsWith("/app") &&
            (index === 0 || APP_MORE_LINKS[index - 1].href.startsWith("/app"));
          return (
            <Fragment key={link.href}>
              {startsExternalGroup ? <DropdownMenuSeparator /> : null}
              <DropdownMenuItem render={<Link href={link.href} />}>
                <Icon className="size-4" />
                {link.label}
              </DropdownMenuItem>
            </Fragment>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={startTour}>
          <Compass className="size-4" />
          Take the tour
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
