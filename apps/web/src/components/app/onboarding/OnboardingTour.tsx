"use client";

import { useEffect, useRef } from "react";
import { driver, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import { markOnboardingTourSeenAction } from "@/lib/actions/settings";
import {
  START_TOUR_EVENT,
  TOUR_QUERY_PARAM,
  TOUR_STEPS,
} from "@/utils/constants/onboarding";
import "./onboarding-tour.css";

/**
 * First-run product walkthrough (driver.js). Auto-starts once for any user
 * who hasn't seen it (`autoStart`), and replays on demand: the "Take the tour"
 * menu item either fires START_TOUR_EVENT (already on Home) or deep-links to
 * `/app?tour=1` (Home has to mount first). Marks the tour seen on any exit —
 * finish, skip, or ESC — so it never nags twice. Renders nothing.
 */
export function OnboardingTour({ autoStart }: { autoStart: boolean }): null {
  const driverRef = useRef<Driver | null>(null);

  useEffect(() => {
    const start = (): void => {
      if (driverRef.current?.isActive()) return;
      let marked = false;
      const instance = driver({
        steps: TOUR_STEPS,
        showProgress: true,
        smoothScroll: true,
        overlayOpacity: 0.6,
        stagePadding: 6,
        stageRadius: 12,
        disableActiveInteraction: true,
        popoverClass: "dhaga-tour",
        nextBtnText: "Next",
        prevBtnText: "Back",
        doneBtnText: "Done",
        onDestroyed: () => {
          // Fires on finish, skip (X), and ESC — the one place we record it.
          if (marked) return;
          marked = true;
          void markOnboardingTourSeenAction();
        },
      });
      driverRef.current = instance;
      instance.drive();
    };

    // Deep-link (`/app?tour=1`): start, then strip the param so a plain
    // refresh doesn't replay the tour.
    const deepLinked =
      new URLSearchParams(window.location.search).get(TOUR_QUERY_PARAM) === "1";
    if (deepLinked) {
      window.history.replaceState({}, "", window.location.pathname);
    }

    window.addEventListener(START_TOUR_EVENT, start);
    if (autoStart || deepLinked) start();

    return () => {
      window.removeEventListener(START_TOUR_EVENT, start);
      driverRef.current?.destroy();
      driverRef.current = null;
    };
  }, [autoStart]);

  return null;
}
