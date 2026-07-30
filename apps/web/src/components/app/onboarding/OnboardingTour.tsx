"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { driver, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import { markOnboardingTourSeenAction } from "@/lib/actions/settings";
import {
  HOME_TOUR_STEPS,
  SETTINGS_TOUR_PATH,
  START_TOUR_EVENT,
  TOUR_QUERY_PARAM,
  TOUR_RESUME_KEY,
  TOUR_RESUME_SETTINGS,
} from "@/utils/constants/onboarding";
import { startSettingsTourLeg } from "./settings-leg";
import "./onboarding-tour.css";

/** driver.js chrome shared by both legs of the tour (Home + settings). */
const BASE_CONFIG = {
  showProgress: true,
  smoothScroll: true,
  overlayOpacity: 0.6,
  stagePadding: 6,
  stageRadius: 12,
  disableActiveInteraction: true,
  popoverClass: "dhaga-tour",
  nextBtnText: "Next",
  prevBtnText: "Back",
} as const;

/**
 * First-run product walkthrough (driver.js), mounted on BOTH Home and the
 * settings page so the tour can span pages. On Home it auto-starts once
 * (`autoStart`), replays via START_TOUR_EVENT / `/app?tour=1`, and its finale
 * navigates to the settings page — where this same component (resume mode) hands
 * the tour to `startSettingsTourLeg` for its notification + import steps. Marks
 * the tour seen only on a real finish/skip/ESC, never on the hand-off nav.
 * Renders nothing.
 */
export function OnboardingTour({ autoStart }: { autoStart: boolean }): null {
  const driverRef = useRef<Driver | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // RESUME MODE — settings page: continue onto the settings leg if handed off.
    if (pathname.startsWith("/app/settings")) {
      if (sessionStorage.getItem(TOUR_RESUME_KEY) !== TOUR_RESUME_SETTINGS) {
        return;
      }
      sessionStorage.removeItem(TOUR_RESUME_KEY);
      return startSettingsTourLeg({
        baseConfig: BASE_CONFIG,
        onFinished: () => {
          void markOnboardingTourSeenAction();
        },
      });
    }

    // HOME MODE — /app: original first-run behavior, but its last step hands off
    // to the settings leg (notification preferences, then import).
    const start = (): void => {
      if (driverRef.current?.isActive()) return;
      let marked = false;
      let navigating = false;
      const instance = driver({
        ...BASE_CONFIG,
        steps: HOME_TOUR_STEPS,
        // Last Home step reads "Next" — it hands off to the settings page.
        doneBtnText: "Next",
        onNextClick: (_el, _step, { driver }) => {
          if (driver.isLastStep()) {
            navigating = true;
            try {
              sessionStorage.setItem(TOUR_RESUME_KEY, TOUR_RESUME_SETTINGS);
            } catch {}
            driver.destroy();
            router.push(SETTINGS_TOUR_PATH);
          } else {
            driver.moveNext();
          }
        },
        onDestroyed: () => {
          // Finish/skip/ESC only — the `navigating` guard skips the hand-off nav.
          if (marked || navigating) return;
          marked = true;
          void markOnboardingTourSeenAction();
        },
      });
      driverRef.current = instance;
      instance.drive();
    };

    // Deep-link (`/app?tour=1`): start, then strip the param so refresh won't replay.
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
  }, [autoStart, pathname, router]);

  return null;
}
