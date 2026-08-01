"use client";

import { usePathname, useRouter } from "next/navigation";
import { START_TOUR_EVENT, TOUR_QUERY_PARAM } from "@/utils/constants/onboarding";

/**
 * Home already has the tour mounted (fire the event); elsewhere, deep-link
 * so Home mounts and picks up ?tour=1. Shared by MoreMenu and MobileMenu.
 */
export function useStartTour(): () => void {
  const pathname = usePathname();
  const router = useRouter();

  return function startTour(): void {
    if (pathname === "/app") window.dispatchEvent(new Event(START_TOUR_EVENT));
    else router.push(`/app?${TOUR_QUERY_PARAM}=1`);
  };
}
